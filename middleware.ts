import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * 認証が関係するルートのみを対象にセッションを更新する第一層のガード。
 * それ以外の既存ページ（トップ・辞書・LP等）はmatcher対象外で、静的配信のまま影響を受けない。
 *
 * 認可の最終判断はここでは行わない：
 * - /admin: ここではセッション有無のみ確認し、admin判定はサーバー側(layout/Server Action/RLS)で行う
 * - roleはCookie値では判定しない（DBの値が唯一の根拠）
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser()はSupabaseサーバーへの検証を伴う（getSessionのようなCookie値の信用はしない）
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin") && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/login",
    "/forgot-password",
    "/reset-password",
    "/auth/:path*",
    "/tools/photo-colorize",
    "/api/colorize-log",
    "/api/trial/:path*",
  ],
};
