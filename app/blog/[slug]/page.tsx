import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Footer } from "@/app/components/Footer";
import { HeaderInner } from "@/app/components/HeaderInner";
import { StickyContact } from "@/app/components/StickyContact";
import { BlogCard } from "@/app/components/blog/BlogCard";
import { BlogContactLink } from "@/app/components/blog/BlogContactLink";
import { BlogImage } from "@/app/components/blog/BlogImage";
import {
  enhanceBlogBodyHtml,
  formatBlogDate,
  getAllBlogPostsForSitemap,
  getBlogPostBySlug,
  getRelatedBlogPosts,
} from "@/app/lib/blog";
import { site } from "@/app/lib/site";

import styles from "../blog.module.css";

export const revalidate = 60;
export const dynamicParams = true;

type BlogDetailPageProps = {
  params: { slug: string };
  searchParams?: { draftKey?: string | string[] };
};

function first(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function absoluteUrl(value: string) {
  return value.startsWith("http") ? value : `${site.url}${value}`;
}

function safeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export async function generateStaticParams() {
  const posts = await getAllBlogPostsForSitemap();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
  searchParams,
}: BlogDetailPageProps): Promise<Metadata> {
  const draftKey = first(searchParams?.draftKey);
  const post = await getBlogPostBySlug(params.slug, draftKey);

  if (!post) {
    return {
      title: "記事が見つかりません",
      robots: { index: false, follow: false },
    };
  }

  const image = post.eyecatch?.url ?? site.ogImage;
  const canonical = `/blog/${post.slug}`;

  return {
    title: post.title,
    description: post.description,
    alternates: { canonical },
    robots: draftKey ? { index: false, follow: false } : undefined,
    openGraph: {
      type: "article",
      locale: "ja_JP",
      url: canonical,
      title: `${post.title}｜${site.name}`,
      description: post.description,
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      images: [{ url: image, alt: post.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${post.title}｜${site.name}`,
      description: post.description,
      images: [image],
    },
  };
}

export default async function BlogDetailPage({
  params,
  searchParams,
}: BlogDetailPageProps) {
  const draftKey = first(searchParams?.draftKey);
  const post = await getBlogPostBySlug(params.slug, draftKey);
  if (!post) notFound();

  const relatedPosts = await getRelatedBlogPosts(post, 2);
  const articleUrl = `${site.url}/blog/${post.slug}`;
  const imageUrl = absoluteUrl(post.eyecatch?.url ?? site.ogImage);

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    mainEntityOfPage: articleUrl,
    image: [imageUrl],
    author: {
      "@type": "Organization",
      name: site.name,
      url: site.url,
    },
    publisher: {
      "@type": "Organization",
      name: site.name,
      url: site.url,
      logo: {
        "@type": "ImageObject",
        url: `${site.url}/logo.png`,
      },
    },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "ホーム", item: site.url },
      { "@type": "ListItem", position: 2, name: "ブログ", item: `${site.url}/blog` },
      { "@type": "ListItem", position: 3, name: post.title, item: articleUrl },
    ],
  };

  return (
    <>
      <HeaderInner />
      <main className={styles.pageMain}>
        <article className={styles.article}>
          <div className={styles.articleContainer}>
            <nav className={styles.breadcrumb} aria-label="パンくずリスト">
              <Link href="/">ホーム</Link>
              <span aria-hidden="true">›</span>
              <Link href="/blog">ブログ</Link>
              <span aria-hidden="true">›</span>
              <span aria-current="page">{post.title}</span>
            </nav>

            {draftKey && <p className={styles.previewNotice}>下書きプレビュー</p>}

            <header className={styles.articleHeader}>
              <span
                className={styles.categoryLabel}
                style={{ "--category-color": post.category.color } as React.CSSProperties}
              >
                {post.category.name}
              </span>
              <h1 className={styles.articleTitle}>{post.title}</h1>
              <div className={styles.articleDates}>
                <time dateTime={post.publishedAt}>
                  公開日 {formatBlogDate(post.publishedAt)}
                </time>
                <time dateTime={post.updatedAt}>
                  更新日 {formatBlogDate(post.updatedAt)}
                </time>
              </div>
              {post.isPR && <p className={styles.prLabel}>PR</p>}
            </header>

            <BlogImage
              image={post.eyecatch}
              alt={post.title}
              priority
              sizes="(max-width: 900px) 100vw, 860px"
            />

            <div
              className={styles.articleBody}
              dangerouslySetInnerHTML={{ __html: enhanceBlogBodyHtml(post.body) }}
            />

            <aside className={styles.contactCta} aria-label="SHIMA CRAFTへの相談">
              <p className={styles.eyebrow}>Consultation</p>
              <h2>この内容、SHIMA CRAFTで相談できます</h2>
              <p>
                状況がまだ整理できていなくても大丈夫です。現在の管理方法や困っていることから、一緒に整理します。
              </p>
              <BlogContactLink articleSlug={post.slug} className={styles.primaryButton}>
                ホームページ・業務の相談をする
              </BlogContactLink>
            </aside>

            <div className={styles.authorBox}>
              <div>
                <p className={styles.authorLabel}>書いた人</p>
                <p className={styles.authorName}>SHIMA CRAFT</p>
                <p>奄美大島を拠点に、Web制作・業務整理・写真や空撮を行っています。</p>
              </div>
              <Link href="/about" className={styles.textLink}>
                Aboutを見る <span aria-hidden="true">→</span>
              </Link>
            </div>

            {relatedPosts.length > 0 && (
              <section className={styles.relatedSection} aria-labelledby="related-title">
                <div className={styles.sectionHeadingRow}>
                  <div>
                    <p className={styles.eyebrow}>Related</p>
                    <h2 id="related-title" className={styles.sectionTitle}>
                      関連記事
                    </h2>
                  </div>
                </div>
                <div className={styles.relatedGrid}>
                  {relatedPosts.map((related) => (
                    <BlogCard key={related.id} post={related} compact />
                  ))}
                </div>
              </section>
            )}
          </div>
        </article>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(articleJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbJsonLd) }}
        />
      </main>
      <Footer />
      <StickyContact />
    </>
  );
}
