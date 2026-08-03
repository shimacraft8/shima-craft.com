import { NextResponse, type NextRequest } from "next/server";

export function middleware(_request: NextRequest) {
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
