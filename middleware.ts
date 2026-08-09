import { NextResponse, type NextRequest } from "next/server";

const APEX_HOST = "shima-craft.com";
const WWW_HOST = "www.shima-craft.com";

export function middleware(request: NextRequest) {
  // www → apex の恒久リダイレクト（正規URLはhttps://shima-craft.com）。
  // 実Cloudflare本番・Vercelどちらもwwwをこの同じWorker/appへ直結しているため、
  // ここでリダイレクトしない限りwwwとapexが別々のURLとして両方200を返してしまう。
  if (request.nextUrl.hostname === WWW_HOST) {
    const url = request.nextUrl.clone();
    url.hostname = APEX_HOST;
    return NextResponse.redirect(url, 308);
  }

  const response = NextResponse.next();
  // CF_ENV="preview" は wrangler.jsonc のトップレベル vars（本番=env.production以外）でのみ
  // 設定される値。ローカルwrangler devと*.workers.devでの検証デプロイの両方でnoindexにし、
  // 検索エンジンに拾われないようにする。実Cloudflare本番・VercelではこのCF_ENV値にならないため付与しない。
  if (process.env.CF_ENV === "preview") {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return response;
}

export const config = {
  matcher: ["/:path*"],
};
