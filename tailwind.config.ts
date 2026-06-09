import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#E8735A", // 珊瑚（コーラル）
        secondary: "#2A9D8F", // 海（ターコイズ）
        bg: "#FAF7F2", // 砂（オフホワイト）
        text: "#1A1A1A",
        accent: "#F4A261", // 夕陽（サンセット）
        card: "#ffffff",
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Hiragino Mincho ProN", "Yu Mincho", "serif"],
        sans: [
          "var(--font-sans)",
          "Hiragino Sans",
          "Hiragino Kaku Gothic ProN",
          "Meiryo",
          "sans-serif",
        ],
        en: ["var(--font-en)", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
