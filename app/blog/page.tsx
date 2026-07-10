import type { Metadata } from "next";
import Link from "next/link";

import { Footer } from "@/app/components/Footer";
import { HeaderInner } from "@/app/components/HeaderInner";
import { StickyContact } from "@/app/components/StickyContact";
import { BlogCard } from "@/app/components/blog/BlogCard";
import {
  getBlogCategories,
  getBlogPosts,
  isMicroCMSConfigured,
} from "@/app/lib/blog";

import styles from "./blog.module.css";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "ブログ",
  description:
    "地方・離島の小さな事業者向けに、予約・お客さま管理、集客・口コミ、写真・空撮の実務情報をまとめています。",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "ブログ｜SHIMA CRAFT",
    description:
      "地方・離島の小さな事業者向けに、予約管理・集客・写真や空撮の情報を発信しています。",
    url: "/blog",
    type: "website",
  },
};

type BlogIndexPageProps = {
  searchParams?: {
    category?: string | string[];
    page?: string | string[];
  };
};

const PER_PAGE = 12;

function first(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function toPositiveInteger(value?: string) {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function pageHref(page: number, category?: string) {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/blog?${query}` : "/blog";
}

export default async function BlogIndexPage({ searchParams }: BlogIndexPageProps) {
  const category = first(searchParams?.category);
  const currentPage = toPositiveInteger(first(searchParams?.page));
  const offset = (currentPage - 1) * PER_PAGE;

  const [categories, result] = await Promise.all([
    getBlogCategories(),
    getBlogPosts({ limit: PER_PAGE, offset, categorySlug: category }),
  ]);

  const totalPages = Math.max(1, Math.ceil(result.totalCount / PER_PAGE));
  const hasPrevious = currentPage > 1;
  const hasNext = currentPage < totalPages;

  return (
    <>
      <HeaderInner />
      <main className={styles.pageMain}>
        <section className={styles.pageHero}>
          <div className={styles.containerNarrow}>
            <p className={styles.eyebrow}>Journal</p>
            <h1 className={styles.pageTitle}>SHIMA CRAFT ブログ</h1>
            <p className={styles.pageDescription}>
              地方・離島の小さな事業者が、Webや予約管理を少しずつ整えるための情報を発信します。
            </p>
          </div>
        </section>

        <section className={styles.indexSection}>
          <div className={styles.container}>
            <nav className={styles.categoryTabs} aria-label="記事カテゴリ">
              <Link
                href="/blog"
                className={!category ? styles.categoryTabActive : styles.categoryTab}
                aria-current={!category ? "page" : undefined}
              >
                すべて
              </Link>
              {categories.map((item) => {
                const active = category === item.slug;
                return (
                  <Link
                    key={item.id}
                    href={`/blog?category=${encodeURIComponent(item.slug)}`}
                    className={active ? styles.categoryTabActive : styles.categoryTab}
                    aria-current={active ? "page" : undefined}
                    style={{ "--category-color": item.color } as React.CSSProperties}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            {result.contents.length > 0 ? (
              <div className={styles.cardGrid}>
                {result.contents.map((post) => (
                  <BlogCard key={post.id} post={post} />
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <h2>記事を準備しています</h2>
                <p>
                  {isMicroCMSConfigured()
                    ? "このカテゴリの記事はまだありません。"
                    : "microCMSの環境変数を設定すると、公開記事がここに表示されます。"}
                </p>
              </div>
            )}

            {result.totalCount > PER_PAGE && (
              <nav className={styles.pagination} aria-label="ページ送り">
                {hasPrevious ? (
                  <Link href={pageHref(currentPage - 1, category)}>← 前のページ</Link>
                ) : (
                  <span aria-disabled="true">← 前のページ</span>
                )}
                <span>
                  {Math.min(currentPage, totalPages)} / {totalPages}
                </span>
                {hasNext ? (
                  <Link href={pageHref(currentPage + 1, category)}>次のページ →</Link>
                ) : (
                  <span aria-disabled="true">次のページ →</span>
                )}
              </nav>
            )}
          </div>
        </section>
      </main>
      <Footer />
      <StickyContact />
    </>
  );
}
