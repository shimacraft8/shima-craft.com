/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  skipTrailingSlashRedirect: true,
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
