import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/app/components/Breadcrumb";
import { Footer } from "@/app/components/Footer";
import { HeaderInner } from "@/app/components/HeaderInner";
import { PrivacyPolicyContent } from "@/app/components/PrivacyPolicy";

const PAGE_TITLE = "プライバシーポリシー｜SHIMA CRAFT";
const PAGE_DESC =
  "SHIMA CRAFTにおける個人情報、Web導線チェックの回答内容、アクセス解析情報などの取扱いについてご案内します。";

export const metadata: Metadata = {
  title: "プライバシーポリシー",
  description: PAGE_DESC,
  alternates: {
    canonical: "/privacy",
  },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESC,
    url: "/privacy",
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

export default function PrivacyPage() {
  return (
    <>
      <HeaderInner />
      <main>
        <Breadcrumb
          items={[
            { label: "トップ", href: "/" },
            { label: "プライバシーポリシー" },
          ]}
        />

        <section className="privacy-page">
          <div className="privacy-container">
            <p className="inner-hero-area">Privacy Policy</p>
            <h1>プライバシーポリシー</h1>
            <PrivacyPolicyContent />
            <div className="privacy-actions">
              <Link href="/" className="btn btn-soft">
                トップページへ戻る
              </Link>
            </div>
          </div>
        </section>

        <div className="related-section">
          <p className="related-section-label">Related</p>
          <div className="related-links">
            <Link href="/tools/photo-colorize" className="related-link">
              白黒写真を無料でカラー化
            </Link>
            <Link href="/services" className="related-link">
              サービス一覧
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
