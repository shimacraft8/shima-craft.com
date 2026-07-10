import Link from "next/link";

import { BlogCard } from "@/app/components/blog/BlogCard";
import { getBlogPosts } from "@/app/lib/blog";

import styles from "@/app/blog/blog.module.css";

export async function LatestArticles() {
  const { contents } = await getBlogPosts({ limit: 3 });
  if (contents.length === 0) return null;

  return (
    <section className={styles.latestSection} aria-labelledby="latest-articles-title">
      <div className={styles.container}>
        <div className={styles.sectionHeadingRow}>
          <div>
            <p className={styles.eyebrow}>Journal</p>
            <h2 id="latest-articles-title" className={styles.sectionTitle}>
              最新の記事
            </h2>
            <p className={styles.sectionLead}>
              小さな事業の集客、予約管理、写真・空撮について、実務に近い言葉でまとめています。
            </p>
          </div>
          <Link href="/blog" className={styles.textLink}>
            すべて見る <span aria-hidden="true">→</span>
          </Link>
        </div>
        <div className={styles.cardGrid}>
          {contents.map((post) => (
            <BlogCard key={post.id} post={post} compact />
          ))}
        </div>
      </div>
    </section>
  );
}
