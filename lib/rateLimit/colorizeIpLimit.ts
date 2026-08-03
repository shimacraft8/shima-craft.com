import "server-only";
// 型のみの副作用import: @opennextjs/cloudflareが `declare global { interface CloudflareEnv }`
// でKVNamespace等のバインディング型をグローバルに拡張しているので、それを取り込む
// （@cloudflare/workers-typesは直接の依存関係ではないため、経由して型を得る）。
import type {} from "@opennextjs/cloudflare";
import { ipHashFromHeaders } from "@/lib/http/ipHash";
import { FREE_DAILY_LIMIT, secondsUntilNextJstMidnight } from "@/lib/colorization/freeGate";

type RateLimitKv = NonNullable<CloudflareEnv["NEXT_INC_CACHE_KV"]>;

/**
 * 匿名カラー化の日次利用回数を、Cookieとは独立してIPハッシュ単位でも数える補助制限。
 * Cookie削除だけで無制限にならないようにするための2層目のガード
 * （Cookie側はlib/colorization/freeGate.tsが担当）。
 *
 * - Cloudflare（wrangler.jsonc に CF_ENV が定義される環境）でのみ有効。Vercel等
 *   Cloudflare以外では常に「制限なし」を返す（KVバインディングが存在しないため）。
 * - RATE_LIMIT_KV バインディング未設定/取得失敗、LOG_IP_HASH_SALT未設定の場合も
 *   「制限なし」へ安全側に倒す（可用性優先。Cookie側の制限は引き続き有効なため
 *   この補助制限単体の不備でカラー化機能全体を止めない）。
 * - キーは生IPではなく、ipHashFromHeaders（LOG_IP_HASH_SALTによるソルト付きハッシュ）
 *   で作ったハッシュのみを使う（個人情報を保存しない）。
 * - JST日付+ipHashをキーにした固定ウィンドウ。TTLで自動失効（明示的な削除は不要）。
 */

function jstDateString(): string {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}

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

function keyFor(ipHash: string): string {
  return `colorize:${jstDateString()}:${ipHash}`;
}

export type ColorizeIpLimitResult = { limited: false } | { limited: true; retryAfterSeconds: number };

/** IP単位の残り回数が上限に達しているかを確認する（カウントは変更しない）。 */
export async function checkColorizeIpLimit(headers: Headers): Promise<ColorizeIpLimitResult> {
  let ipHash: string | null;
  try {
    ipHash = ipHashFromHeaders(headers);
  } catch {
    return { limited: false };
  }
  if (!ipHash) return { limited: false };

  const kv = await getRateLimitKv();
  if (!kv) return { limited: false };

  let current = 0;
  try {
    const raw = await kv.get(keyFor(ipHash));
    current = raw ? Number(raw) || 0 : 0;
  } catch {
    return { limited: false };
  }

  if (current >= FREE_DAILY_LIMIT) {
    return { limited: true, retryAfterSeconds: secondsUntilNextJstMidnight() };
  }
  return { limited: false };
}

/** IP単位のカウントを1増やす。許可して実行を進める場合にのみ呼ぶ。失敗しても実行は継続する。 */
export async function incrementColorizeIpCount(headers: Headers): Promise<void> {
  let ipHash: string | null;
  try {
    ipHash = ipHashFromHeaders(headers);
  } catch {
    return;
  }
  if (!ipHash) return;

  const kv = await getRateLimitKv();
  if (!kv) return;

  const key = keyFor(ipHash);
  try {
    const raw = await kv.get(key);
    const current = raw ? Number(raw) || 0 : 0;
    await kv.put(key, String(current + 1), { expirationTtl: 60 * 60 * 48 });
  } catch {
    // 可用性優先。カウント更新失敗はこの実行自体を妨げない。
  }
}
