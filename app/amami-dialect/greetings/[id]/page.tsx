import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HeaderInner } from "@/app/components/HeaderInner";
import { Footer } from "@/app/components/Footer";
import { StickyContact } from "@/app/components/StickyContact";
import { Breadcrumb } from "@/app/components/Breadcrumb";
import {
  AMAMI_DIALECT_PATH,
  amamiGreetings,
  displayText,
  getGreetingById,
} from "@/app/lib/amamiDialect";

type Props = {
  params: { id: string };
};

export function generateStaticParams() {
  return amamiGreetings.map((record) => ({ id: record.id }));
}

export function generateMetadata({ params }: Props): Metadata {
  const record = getGreetingById(params.id);
  if (!record) {
    return {};
  }

  const meaning = displayText(record.meaning) || displayText(record.otherTranslations);
  const description = meaning ? `${record.title}。${meaning}` : record.title;

  return {
    title: `${record.title}｜奄美方言あいさつ`,
    description,
    alternates: { canonical: `${AMAMI_DIALECT_PATH}/greetings/${record.id}` },
    openGraph: {
      title: `${record.title}｜奄美方言あいさつ｜SHIMA CRAFT`,
      description,
      url: `${AMAMI_DIALECT_PATH}/greetings/${record.id}`,
      type: "article",
      locale: "ja_JP",
      siteName: "SHIMA CRAFT",
      images: [{ url: "/hero.jpg", width: 1200, height: 630, alt: "奄美大島の空撮写真 — SHIMA CRAFT" }],
    },
  };
}

export default function GreetingDetailPage({ params }: Props) {
  const record = getGreetingById(params.id);
  if (!record) {
    notFound();
  }

  const reading = displayText(record.reading) || record.title;
  const meaning = displayText(record.meaning);
  const otherTranslations = displayText(record.otherTranslations);
  const politeness = displayText(record.politeness);
  const timeOfDay = displayText(record.timeOfDay);
  const usageRegion = displayText(record.usageRegion);
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
            { label: "あいさつ", href: `${AMAMI_DIALECT_PATH}/greetings` },
            { label: record.id },
          ]}
        />

        <article className="dialect-detail">
          <p className="dialect-card-id">{record.id}</p>
          <h1>{record.title}</h1>
          <p className="dialect-detail-reading">{reading}</p>
          {meaning ? <p className="dialect-detail-meaning">{meaning}</p> : null}

          <section className="dialect-detail-section">
            <h2>確認状況</h2>
            <dl className="dialect-facts">
              <div>
                <dt>根拠</dt>
                <dd>{record.evidenceLabel}</dd>
              </div>
              <div>
                <dt>公開状態</dt>
                <dd>{record.publicationStatus}</dd>
              </div>
              <div>
                <dt>その他の訳</dt>
                <dd>{otherTranslations || "未確認"}</dd>
              </div>
              <div>
                <dt>時間帯</dt>
                <dd>{timeOfDay || "未確認"}</dd>
              </div>
              <div>
                <dt>使用地域</dt>
                <dd>{usageRegion || "未確認"}</dd>
              </div>
            </dl>
          </section>

          {politeness ? (
            <section className="dialect-detail-section">
              <h2>資料上の扱い</h2>
              <p>{politeness}</p>
            </section>
          ) : null}

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
                <dd>{record.source}</dd>
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
            <Link href={`${AMAMI_DIALECT_PATH}/greetings`} className="related-link">
              あいさつ一覧
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

