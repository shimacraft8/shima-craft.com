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
  getWordsByRegionSlug,
  regionCategoryBreakdown,
  representativeForms,
  wordRegions,
} from "@/app/lib/amamiDialect";

type Props = {
  params: { region: string };
};

export function generateStaticParams() {
  return wordRegions.map((region) => ({ region: region.slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const region = wordRegions.find((r) => r.slug === params.region);
  if (!region) {
    return {};
  }

  const categories = regionCategoryBreakdown(region.label)
    .slice(0, 3)
    .map((c) => c.label)
    .join("・");
  const description = `${region.label}で記録された奄美方言の語彙を、${categories}などのカテゴリ別に掲載しています。県公式資料「大島地区方言マップ」に基づく公開用データです。`;

  return {
    title: `${region.label}の方言一覧｜${categories}のことば`,
    description,
    alternates: { canonical: `${AMAMI_DIALECT_PATH}/regions/${region.slug}` },
    openGraph: {
      title: `${region.label}の方言一覧｜SHIMA CRAFT`,
      description,
      url: `${AMAMI_DIALECT_PATH}/regions/${region.slug}`,
      type: "website",
      locale: "ja_JP",
      siteName: "SHIMA CRAFT",
      images: [{ url: "/hero.jpg", width: 1200, height: 630, alt: "奄美大島の空撮写真 — SHIMA CRAFT" }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${region.label}の方言一覧｜SHIMA CRAFT`,
      description,
      images: ["/hero.jpg"],
    },
  };
}

export default function RegionPage({ params }: Props) {
  const region = wordRegions.find((r) => r.slug === params.region);
  if (!region) {
    notFound();
  }

  const items = getWordsByRegionSlug(params.region);
  const categoryBreakdown = regionCategoryBreakdown(region.label);
  const otherRegions = wordRegions.filter((r) => r.slug !== region.slug);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${region.label}の方言一覧`,
    description: `${region.label}で記録された奄美方言の語彙一覧`,
    url: `${site.url}${AMAMI_DIALECT_PATH}/regions/${region.slug}`,
    isPartOf: {
      "@type": "WebSite",
      name: "SHIMA CRAFT",
      url: site.url,
    },
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
            { label: region.label },
          ]}
        />

        <div className="inner-hero dialect-hero">
          <p className="inner-hero-area">REGIONS / {region.label.toUpperCase()}</p>
          <h1>{region.label}の奄美方言</h1>
          <p className="inner-hero-lead">
            県公式資料「大島地区方言マップ」に基づき、{region.label}で記録された語彙{items.length}件を掲載しています。
          </p>
        </div>

        <section className="svc-section">
          <div className="container">
            <div className="dialect-region-summary">
              <div>
                <strong>{items.length}</strong>
                <span>概念数</span>
              </div>
              {categoryBreakdown.map((category) => (
                <div key={category.slug}>
                  <strong>{category.count}</strong>
                  <span>{category.label}</span>
                </div>
              ))}
            </div>

            <div className="section-cta">
              <Link
                className="btn btn-soft"
                href={`${AMAMI_DIALECT_PATH}/words?region=${region.slug}`}
              >
                {region.label}の語彙を検索・絞り込みで見る
              </Link>
            </div>
          </div>
        </section>

        <section className="svc-section" style={{ background: "#fff" }}>
          <div className="container">
            <h2 className="svc-title">{region.label}の代表語</h2>
            <p className="dialect-meaning" style={{ marginBottom: 16 }}>
              カテゴリごとに1語ずつ、記録形の一例を紹介します。
            </p>
            <div className="dialect-card-grid dialect-card-grid-compact">
              {categoryBreakdown.map((category) => {
                const record = items.find((w) => w.category === category.label);
                if (!record) return null;
                const entry = record.regions.find((e) => e.region === region.label);
                if (!entry) return null;
                return (
                  <article className="dialect-card" key={category.slug}>
                    <p className="dialect-card-id">{category.label}</p>
                    <h3>
                      <Link href={`${AMAMI_DIALECT_PATH}/words/${record.id}`}>
                        {record.standardWord}
                      </Link>
                    </h3>
                    <p className="dialect-reading">{representativeForms(entry.forms, 3)}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="svc-section">
          <div className="container">
            <h2 className="svc-title">{region.label}の方言表記一覧</h2>
            <ul className="dialect-region-word-list">
              {items.map((record) => {
                const entry = record.regions.find((e) => e.region === region.label);
                if (!entry) return null;
                return (
                  <li key={record.id}>
                    <Link href={`${AMAMI_DIALECT_PATH}/words/${record.id}`}>
                      {record.standardWord}
                    </Link>
                    <span>（{record.category}）：{representativeForms(entry.forms, 4)}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <section className="svc-section">
          <div className="container">
            <div className="dialect-note">
              <h2>ご注意</h2>
              <p>
                掲載表記は資料に記録された一例であり、同じ島内でも集落により異なる場合があります。
              </p>
            </div>
          </div>
        </section>

        <section className="svc-section" style={{ background: "#fff" }}>
          <div className="container">
            <h2 className="svc-title">他の地域と比較する</h2>
            <nav className="dialect-region-nav" aria-label="地域切り替え">
              {wordRegions.map((r) => (
                <Link
                  key={r.slug}
                  href={`${AMAMI_DIALECT_PATH}/regions/${r.slug}`}
                  aria-current={r.slug === region.slug ? "true" : undefined}
                >
                  {r.label}
                </Link>
              ))}
            </nav>
          </div>
        </section>

        <div className="dialect-back-actions">
          <Link href={`${AMAMI_DIALECT_PATH}/words`} className="btn btn-soft">
            語彙一覧へ戻る
          </Link>
          <Link href={AMAMI_DIALECT_PATH} className="btn btn-soft">
            辞書トップへ戻る
          </Link>
        </div>

        <div className="related-section">
          <p className="related-section-label">Navigation</p>
          <div className="related-links">
            {otherRegions.map((r) => (
              <Link
                key={r.slug}
                href={`${AMAMI_DIALECT_PATH}/regions/${r.slug}`}
                className="related-link"
              >
                {r.label}の方言
              </Link>
            ))}
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
