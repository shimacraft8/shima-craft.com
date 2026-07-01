import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HeaderInner } from "@/app/components/HeaderInner";
import { Footer } from "@/app/components/Footer";
import { StickyContact } from "@/app/components/StickyContact";
import { Breadcrumb } from "@/app/components/Breadcrumb";
import { WordExplorer } from "@/app/amami-dialect/_components/WordExplorer";
import {
  AMAMI_DIALECT_PATH,
  amamiWords,
  getWordsByCategorySlug,
  wordCategories,
  WORD_REGION_ORDER,
} from "@/app/lib/amamiDialect";

type Props = {
  params: { category: string };
  searchParams: Record<string, string | string[] | undefined>;
};

export function generateStaticParams() {
  return wordCategories.map((category) => ({ category: category.slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const category = wordCategories.find((c) => c.slug === params.category);
  if (!category) {
    return {};
  }

  const description = `奄美方言のうち「${category.label}」に分類される語彙${category.count}件を、地域（奄美大島・喜界島・徳之島・沖永良部島・与論島）ごとに掲載しています。`;

  return {
    title: `${category.label}の奄美方言語彙｜奄美方言辞書`,
    description,
    alternates: { canonical: `${AMAMI_DIALECT_PATH}/words/category/${category.slug}` },
    openGraph: {
      title: `${category.label}の奄美方言語彙｜SHIMA CRAFT`,
      description,
      url: `${AMAMI_DIALECT_PATH}/words/category/${category.slug}`,
      type: "website",
      locale: "ja_JP",
      siteName: "SHIMA CRAFT",
      images: [{ url: "/hero.jpg", width: 1200, height: 630, alt: "奄美大島の空撮写真 — SHIMA CRAFT" }],
    },
  };
}

export default function WordCategoryPage({ params, searchParams }: Props) {
  const category = wordCategories.find((c) => c.slug === params.category);
  if (!category) {
    notFound();
  }

  const items = getWordsByCategorySlug(params.category);
  const relatedCategories = wordCategories.filter((c) => c.slug !== category.slug);

  return (
    <>
      <HeaderInner />
      <main>
        <Breadcrumb
          items={[
            { label: "トップ", href: "/" },
            { label: "奄美方言辞書", href: AMAMI_DIALECT_PATH },
            { label: "語彙", href: `${AMAMI_DIALECT_PATH}/words` },
            { label: category.label },
          ]}
        />

        <div className="inner-hero dialect-hero">
          <p className="inner-hero-area">WORDS / {category.label.toUpperCase()}</p>
          <h1>{category.label}の奄美方言語彙</h1>
          <p className="inner-hero-lead">
            県公式資料「大島地区方言マップ」に基づく{category.label}の語彙{items.length}件です。
          </p>
        </div>

        <section className="svc-section">
          <div className="container">
            <WordExplorer
              items={amamiWords}
              categories={wordCategories}
              regions={WORD_REGION_ORDER}
              searchParams={searchParams}
              defaultCategorySlug={category.slug}
              basePath={`${AMAMI_DIALECT_PATH}/words`}
            />
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
            {relatedCategories.map((c) => (
              <Link
                key={c.slug}
                href={`${AMAMI_DIALECT_PATH}/words/category/${c.slug}`}
                className="related-link"
              >
                {c.label}
              </Link>
            ))}
            <Link href={`${AMAMI_DIALECT_PATH}/words`} className="related-link">
              語彙一覧（全{amamiWords.length}件）
            </Link>
          </div>
        </div>
      </main>
      <Footer />
      <StickyContact />
    </>
  );
}
