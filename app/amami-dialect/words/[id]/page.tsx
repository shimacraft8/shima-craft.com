import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HeaderInner } from "@/app/components/HeaderInner";
import { Footer } from "@/app/components/Footer";
import { StickyContact } from "@/app/components/StickyContact";
import { Breadcrumb } from "@/app/components/Breadcrumb";
import { site } from "@/app/lib/site";
import {
  AMAMI_DIALECT_PATH,
  amamiWords,
  getWordById,
  WORD_CATEGORY_SLUGS,
} from "@/app/lib/amamiDialect";

type Props = {
  params: { id: string };
};

export function generateStaticParams() {
  return amamiWords.map((record) => ({ id: record.id }));
}

export function generateMetadata({ params }: Props): Metadata {
  const record = getWordById(params.id);
  if (!record) {
    return {};
  }

  const regionSummary = record.regions
    .map((entry) => `${entry.region}：${entry.forms.join("・")}`)
    .join("／");
  const description = `${record.category}の語彙「${record.standardWord}」。${regionSummary}`;

  return {
    title: `${record.standardWord}｜奄美方言 語彙`,
    description,
    alternates: { canonical: `${AMAMI_DIALECT_PATH}/words/${record.id}` },
    openGraph: {
      title: `${record.standardWord}｜奄美方言 語彙｜SHIMA CRAFT`,
      description,
      url: `${AMAMI_DIALECT_PATH}/words/${record.id}`,
      type: "article",
      locale: "ja_JP",
      siteName: "SHIMA CRAFT",
      images: [{ url: "/hero.jpg", width: 1200, height: 630, alt: "奄美大島の空撮写真 — SHIMA CRAFT" }],
    },
  };
}

export default function WordDetailPage({ params }: Props) {
  const record = getWordById(params.id);
  if (!record) {
    notFound();
  }

  const hasSourceUrl = record.sourceUrl && record.sourceUrl !== "未確認";
  const categorySlug = WORD_CATEGORY_SLUGS[record.category] ?? record.category;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    name: record.standardWord,
    inDefinedTermSet: `${site.url}${AMAMI_DIALECT_PATH}/words`,
    description: record.regions
      .map((entry) => `${entry.region}：${entry.forms.join("・")}`)
      .join("／"),
    url: `${site.url}${AMAMI_DIALECT_PATH}/words/${record.id}`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HeaderInner />
      <main>
        <Breadcrumb
          items={[
            { label: "トップ", href: "/" },
            { label: "奄美方言辞書", href: AMAMI_DIALECT_PATH },
            { label: "語彙", href: `${AMAMI_DIALECT_PATH}/words` },
            { label: record.id },
          ]}
        />

        <article className="dialect-detail">
          <p className="dialect-card-id">{record.id}</p>
          <h1>{record.standardWord}</h1>
          <p className="dialect-detail-reading">
            <Link href={`${AMAMI_DIALECT_PATH}/words/category/${categorySlug}`}>
              {record.category}
            </Link>
          </p>

          <section className="dialect-detail-section">
            <h2>地域別の記録形</h2>
            <div className="dialect-word-detail-regions">
              {record.regions.map((entry) => (
                <div className="dialect-word-detail-region" key={entry.region}>
                  <h3>{entry.region}</h3>
                  <ul>
                    {entry.forms.map((form) => (
                      <li key={form}>{form}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <section className="dialect-detail-section">
            <h2>確認状況</h2>
            <dl className="dialect-facts">
              <div>
                <dt>公開判定</dt>
                <dd>{record.publicationStatus}</dd>
              </div>
              <div>
                <dt>資料の信頼区分</dt>
                <dd>
                  {record.trustTier === "official_prefecture"
                    ? "県公式資料"
                    : record.trustTier}
                </dd>
              </div>
            </dl>
          </section>

          {record.caution ? (
            <section className="dialect-note">
              <h2>注意事項</h2>
              <p>{record.caution}</p>
            </section>
          ) : null}

          <details className="dialect-source">
            <summary>出典情報</summary>
            <dl className="dialect-facts">
              <div>
                <dt>資料名</dt>
                <dd>{record.sourceTitle}</dd>
              </div>
              <div>
                <dt>掲載ページ</dt>
                <dd>{record.sourcePage}</dd>
              </div>
              {hasSourceUrl ? (
                <div>
                  <dt>URL</dt>
                  <dd>
                    <a href={record.sourceUrl} target="_blank" rel="noreferrer">
                      原資料ページ
                    </a>
                  </dd>
                </div>
              ) : null}
            </dl>
          </details>
        </article>

        <div className="related-section">
          <p className="related-section-label">Navigation</p>
          <div className="related-links">
            <Link
              href={`${AMAMI_DIALECT_PATH}/words/category/${categorySlug}`}
              className="related-link"
            >
              {record.category}の語彙一覧
            </Link>
            <Link href={`${AMAMI_DIALECT_PATH}/words`} className="related-link">
              語彙一覧
            </Link>
            <Link href={AMAMI_DIALECT_PATH} className="related-link">
              奄美方言辞書
            </Link>
          </div>
        </div>
      </main>
      <Footer />
      <StickyContact />
    </>
  );
}
