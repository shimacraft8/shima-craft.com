import "server-only";
import { createHash, createHmac, randomUUID, timingSafeEqual } from "crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * 未会員お試し（無料3回）のサーバー側管理。
 *
 * 仕組み:
 *  - 初回アクセス時に HttpOnly Cookie（ランダムID）を発行
 *  - 「開始」時にサーバーがワンタイムチケット（HMAC署名付き）を発行
 *  - 「成功」報告時にチケットを検証し、成功回数を trial_events へ記録
 *  - 残回数は Cookie ID と IPアドレス（どちらもハッシュ化）**両方**で数え、
 *    どちらかが上限に達したら終了 → シークレットモード等でCookieを消しても
 *    IP側のカウントで制限される
 *  - 失敗・キャンセルは回数を消費しない（成功イベントのみカウント）
 *
 * 限界（報告書にも記載）:
 *  - IPと端末の両方を変えれば回避可能。完全な防止にはアカウント必須化しかなく、
 *    それが会員制本体の役割。上限は環境変数で調整可能。
 */

export const TRIAL_COOKIE_NAME = "sc_trial_id";
const TICKET_TTL_MS = 30 * 60 * 1000; // 30分（モデルDL+推論に十分）

function intFromEnv(name: string, fallback: number): number {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : fallback;
}

/** Cookieあたりの無償成功回数上限。 */
export function trialCookieLimit(): number {
  return intFromEnv("TRIAL_FREE_LIMIT", 3);
}

/** IPあたりの無償成功回数上限（NAT共有をわずかに考慮しCookie上限と同値が既定）。 */
export function trialIpLimit(): number {
  return intFromEnv("TRIAL_IP_LIMIT", 3);
}

function secret(): string {
  // 専用シークレットがあれば優先。なければService Role Keyから導出（キー自体は使わない）
  const base = process.env.TRIAL_TICKET_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!base) throw new Error("trial secret is not configured");
  return createHash("sha256").update(`shimacraft-trial:${base}`).digest("hex");
}

export function hashIdentity(value: string): string {
  return createHash("sha256").update(`${secret()}:${value}`).digest("hex");
}

/** X-Forwarded-For 等からIPを取り出しハッシュ化する（生IPは保存しない）。 */
export function ipHashFromHeaders(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  const ip = (fwd ? fwd.split(",")[0] : headers.get("x-real-ip")) ?? "unknown";
  return hashIdentity(ip.trim());
}

export type TrialTicket = {
  /** チケットID（成功イベントのidとして使い、再送・重複計上を防ぐ） */
  jti: string;
  /** Cookie IDハッシュ（発行先の同一性確認用） */
  cid: string;
  exp: number;
};

export function issueTicket(cookieHash: string): string {
  const ticket: TrialTicket = {
    jti: randomUUID(),
    cid: cookieHash,
    exp: Date.now() + TICKET_TTL_MS,
  };
  const payload = Buffer.from(JSON.stringify(ticket)).toString("base64url");
  const sig = createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyTicket(raw: string, cookieHash: string): TrialTicket | null {
  const parts = raw.split(".");
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expected = createHmac("sha256", secret()).update(payload).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const ticket = JSON.parse(Buffer.from(payload, "base64url").toString()) as TrialTicket;
    if (typeof ticket.jti !== "string" || typeof ticket.cid !== "string") return null;
    if (ticket.exp < Date.now()) return null;
    if (ticket.cid !== cookieHash) return null;
    return ticket;
  } catch {
    return null;
  }
}

export type TrialQuota = {
  used: number;
  limit: number;
  remaining: number;
  exhausted: boolean;
};

/** 成功イベント数を Cookie / IP 両方で数え、多い方を消費数として扱う。 */
export async function getTrialQuota(cookieHash: string, ipHash: string): Promise<TrialQuota> {
  const admin = createSupabaseAdminClient();
  const [byCookie, byIp] = await Promise.all([
    admin
      .from("trial_events")
      .select("id", { count: "exact", head: true })
      .eq("cookie_hash", cookieHash)
      .eq("event_type", "trial_succeeded"),
    admin
      .from("trial_events")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .eq("event_type", "trial_succeeded"),
  ]);

  const cookieUsed = byCookie.count ?? 0;
  const ipUsed = byIp.count ?? 0;
  const cookieRemaining = Math.max(0, trialCookieLimit() - cookieUsed);
  const ipRemaining = Math.max(0, trialIpLimit() - ipUsed);
  const remaining = Math.min(cookieRemaining, ipRemaining);
  const limit = trialCookieLimit();
  return {
    used: limit - Math.min(remaining, limit),
    limit,
    remaining,
    exhausted: remaining <= 0,
  };
}
