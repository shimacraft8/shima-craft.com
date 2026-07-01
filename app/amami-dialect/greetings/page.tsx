import type { Metadata } from "next";
import Link from "next/link";
import { HeaderInner } from "@/app/components/HeaderInner";
import { Footer } from "@/app/components/Footer";
import { StickyContact } from "@/app/components/StickyContact";
import { Breadcrumb } from "@/app/components/Breadcrumb";
import { DialectListClient } from "@/app/amami-dialect/_components/DialectListClient";
import {
  AMAMI_DIALECT_PATH,
  amamiGreetings,
  greetingStatuses,
  toGreetingListItem,
} from "@/app/lib/amamiDialect";

const PAGE_DESC =
  "奄美方言のあいさつ表現を、公開用データに基づいて掲載しています。";

export const metadata: Metadata = {
  title: "奄美方言あいさつ一覧",
  description: PAGE_DESC,
  alternates: { canonical: `${AMAMI_DIALECT_PATH}/greetings` },
  openGraph: {
    title: "奄美方言あいさつ一覧｜SHIMA CRAFT",
    description: PAGE_DESC,
    url: `${AMAMI_DIALECT_PATH}/greetings`,
    type: "website",
    locale: "ja_JP",
    siteName: "SHIMA CRAFT",
    images: [{ url: "/hero.jpg", width: 1200, height: 630, alt: "奄美大島の空撮写真 — SHIMA CRAFT" }],
  },
};

export default function GreetingsPage() {
  return (
    <>
      <HeaderInner />
      <main>
        <Breadcrumb
          items={[
            { label: "トップ", href: "/" },
            { label: "奄美方言辞書", href: AMAMI_DIALECT_PATH },
            { label: "あいさつ" },
          ]}
        />

        <div className="inner-hero dialect-hero">
          <p className="inner-hero-area">GREETINGS</p>
          <h1>奄美方言あいさつ一覧</h1>
          <p className="inner-hero-lead">
            公開用データとして整理した{amamiGreetings.length}件を掲載しています。丁寧さや使用地域は、資料上の確認範囲を超えて補いません。
          </p>
        </div>

        <section className="svc-section">
          <div className="container">
            <DialectListClient
              items={amamiGreetings.map(toGreetingListItem)}
              filterLabel="公開状態"
              searchLabel="あいさつ検索"
              filterOptions={greetingStatuses.map((status) => ({
                label: status,
                value: status,
              }))}
            />
          </div>
        </section>

        <div className="related-section">
          <p className="related-section-label">Navigation</p>
          <div className="related-links">
            <Link href={`${AMAMI_DIALECT_PATH}/proverbs`} className="related-link">
              ことわざ一覧
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

