import type { Metadata } from "next";
import { HeaderInner } from "@/app/components/HeaderInner";
import { Footer } from "@/app/components/Footer";
import { Breadcrumb } from "@/app/components/Breadcrumb";
import { WebCheckClient } from "./WebCheckClient";

const PAGE_TITLE = "Web導線かんたんチェック｜SHIMA CRAFT";
const PAGE_DESC =
  "ホームページ、Instagram、Googleマップ、予約・問い合わせの状況を8つの質問で整理し、優先して見直したい項目を確認できます。約1分、結果を見るだけでも利用できます。";

export const metadata: Metadata = {
  title: "Web導線かんたんチェック",
  description: PAGE_DESC,
  alternates: { canonical: "/web-check" },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESC,
    url: "/web-check",
    type: "website",
    locale: "ja_JP",
    siteName: "SHIMA CRAFT",
    images: [
      {
        url: "/hero.jpg",
        width: 1200,
        height: 630,
        alt: "奄美大島の空撮写真 — SHIMA CRAFT",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_TITLE,
    description: PAGE_DESC,
    images: ["/hero.jpg"],
  },
};

export default function WebCheckPage() {
  return (
    <>
      <HeaderInner />
      <main>
        <Breadcrumb
          items={[
            { label: "トップ", href: "/" },
            { label: "Web導線かんたんチェック" },
          ]}
        />

        <div className="inner-hero">
          <p className="inner-hero-area">約1分・8問</p>
          <h1>Web導線かんたんチェック</h1>
          <p className="inner-hero-lead">
            ホームページ、Instagram、Googleマップ、予約・問い合わせの状況を8つの質問で整理し、優先して見直したい項目を確認できます。
          </p>
          <p className="wc-hero-sub">
            結果を見るだけでもご利用いただけます。相談やメールアドレスの入力は任意です。
          </p>
        </div>

        <section className="wc-section">
          <div className="container wc-container">
            <WebCheckClient />
          </div>
        </section>

        <div className="related-section">
          <p className="related-section-label">Related</p>
          <div className="related-links">
            <a href="/service/web-design" className="related-link">
              ホームページ制作・リニューアル
            </a>
            <a href="/services" className="related-link">
              サービス一覧
            </a>
            <a href="/" className="related-link">
              SHIMA CRAFT トップへ
            </a>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
