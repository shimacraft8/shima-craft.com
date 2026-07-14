import { Shippori_Mincho, Zen_Kaku_Gothic_New } from "next/font/google";

const mSerif = Shippori_Mincho({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--m-serif",
  display: "swap",
  preload: false,
});

const mSans = Zen_Kaku_Gothic_New({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--m-sans",
  display: "swap",
  preload: false,
});

export default function MonitorLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${mSerif.variable} ${mSans.variable}`}>{children}</div>;
}
