import "server-only";
import { createHash } from "crypto";

/**
 * IPアドレスのソルト付きハッシュ化。生IPは保存・比較に一切使わず、常にこのハッシュのみを使う。
 * LOG_IP_HASH_SALTが未設定の場合は例外を投げる（呼び出し側でfail-open/closedを判断する）。
 */
function hashIp(ip: string): string {
  const salt = process.env.LOG_IP_HASH_SALT;
  if (!salt) throw new Error("LOG_IP_HASH_SALT is not configured");
  return createHash("sha256").update(`${salt}:ip:${ip}`).digest("hex");
}

export function ipHashFromHeaders(headers: Headers): string | null {
  const fwd = headers.get("x-forwarded-for");
  const ip = (fwd ? fwd.split(",")[0] : headers.get("x-real-ip"))?.trim();
  return ip ? hashIp(ip) : null;
}
