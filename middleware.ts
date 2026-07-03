import { NextResponse, type NextRequest } from "next/server";

/**
 * /admin 配下の補助的ガード（第一層）。
 *
 * Edge runtimeではFirebase Admin SDKを使えないため、ここでは
 * 「Session Cookieが存在するか」だけを見て未ログインをログインへ誘導する。
 * 本当の認証・認可（Session Cookieの検証・失効確認・admin判定）は
 * Node.js runtimeのServer Component / Server Action / Route Handler側で
 * verifySessionCookie(..., true) と Firestore member docにより行う。
 * Cookieの中身（role等）はここでは一切信用しない。
 */
const SESSION_COOKIE_NAME = process.env.FIREBASE_SESSION_COOKIE_NAME || "sc_session";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value);

  if (pathname.startsWith("/admin") && !hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
