import { fileURLToPath } from "node:url";
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: fileURLToPath(new URL(".", import.meta.url)),
  webpack(config, { dev }) { if (!dev && process.env.CI) config.cache = false; return config; },
  skipTrailingSlashRedirect: true,
  experimental: { cpus: 1, webpackBuildWorker: false, webpackMemoryOptimizations: true },
  async headers() { return [{ source: "/:path*", headers: [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  ] }]; },
  images: {
    dangerouslyAllowSVG: false,
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
