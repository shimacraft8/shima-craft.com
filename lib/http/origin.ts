import type { NextRequest } from "next/server";

/**
 * 同一オリジンからのmutatingリクエストか検証する（CSRF対策の一層）。
 * Originが無い場合はHostと照合できないため、厳格には拒否側に倒す。
 */
export function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) {
    // 一部の同一オリジンGET/フォームではOriginが省略されるが、
    // mutating APIはfetchで送るため通常Originが付く。無い場合は許可しない。
    return false;
  }
  try {
    const o = new URL(origin);
    const expected = new URL(request.url);
    return !o.username && !o.password && o.origin === expected.origin;
  } catch {
    return false;
  }
}
