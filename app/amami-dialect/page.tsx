import type { Metadata } from "next";
import Link from "next/link";
import { HeaderInner } from "@/app/components/HeaderInner";
import { Footer } from "@/app/components/Footer";
import { StickyContact } from "@/app/components/StickyContact";
import { Breadcrumb } from "@/app/components/Breadcrumb";
import { TopSearchBox } from "@/app/amami-dialect/_components/TopSearchBox";
import {
  AMAMI_DIALECT_PATH,
  amamiGreetings,
  amamiProverbs,
  amamiWords,
  getGreetingById,
  getWordById,
  toGreetingListItem,
  toProverbListItem,
  wordCategories,
  wordRegions,
} from "@/app/lib/amamiDialect";

const STANDARD_WORD_QUERIES = [
  "おはようございます",
  "ありがとう",
  "いただきます",
  "父",
  "母",
  "風",
  "犬",
];

const FREQUENTLY_LOOKED_UP = [
  { id: "WORD-020", type: "word" as const },
  { id: "GREET-004", type: "greeting" as const },
  { id: "GREET-002", type: "greeting" as const },
  { id: "WORD-003", type: "word" as const },
  { id: "WORD-004", type: "word" as const },
  { id: "WORD-011", type: "word" as const },
  { id: "WORD-015", type: "word" as const },
];

const PAGE_DESC =
  "奄美大島の方言に関する公開用辞書です。ことわざ・あいさつに加え、家族・道具・自然・生き物・食事の語彙を、地域差と原資料の確認状況が分かる形で掲載しています。";

