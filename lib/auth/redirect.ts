/**
 * ログイン後のリダイレクト先 `next` パラメータの安全化。
 * オープンリダイレクト防止のため、同一サイト内の相対パスのみ許可する。
 */

const DEFAULT_NEXT = "/tools/photo-colorize";

export function sanitizeNextPath(raw: string | null | undefined): string {
  if (!raw) return DEFAULT_NEXT;
  // 先頭が「/」1つで始まる相対パスのみ許可（「//host」「/\host」「http://」等は拒否）
  if (!raw.startsWith("/")) return DEFAULT_NEXT;
  if (raw.startsWith("//") || raw.startsWith("/\\")) return DEFAULT_NEXT;
  if (raw.includes("://") || raw.includes("\\")) return DEFAULT_NEXT;
  // 制御文字（ヘッダ分割・改行注入）を拒否
  if (/[\x00-\x1f\x7f]/.test(raw)) return DEFAULT_NEXT;
  return raw;
}
