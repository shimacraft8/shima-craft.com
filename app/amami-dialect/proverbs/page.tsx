import type { Metadata } from "next";
import Link from "next/link";
import { HeaderInner } from "@/app/components/HeaderInner";
import { Footer } from "@/app/components/Footer";
import { StickyContact } from "@/app/components/StickyContact";
import { Breadcrumb } from "@/app/components/Breadcrumb";
import { DialectListClient } from "@/app/amami-dialect/_components/DialectListClient";
import {
  AMAMI_DIALECT_PATH,
  amamiProverbs,
  proverbSourcePages,
  toProverbListItem,
} from "@/app/lib/amamiDialect";

const PAGE_DESC =
  "石崎公曹の奄美のことわざをもとにした、奄美方言ことわざの公開用一覧です。";

export const metadata: Metadata = {
  title: "奄美方言ことわざ一覧",
  description: PAGE_DESC,
  alternates: { canonical: `${AMAMI_DIALECT_PATH}/proverbs` },
  openGraph: {
    title: "奄美方言ことわざ一覧｜SHIMA CRAFT",
    description: PAGE_DESC,
    url: `${AMAMI_DIALECT_PATH}/proverbs`,
    type: "website",
    locale: "ja_JP",
    siteName: "SHIMA CRAFT",
    images: [{ url: "/hero.jpg", width: 1200, height: 630, alt: "奄美大島の空撮写真 — SHIMA CRAFT" }],
  },
};

export default function ProverbsPage() {
  return (
    <>
      <HeaderInner />
      <main>
        <Breadcrumb
          items={[
            { label: "トップ", href: "/" },
            { label: "奄美方言辞書", href: AMAMI_DIALECT_PATH },
            { label: "ことわざ" },
          ]}
        />

        <div className="inner-hero dialect-hero">
          <p className="inner-hero-area">PROVERBS</p>
          <h1>奄美方言ことわざ一覧</h1>
          <p className="inner-hero-lead">
            公開用データとして整理した{amamiProverbs.length}件を掲載しています。現代使用や地域差は、確認できた範囲を超えて断定しません。
          </p>
        </div>

        <section className="svc-section">
          <div className="container">
            <DialectListClient
              items={amamiProverbs.map(toProverbListItem)}
              filterLabel="掲載ページ"
              searchLabel="ことわざ検索"
              filterOptions={proverbSourcePages.map((page) => ({
                label: page,
                value: page,
              }))}
            />
          </div>
        </section>

        <div className="related-section">
          <p className="related-section-label">Navigation</p>
          <div className="related-links">
            <Link href={`${AMAMI_DIALECT_PATH}/greetings`} className="related-link">
              あいさつ一覧
            </Link>
            <Link href={`${AMAMI_DIALECT_PATH}/about`} className="related-link">
              掲載方針
            </Link>
          </div>
        </div>
      </main>
      <Footer />
      <StickyContact />
    </>
  );
}

