import type { Metadata } from "next";
import "./page.css";

export const metadata: Metadata = {
  title: "赤ちゃんハイハイレース | 奄美体験交流館",
  description:
    "2026年6月21日（日）奄美体験交流館で開催！ハイハイが出来る未歩行の赤ちゃんのかわいいレース。参加料¥1,500・定員25組。主催：NPO法人健康ど宝",
  openGraph: {
    title: "赤ちゃんハイハイレース | 奄美体験交流館",
    description:
      "2026年6月21日（日）10:00〜12:00 開催。参加料¥1,500・定員25組。うれしい景品もあるよ！",
    locale: "ja_JP",
    type: "website",
  },
  robots: { index: false, follow: false },
};

export default function AkachanRaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
