import type { Metadata, Viewport } from "next";
import { Noto_Serif_JP, Noto_Sans_JP, Outfit } from "next/font/google";
import { site } from "@/app/lib/site";
import { GoogleAnalytics } from "@/app/components/GoogleAnalytics";
import "./globals.css";
import "./system-samples.css";

/* ===== フォント（next/font/google） ===== */
// 見出し：Noto Serif JP
const notoSerifJP = Noto_Serif_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  variable: "--font-serif",
  preload: false,
});
// 本文：Noto Sans JP
const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  display: "swap",
  variable: "--font-sans",
  preload: false,
});
// 英字アクセント：Outfit
const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  variable: "--font-en",
});

/* ===== メタデータ / OGP ===== */
export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: site.title,
    template: `%s｜${site.name}`,
  },
  description: site.description,
  keywords: [
    "SHIMA CRAFT",
    "ホームページ制作",
    "HP制作",
    "空撮",
    "ドローン",
    "動画編集",
    "Web制作",
    "奄美大島",
    "鹿児島",
    "離島",
  ],
  authors: [{ name: site.name }],
  creator: site.name,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "ja_JP",
    url: site.url,
    siteName: site.name,
    title: site.title,
    description: site.description,
    images: [
      {
        url: site.ogImage,
        width: 1200,
        height: 630,
        alt: "奄美大島の空撮写真 — SHIMA CRAFT",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: site.title,
    description: site.description,
    images: [site.ogImage],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#FAF7F2",
  width: "device-width",
  initialScale: 1,
};

/* ===== 構造化データ（JSON-LD / ProfessionalService） ===== */
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  name: site.name,
  description: site.description,
  url: site.url,
  image: `${site.url}${site.ogImage}`,
  email: site.email,
  areaServed: {
    "@type": "Place",
    name: site.areaServed,
  },
  address: {
    "@type": "PostalAddress",
    addressRegion: "鹿児島県",
    addressCountry: "JP",
  },
  priceRange: "¥¥",
  knowsLanguage: "ja",
  makesOffer: [
    {
      "@type": "Offer",
      itemOffered: { "@type": "Service", name: "HP制作" },
      priceCurrency: "JPY",
      price: "150000",
    },
    {
      "@type": "Offer",
      itemOffered: { "@type": "Service", name: "HP保守・運用（年間契約）" },
      priceCurrency: "JPY",
      price: "0",
    },
    {
      "@type": "Offer",
      itemOffered: { "@type": "Service", name: "空撮・映像制作" },
      priceCurrency: "JPY",
      price: "30000",
    },
    {
      "@type": "Offer",
      itemOffered: { "@type": "Service", name: "動画編集" },
      priceCurrency: "JPY",
      price: "3000",
    },
    {
      "@type": "Offer",
      itemOffered: { "@type": "Service", name: "ネット集客サポート" },
      priceCurrency: "JPY",
      price: "30000",
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="ja"
      className={`${notoSerifJP.variable} ${notoSansJP.variable} ${outfit.variable}`}
    >
      <body>
        {/* イントロのFOUC（ちらつき）防止のため、ロゴを先読み */}
        <link rel="preload" as="image" href="/logo.png" />
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
        <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
      </body>
    </html>
  );
}
