/**
 * Cookieの Secure 属性の判定（プラットフォーム共通）。
 *
 * `next build`（Vercelデプロイ・Cloudflareデプロイ・wrangler devのいずれも含む）は
 * ビルド時に常に NODE_ENV=production を焼き込むため、NODE_ENV単独ではローカル
 * wrangler dev（http、Secureだと届かない）と実際のCloudflare本番配信を区別できない。
 * CF_ENV（wrangler.jsonc）を併用し、ローカルwrangler dev（CF_ENV="preview"）の時だけ
 * 安全にfalseへ倒す。Vercel上ではCF_ENVは未設定のため、既存の挙動
 * （NODE_ENV===productionでtrue）は変わらない。実Cloudflare本番はCF_ENV="production"。
 */
export function isSecureCookieContext(): boolean {
  if (process.env.NODE_ENV !== "production") return false;
  if (process.env.CF_ENV === "preview") return false;
  return true;
}
