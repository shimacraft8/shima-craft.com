import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HeaderInner } from "@/app/components/HeaderInner";
import { Footer } from "@/app/components/Footer";
import { StickyContact } from "@/app/components/StickyContact";
import { Breadcrumb } from "@/app/components/Breadcrumb";
import {
  AMAMI_DIALECT_PATH,
  amamiProverbs,
  displayText,
  getProverbById,
} from "@/app/lib/amamiDialect";

type Props = {
  params: { id: string };
};

export function generateStaticParams() {
  return amamiProverbs.map((record) => ({ id: record.id }));
}

export function generateMetadata({ params }: Props): Metadata {
  const record = getProverbById(params.id);
  if (!record) {
    return {};
  }

  const description = `${record.reading}。${record.meaning}`;

  return {
    title: `${record.title}｜奄美方言ことわざ`,
    description,
    alternates: { canonical: `${AMAMI_DIALECT_PATH}/proverbs/${record.id}` },
    openGraph: {
      title: `${record.title}｜奄美方言ことわざ｜SHIMA CRAFT`,
      description,
      url: `${AMAMI_DIALECT_PATH}/proverbs/${record.id}`,
      type: "article",
      locale: "ja_JP",
      siteName: "SHIMA CRAFT",
      images: [{ url: "/hero.jpg", width: 1200, height: 630, alt: "奄美大島の空撮写真 — SHIMA CRAFT" }],
    },
  };
}

export default function ProverbDetailPage({ params }: Props) {
  const record = getProverbById(params.id);
  if (!record) {
    notFound();
  }

  const description = displayText(record.description);
  const caution = displayText(record.caution);
  const hasSourceUrl = record.sourceUrl && record.sourceUrl !== "未確認";

  return (
    <>
      <HeaderInner />
      <main>
        <Breadcrumb
          items={[
            { label: "トップ", href: "/" },
            { label: "奄美方言辞書", href: AMAMI_DIALECT_PATH },
            { label: "ことわざ", href: `${AMAMI_DIALECT_PATH}/proverbs` },
            { label: record.id },
          ]}
        />

        <article className="dialect-detail">
          <p className="dialect-card-id">{record.id}</p>
          <h1>{record.title}</h1>
          <p className="dialect-detail-reading">{record.reading}</p>
          <p className="dialect-detail-meaning">{record.meaning}</p>

          {description ? (
            <section className="dialect-detail-section">
              <h2>資料内の説明</h2>
              <p>{description}</p>
            </section>
          ) : null}

          <section className="dialect-detail-section">
            <h2>確認状況</h2>
            <dl className="dialect-facts">
              <div>
                <dt>根拠</dt>
                <dd>{record.evidenceLabel}</dd>
              </div>
              <div>
                <dt>資料が扱う地域</dt>
                <dd>{record.sourceRegion}</dd>
              </div>
              <div>
                <dt>実際の使用範囲</dt>
                <dd>{record.actualUsageArea ?? "未確認"}</dd>
              </div>
              <div>
                <dt>現代使用</dt>
                <dd>{record.modernUsage ?? "未確認"}</dd>
              </div>
            </dl>
          </section>

          {caution ? (
            <section className="dialect-note">
              <h2>注意事項</h2>
              <p>{caution}</p>
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
            <Link href={`${AMAMI_DIALECT_PATH}/proverbs`} className="related-link">
              ことわざ一覧
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

