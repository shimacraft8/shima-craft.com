import Script from "next/script";

/**
 * GA4 を環境変数 NEXT_PUBLIC_GA_ID から読み込む。
 * 未設定（空文字 / undefined）の場合は何も出力しない。
 *
 * 本番判定は VERCEL_ENV（Vercel）と CF_ENV（Cloudflare Workers、wrangler.jsonc の
 * env.production.vars で設定）の両方を見る。プラットフォーム間の切替・ロールバック時に
 * どちらでも動くようにするための対応で、いずれかが "production" なら本番とみなす。
 */
export function GoogleAnalytics({ gaId }: { gaId?: string }) {
  const isProduction =
    process.env.NODE_ENV === "production" &&
    (process.env.VERCEL_ENV === "production" || process.env.CF_ENV === "production");

  if (!gaId || !isProduction) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaId}', { anonymize_ip: true });
        `}
      </Script>
    </>
  );
}
