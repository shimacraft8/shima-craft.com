import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "奄美市住用木工工芸センター（木工センター）",
  description:
    "奄美市住用の木工センターでは、地元特産のリュウキュウマツを使った木工芸品の製作・体験ができます。施設利用410円〜、一般コース3,000円〜、本格コース15,000円〜。初心者から本格派まで丁寧に指導します。",
  keywords: [
    "奄美市",
    "住用",
    "木工",
    "木工芸品",
    "リュウキュウマツ",
    "体験",
    "木工センター",
    "みどりの里",
    "鹿児島",
  ],
  openGraph: {
    title: "奄美市住用木工工芸センター（木工センター）",
    description:
      "リュウキュウマツの美しい木目で、あなただけの木工芸品を。奄美市住用の木工センターで体験しませんか？",
    locale: "ja_JP",
    type: "website",
  },
  robots: { index: false, follow: false },
};

export default function MokkoCenterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