export const metadata: Metadata = {
  title: "奄美方言辞書",
  description: PAGE_DESC,
  alternates: { canonical: AMAMI_DIALECT_PATH },
  openGraph: {
    title: "奄美方言辞書｜SHIMA CRAFT",
    description: PAGE_DESC,
    url: AMAMI_DIALECT_PATH,
    type: "website",
    locale: "ja_JP",
    siteName: "SHIMA CRAFT",
    images: [{ url: "/hero.jpg", width: 1200, height: 630, alt: "奄美大島の空撮写真 — SHIMA CRAFT" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "奄美方言辞書｜SHIMA CRAFT",
    description: PAGE_DESC,
    images: ["/hero.jpg"],
  },
};

const featuredProverbs = amamiProverbs.slice(0, 3).map(toProverbListItem);
const featuredGreetings = amamiGreetings.slice(0, 3).map(toGreetingListItem);

export default function AmamiDialectPage() {
  return (
    <>
      <HeaderInner />
      <main>
        <Breadcrumb
          items={[
            { label: "トップ", href: "/" },
            { label: "奄美方言辞書" },
          ]}
        />

        <div className="inner-hero dialect-hero">
          <p className="inner-hero-area">AMAMI DIALECT</p>
          <h1>奄美方言辞書</h1>
          <p className="inner-hero-lead">
            原資料に基づく公開用データだけを掲載しています。一般向けページではカタカナ読みを中心に表示し、専門的な音声表記は扱いません。
          </p>
        </div>

        <section className="svc-section" style={{ background: "#fff" }}>
          <div className="container">
            <div className="dialect-search-hero">
              <TopSearchBox />
            </div>
          </div>
        </section>

        <section className="svc-section">
          <div className="container">
            <div className="dialect-nav-grid">
              <Link className="dialect-nav-card" href={`${AMAMI_DIALECT_PATH}/proverbs`}>
                <span>PROVERBS</span>
                <strong>ことわざ</strong>
                <em>{amamiProverbs.length}件</em>
              </Link>
              <Link className="dialect-nav-card" href={`${AMAMI_DIALECT_PATH}/greetings`}>
                <span>GREETINGS</span>
                <strong>あいさつ</strong>
                <em>{amamiGreetings.length}件</em>
              </Link>
              <Link className="dialect-nav-card" href={`${AMAMI_DIALECT_PATH}/words`}>
                <span>WORDS</span>
                <strong>語彙</strong>
                <em>{amamiWords.length}件</em>
              </Link>
              <Link className="dialect-nav-card" href={`${AMAMI_DIALECT_PATH}/search`}>
                <span>SEARCH</span>
                <strong>横断検索</strong>
                <em>すべてから検索</em>
              </Link>
              <Link className="dialect-nav-card" href={`${AMAMI_DIALECT_PATH}/about`}>
                <span>ABOUT</span>
                <strong>掲載方針</strong>
                <em>出典と注意</em>
              </Link>
            </div>
          </div>
        </section>

        <section className="svc-section" style={{ background: "#fff" }}>
          <div className="container">
            <h2 className="svc-title">カテゴリから調べる</h2>
            <p className="dialect-meaning" style={{ marginBottom: 16 }}>
              家族・道具・自然・生き物・食事・あいさつの語彙と、ことわざを、地域（奄美大島・喜界島・徳之島・沖永良部島・与論島）ごとに掲載しています。
            </p>
            <div className="dialect-category-grid">
              {wordCategories.map((category) => (
                <Link
                  key={category.slug}
                  className="dialect-category-card"
                  href={`${AMAMI_DIALECT_PATH}/words/category/${category.slug}`}
                >
                  <strong>{category.label}</strong>
                  <em>{category.count}件</em>
                </Link>
              ))}
              <Link
                className="dialect-category-card"
                href={`${AMAMI_DIALECT_PATH}/proverbs`}
              >
                <strong>ことわざ</strong>
                <em>{amamiProverbs.length}件</em>
              </Link>
            </div>
          </div>
        </section>

        <section className="svc-section">
          <div className="container">
            <h2 className="svc-title">地域から調べる</h2>
            <p className="dialect-meaning" style={{ marginBottom: 16 }}>
              奄美大島・喜界島・徳之島・沖永良部島・与論島、それぞれの記録形をまとめて見られます。
            </p>
            <div className="dialect-category-grid">
              {wordRegions.map((region) => (
                <Link
                  key={region.slug}
                  className="dialect-category-card"
                  href={`${AMAMI_DIALECT_PATH}/regions/${region.slug}`}
                >
                  <strong>{region.label}</strong>
                  <em>{region.count}件</em>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="svc-section" style={{ background: "#fff" }}>
          <div className="container">
            <h2 className="svc-title">標準語から調べる</h2>
            <p className="dialect-meaning" style={{ marginBottom: 16 }}>
              「おはようは奄美大島で何という？」のように、標準語から検索できます。記録が無い語句は「該当する項目はありません」と表示されます。
            </p>
            <div className="dialect-quick-links">
              {STANDARD_WORD_QUERIES.map((term) => (
                <Link
                  key={term}
                  href={`${AMAMI_DIALECT_PATH}/search?q=${encodeURIComponent(term)}`}
                >
                  {term}
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="svc-section">
          <div className="container">
            <h2 className="svc-title">よく調べられることば</h2>
            <div className="dialect-quick-links">
              {FREQUENTLY_LOOKED_UP.map(({ id, type }) => {
                if (type === "word") {
                  const record = getWordById(id);
                  if (!record) return null;
                  return (
                    <Link key={id} href={`${AMAMI_DIALECT_PATH}/words/${id}`}>
                      {record.standardWord}
                    </Link>
                  );
                }
                const record = getGreetingById(id);
                if (!record) return null;
                return (
                  <Link key={id} href={`${AMAMI_DIALECT_PATH}/greetings/${id}`}>
                    {record.title}
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <section className="svc-section" style={{ background: "#fff" }}>
          <div className="container">
            <h2 className="svc-title">地域差・表記差について</h2>
            <p className="dialect-meaning">
              奄美群島の方言は、島や集落によって記録形が異なる場合があります。このサイトでは複数の記録形をそのまま並べて掲載しており、
              一つの表記だけを「唯一の正解」として示すことはしていません。詳しい掲載方針は
              <Link href={`${AMAMI_DIALECT_PATH}/about`}>掲載方針ページ</Link>
              でご確認いただけます。
            </p>
          </div>
        </section>

        <section className="svc-section" style={{ background: "#fff" }}>
          <div className="container">
            <h2 className="svc-title">ことわざ</h2>
            <div className="dialect-card-grid dialect-card-grid-compact">
              {featuredProverbs.map((item) => (
                <article className="dialect-card" key={item.id}>
                  <p className="dialect-card-id">{item.id}</p>
                  <h3>
                    <Link href={item.href}>{item.title}</Link>
                  </h3>
                  <p className="dialect-reading">{item.reading}</p>
                  <p className="dialect-meaning">{item.meaning}</p>
                </article>
              ))}
            </div>
            <div className="section-cta">
              <Link className="btn btn-soft" href={`${AMAMI_DIALECT_PATH}/proverbs`}>
                ことわざ一覧へ
              </Link>
            </div>
          </div>
        </section>

        <section className="svc-section">
          <div className="container">
            <h2 className="svc-title">あいさつ</h2>
            <div className="dialect-card-grid dialect-card-grid-compact">
              {featuredGreetings.map((item) => (
                <article className="dialect-card" key={item.id}>
                  <p className="dialect-card-id">{item.id}</p>
                  <h3>
                    <Link href={item.href}>{item.title}</Link>
                  </h3>
                  <p className="dialect-reading">{item.reading}</p>
                  {item.description ? (
                    <p className="dialect-meaning">{item.description}</p>
                  ) : null}
                </article>
              ))}
            </div>
            <div className="section-cta">
              <Link className="btn btn-soft" href={`${AMAMI_DIALECT_PATH}/greetings`}>
                あいさつ一覧へ
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <StickyContact />
    </>
  );
}

