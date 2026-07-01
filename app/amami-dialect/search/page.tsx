import type { Metadata } from "next";
import Link from "next/link";
import { HeaderInner } from "@/app/components/HeaderInner";
import { Footer } from "@/app/components/Footer";
import { StickyContact } from "@/app/components/StickyContact";
import { Breadcrumb } from "@/app/components/Breadcrumb";
import { SearchExplorer } from "@/app/amami-dialect/_components/SearchExplorer";
import { AMAMI_DIALECT_PATH, dialectSearchIndex } from "@/app/lib/amamiDialect";

type Props = {
  searchParams: Record<string, string | string[] | undefined>;
};

const PAGE_DESC =
  "ことわざ・あいさつ・語彙（家族・道具・自然・生き物・食事）を横断して検索できるページです。";

export const metadata: Metadata = {
  title: "奄美方言 横断検索",
  description: PAGE_DESC,
  alternates: { canonical: `${AMAMI_DIALECT_PATH}/search` },
  openGraph: {
    title: "奄美方言 横断検索｜SHIMA CRAFT",
    description: PAGE_DESC,
    url: `${AMAMI_DIALECT_PATH}/search`,
    type: "website",
    locale: "ja_JP",
    siteName: "SHIMA CRAFT",
    images: [{ url: "/hero.jpg", width: 1200, height: 630, alt: "奄美大島の空撮写真 — SHIMA CRAFT" }],
  },
};

const DATASET_LABELS = ["ことわざ", "あいさつ", "語彙"];

export default function DialectSearchPage({ searchParams }: Props) {
  return (
    <>
      <HeaderInner />
      <main>
        <Breadcrumb
          items={[
            { label: "トップ", href: "/" },
            { label: "奄美方言辞書", href: AMAMI_DIALECT_PATH },
            { label: "横断検索" },
          ]}
        />

        <div className="inner-hero dialect-hero">
          <p className="inner-hero-area">SEARCH</p>
          <h1>奄美方言 横断検索</h1>
          <p className="inner-hero-lead">
            ことわざ・あいさつ・語彙をまとめて{dialectSearchIndex.length}件、種類を問わず検索できます。
            「喜界島 おはよう」のように、地域名と語句を空白で区切って検索することもできます。
          </p>
        </div>

        <section className="svc-section">
          <div className="container">
            <SearchExplorer
              items={dialectSearchIndex}
              datasetLabels={DATASET_LABELS}
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
            <Link href={`${AMAMI_DIALECT_PATH}/words`} className="related-link">
              語彙一覧
            </Link>
          </div>
        </div>
      </main>
      <Footer />
      <StickyContact />
    </>
  );
}
