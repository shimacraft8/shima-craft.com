/**
 * 無料公開モードの日次利用制限。
 * Cookie ベースの軽量な制限（ソフトリミット）。
 *
 * - 1日3回まで（JST 0時リセット）
 * - COLORIZE_REQUIRE_LOGIN=true のとき機能しない（ログイン必須モード）
 * - Cookie は HttpOnly・Secure・SameSite=Lax で管理
 */

/** JST の今日の日付文字列 (YYYY-MM-DD) */
function jstDateString(): string {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}

export const FREE_DAILY_LIMIT = 3;
export const FREE_GATE_COOKIE = "colorize_daily";

type DailyState = { date: string; count: number };

export function parseDailyCookie(value: string | undefined): DailyState | null {
  if (!value) return null;
  const m = value.match(/^(\d{4}-\d{2}-\d{2}):(\d+)$/);
  if (!m) return null;
  const count = parseInt(m[2], 10);
  if (!Number.isFinite(count)) return null;
  return { date: m[1], count };
}

export function buildDailyCookieValue(date: string, count: number): string {
  return `${date}:${count}`;
}

/**
 * 現在の利用状況から「実行を許可するか」を判定し、新しい cookie 値を返す。
 * @returns null = 上限超過, それ以外 = 新しい cookie 値と残り回数
 */
export function checkAndIncrementFreeGate(cookieValue: string | undefined): {
  allowed: true;
  newCookieValue: string;
  used: number;
  remaining: number;
} | { allowed: false; remaining: 0 } {
  const today = jstDateString();
  const current = parseDailyCookie(cookieValue);

  // 日付が変わっていたらリセット
  const count = current && current.date === today ? current.count : 0;

  if (count >= FREE_DAILY_LIMIT) {
    return { allowed: false, remaining: 0 };
  }

  const newCount = count + 1;
  return {
    allowed: true,
    newCookieValue: buildDailyCookieValue(today, newCount),
    used: newCount,
    remaining: FREE_DAILY_LIMIT - newCount,
  };
}

/** COLORIZE_REQUIRE_LOGIN=true のとき無料公開を無効にする */
export function isFreeGateEnabled(): boolean {
  return process.env.COLORIZE_REQUIRE_LOGIN !== "true";
}
