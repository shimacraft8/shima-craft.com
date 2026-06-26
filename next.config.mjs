/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      // 木工センター LP — 非公開中（公開時はこの行を削除）
      { source: "/mokko-center", destination: "/", permanent: false },
      // 赤ちゃんハイハイレース LP — 非公開中（公開時はこの行を削除）
      { source: "/akachan-race", destination: "/", permanent: false },
    ];
  },
};

export default nextConfig;
