import { NextResponse, type NextRequest } from "next/server";

const APEX_HOST = "shima-craft.com";
const WWW_HOST = "www.shima-craft.com";

export function middleware(request: NextRequest) {
  // http→https と www→apex の恒久リダイレクト（正規URLはhttps://shima-craft.com）。
  // 両方必要な場合でも1回のリダイレクトで済むよう、まとめて判定する。
  // 対象ホスト（apex/www）宛てのリクエストに限定する。ローカルwrangler dev（localhost）や
  // workers.dev確認環境はここに該当しないため、x-forwarded-protoの解釈に関わらず対象外になる。
  const hostname = request.nextUrl.hostname;
  const isOurDomain = hostname === APEX_HOST || hostname === WWW_HOST;
  const needsHttps = request.headers.get("x-forwarded-proto") === "http";
  const needsApex = hostname === WWW_HOST;
  if (isOurDomain && (needsHttps || needsApex)) {
    const url = request.nextUrl.clone();
    url.protocol = "https:";
    url.hostname = APEX_HOST;
    url.port = "";
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
