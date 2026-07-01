import type { Metadata } from "next";
import Link from "next/link";
import { HeaderInner } from "@/app/components/HeaderInner";
import { Footer } from "@/app/components/Footer";
import { StickyContact } from "@/app/components/StickyContact";
import { Breadcrumb } from "@/app/components/Breadcrumb";
import { AMAMI_DIALECT_PATH } from "@/app/lib/amamiDialect";

const PAGE_DESC =
  "SHIMA CRAFTの奄美方言辞書における掲載方針、出典の扱い、未確認情報の表示方針をまとめています。";

export const metadata: Metadata = {
  title: "奄美方言辞書の掲載方針",
  description: PAGE_DESC,
  alternates: { canonical: `${AMAMI_DIALECT_PATH}/about` },
  openGraph: {
    title: "奄美方言辞書の掲載方針｜SHIMA CRAFT",
    description: PAGE_DESC,
    url: `${AMAMI_DIALECT_PATH}/about`,
    type: "website",
    locale: "ja_JP",
    siteName: "SHIMA CRAFT",
    images: [{ url: "/hero.jpg", width: 1200, height: 630, alt: "奄美大島の空撮写真 — SHIMA CRAFT" }],
  },
};

export default function AmamiDialectAboutPage() {
  return (
    <>
      <HeaderInner />
      <main>
        <Breadcrumb
          items={[
            { label: "トップ", href: "/" },
            { label: "奄美方言辞書", href: AMAMI_DIALECT_PATH },
            { label: "掲載方針" },
          ]}
        />

        <div className="inner-hero dialect-hero">
          <p className="inner-hero-area">ABOUT</p>
          <h1>奄美方言辞書の掲載方針</h1>
          <p className="inner-hero-lead">
            原資料で確認できた内容を中心に掲載し、確認できていない現代使用・地域差・世代差は断定しません。
          </p>
        </div>

        <section className="svc-section">
          <div className="svc-inner dialect-policy">
            <h2 className="svc-title">公開データ</h2>
            <p>
              SHIMA CRAFTには、公開用JSONである
              <code>amami-proverbs.json</code> と
              <code>amami-greetings.json</code> のみを配置しています。
              研究用JSONは一般公開ページへ同期していません。
            </p>

            <h2 className="svc-title">表示方針</h2>
            <ul className="svc-list">
              <li>一般向けページではカタカナ読みを中心に表示します。</li>
              <li>専門的な音声・音韻表記は表示対象から外します。</li>
              <li>出典にない意味や用例は追加しません。</li>
              <li>地域差、世代差、現在の日常会話での使用状況は、未確認のまま断定しません。</li>
            </ul>

            <h2 className="svc-title">出典</h2>
            <p>
              ことわざは主に「石崎公曹の奄美のことわざ」に基づく公開用データを使用しています。
              出典情報は各詳細ページの「出典情報」にまとめています。
            </p>
          </div>
        </section>

        <div className="related-section">
          <p className="related-section-label">Navigation</p>
          <div className="related-links">
            <Link href={`${AMAMI_DIALECT_PATH}/proverbs`} className="related-link">
              ことわざ一覧
            </Link>
            <Link href={`${AMAMI_DIALECT_PATH}/greetings`} className="related-link">
              あいさつ一覧
            </Link>
          </div>
        </div>
      </main>
      <Footer />
      <StickyContact />
    </>
  );
}

