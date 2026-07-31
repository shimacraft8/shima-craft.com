const isCloudflareBuild = process.env.NEXT_BUILD_TARGET === "cloudflare";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  skipTrailingSlashRedirect: true,
  // firebase-admin -> jwks-rsa -> jose has a "workerd"-specific export that OpenNext's
  // bundler fails to trace/copy correctly. Official fix: keep it external so the real
  // package (with its workerd export) is resolved by the Workers runtime instead of
  // esbuild's static bundle. https://opennext.js.org/cloudflare/howtos/workerd
  ...(isCloudflareBuild ? { serverExternalPackages: ["jose"] } : {}),
  images: {
    // Cloudflare Workers has no built-in equivalent to Vercel's image optimizer;
    // the OpenNext "images" binding requires a paid Cloudflare Images plan, so
    // we serve original files unoptimized there instead of adding a paid dependency.
    // Vercel builds keep the optimizer (remotePatterns) unchanged.
    ...(isCloudflareBuild ? { unoptimized: true } : {}),
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.microcms-assets.io",
      },
    ],
  },
  async redirects() {
    return [
      // TEMP: Amami Road Quest is hidden until development is complete.
      {
        source: "/amami-road-quest",
        destination: "/",
        permanent: false,
      },
      {
        source: "/amami-road-quest/:path*",
        destination: "/",
        permanent: false,
      },
      // 赤ちゃんハイハイレース LP — 非公開中（公開時はこの行を削除）
      { source: "/akachan-race", destination: "/", permanent: false },
    ];
  },
  async rewrites() {
    return [
      { source: "/amami-road-quest/play", destination: "/amami-road-quest/play/index.html" },
      { source: "/amami-road-quest/play/", destination: "/amami-road-quest/play/index.html" },
    ];
  },
};

export default nextConfig;
