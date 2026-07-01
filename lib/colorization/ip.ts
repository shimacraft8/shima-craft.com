import type { NextRequest } from "next/server";

/** レート制限・Turnstile検証用にクライアントIPを取り出す。生IPはハッシュ化前提でのみ利用する。 */
export function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}
