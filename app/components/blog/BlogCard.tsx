import Link from "next/link";

import type { BlogPostSummary } from "@/app/lib/blog";
import { formatBlogDate } from "@/app/lib/blog";

import styles from "@/app/blog/blog.module.css";
import { BlogImage } from "./BlogImage";

type BlogCardProps = {
  post: BlogPostSummary;
  compact?: boolean;
};

export function BlogCard({ post, compact = false }: BlogCardProps) {
  const TitleTag = compact ? "h3" : "h2";

  return (
    <article className={`${styles.card} ${compact ? styles.cardCompact : ""}`}>
      <Link href={`/blog/${post.slug}`} className={styles.cardImageLink}>
        <BlogImage image={post.eyecatch} alt={post.title} />
      </Link>
      <div className={styles.cardBody}>
        <div className={styles.cardMeta}>
          <span
            className={styles.categoryLabel}
            style={{ "--category-color": post.category.color } as React.CSSProperties}
          >
            {post.category.name}
          </span>
          <time dateTime={post.publishedAt}>{formatBlogDate(post.publishedAt)}</time>
        </div>
        <TitleTag className={styles.cardTitle}>
          <Link href={`/blog/${post.slug}`}>{post.title}</Link>
        </TitleTag>
        {!compact && <p className={styles.cardDescription}>{post.description}</p>}
      </div>
    </article>
  );
}
