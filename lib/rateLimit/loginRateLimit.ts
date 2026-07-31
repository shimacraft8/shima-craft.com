import "server-only";
// 型のみの副作用import: @opennextjs/cloudflareが `declare global { interface CloudflareEnv }`
// でKVNamespace等のバインディング型をグローバルに拡張しているので、それを取り込む
// （@cloudflare/workers-typesは直接の依存関係ではないため、経由して型を得る）。
import type {} from "@opennextjs/cloudflare";
import { ipHashFromHeaders } from "@/lib/members/tokens";

type RateLimitKv = NonNullable<CloudflareEnv["NEXT_INC_CACHE_KV"]>;

/**
 * ログイン試行のレート制限（Cloudflare Workers KV、Free枠内）。
 *
 * - Cloudflare（wrangler.jsonc に CF_ENV が定義される環境）でのみ有効。Vercel等
 *   Cloudflare以外では常に「制限なし」を返す（KVバインディングが存在しないため）。
 * - RATE_LIMIT_KV バインディングが未設定/取得失敗の場合も「制限なし」へ安全側に倒す
 *   （namespace未作成の現状でもアプリを壊さない。作成手順はwrangler.jsonc参照）。
 * - キーは生IPではなく、既存のipHashFromHeaders（lib/members/tokens.ts、
 *   LOG_IP_HASH_SALTによるソルト付きハッシュ）で作ったハッシュのみを使う（個人情報を保存しない）。
 *   ipHashFromHeaders/hashIpはLOG_IP_HASH_SALT等の秘密が未設定だと例外を投げる実装だが、
 *   レート制限はあくまで補助機能であり、その設定不備でログイン自体を壊してはならないため
 *   ここで必ずcatchし、失敗時は「制限なし」として扱う。
 * - 固定ウィンドウ方式（KVのexpirationTtlで自動失効、明示的な削除は不要）。
 */

const WINDOW_SECONDS = 5 * 60;
const MAX_ATTEMPTS_PER_WINDOW = 10;

export type LoginRateLimitResult = { limited: false } | { limited: true; retryAfterSeconds: number };

async function getRateLimitKv(): Promise<RateLimitKv | null> {
  if (!process.env.CF_ENV) return null;
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = await getCloudflareContext({ async: true });
    const kv = (env as { RATE_LIMIT_KV?: RateLimitKv }).RATE_LIMIT_KV;
    return kv ?? null;
  } catch {
    return null;
  }
}

/**
 * リクエストヘッダーからログイン試行を1回分カウントし、上限超過なら429にすべきかを返す。
 * IPが特定できない場合・ハッシュ化に失敗した場合は誤ブロックを避けるため常に許可する。
 */
export async function checkLoginRateLimit(headers: Headers): Promise<LoginRateLimitResult> {
  let ipHash: string | null;
  try {
    ipHash = ipHashFromHeaders(headers);
  } catch {
    return { limited: false };
  }
  if (!ipHash) return { limited: false };

  const kv = await getRateLimitKv();
  if (!kv) return { limited: false };

  const nowSeconds = Math.floor(Date.now() / 1000);
  const windowIndex = Math.floor(nowSeconds / WINDOW_SECONDS);
  const key = `login:${ipHash}:${windowIndex}`;

  let current = 0;
  try {
    const raw = await kv.get(key);
    current = raw ? Number(raw) || 0 : 0;
  } catch {
    return { limited: false };
  }

  if (current >= MAX_ATTEMPTS_PER_WINDOW) {
    const windowEndsAt = (windowIndex + 1) * WINDOW_SECONDS;
    return { limited: true, retryAfterSeconds: Math.max(1, windowEndsAt - nowSeconds) };
  }

  try {
    await kv.put(key, String(current + 1), { expirationTtl: WINDOW_SECONDS * 2 });
  } catch {
    // カウント更新に失敗しても、今回のリクエスト自体は許可する（可用性優先）。
  }
  return { limited: false };
}
