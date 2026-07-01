import type { Metadata } from "next";
import Link from "next/link";
import { HeaderInner } from "@/app/components/HeaderInner";
import { Footer } from "@/app/components/Footer";
import { StickyContact } from "@/app/components/StickyContact";
import { Breadcrumb } from "@/app/components/Breadcrumb";
import { WordExplorer } from "@/app/amami-dialect/_components/WordExplorer";
import {
  AMAMI_DIALECT_PATH,
  amamiWords,
  wordCategories,
  WORD_REGION_ORDER,
} from "@/app/lib/amamiDialect";

type Props = {
  searchParams: Record<string, string | string[] | undefined>;
};

const PAGE_DESC =
  "県公式資料「大島地区方言マップ」に基づく、家族・道具・自然・生き物・食事・あいさつの語彙一覧です。地域（奄美大島・喜界島・徳之島・沖永良部島・与論島）ごとの記録形を掲載しています。";

export const metadata: Metadata = {
  title: "奄美方言 語彙一覧",
  description: PAGE_DESC,
  alternates: { canonical: `${AMAMI_DIALECT_PATH}/words` },
  openGraph: {
    title: "奄美方言 語彙一覧｜SHIMA CRAFT",
    description: PAGE_DESC,
    url: `${AMAMI_DIALECT_PATH}/words`,
    type: "website",
    locale: "ja_JP",
    siteName: "SHIMA CRAFT",
    images: [{ url: "/hero.jpg", width: 1200, height: 630, alt: "奄美大島の空撮写真 — SHIMA CRAFT" }],
  },
};

export default function WordsPage({ searchParams }: Props) {
  return (
    <>
      <HeaderInner />
      <main>
        <Breadcrumb
          items={[
            { label: "トップ", href: "/" },
            { label: "奄美方言辞書", href: AMAMI_DIALECT_PATH },
            { label: "語彙" },
          ]}
        />

        <div className="inner-hero dialect-hero">
          <p className="inner-hero-area">WORDS</p>
          <h1>奄美方言 語彙一覧</h1>
          <p className="inner-hero-lead">
            県公式資料「大島地区方言マップ」に基づく{amamiWords.length}語を掲載しています。
            同じ概念でも地域（奄美大島・喜界島・徳之島・沖永良部島・与論島）によって記録形が異なるため、地域ごとにそのまま並べています。
          </p>
        </div>

        <section className="svc-section">
          <div className="container">
            <WordExplorer
              items={amamiWords}
              categories={wordCategories}
              regions={WORD_REGION_ORDER}
              searchParams={searchParams}
            />
          </div>
        </section>

        <div className="dialect-back-actions">
          <Link href={AMAMI_DIALECT_PATH} className="btn btn-soft">
            辞書トップへ戻る
          </Link>
        </div>

        <div className="related-section">
          <p className="related-section-label">Navigation</p>
          <div className="related-links">
            <Link href={`${AMAMI_DIALECT_PATH}/proverbs`} className="related-link">
              ことわざ一覧
            </Link>
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
