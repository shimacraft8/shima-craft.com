/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  skipTrailingSlashRedirect: true,
  async redirects() {
    return [
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
