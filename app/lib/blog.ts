import { cache } from "react";

const MICROCMS_API_ORIGIN = "microcms.io";
const DEFAULT_REVALIDATE_SECONDS = 60;
const MICROCMS_MAX_LIMIT = 100;

export type MicroCMSImage = {
  url: string;
  height: number;
  width: number;
};

export type BlogCategory = {
  id: string;
  name: string;
  slug: string;
  color: string;
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string;
  revisedAt?: string;
};

export type BlogPostSummary = {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: BlogCategory;
  eyecatch?: MicroCMSImage;
  publishedAt: string;
  updatedAt: string;
};

export type BlogPost = BlogPostSummary & {
  body: string;
  isPR?: boolean;
  needsAnnualReview?: boolean;
  relatedArticles?: BlogPostSummary[];
  createdAt?: string;
  revisedAt?: string;
};

export type BlogListResult = {
  contents: BlogPostSummary[];
  totalCount: number;
  offset: number;
  limit: number;
};

type MicroCMSListResponse<T> = {
  contents: T[];
  totalCount: number;
  offset: number;
  limit: number;
};

type GetBlogPostsOptions = {
  limit?: number;
  offset?: number;
  categorySlug?: string;
};

function getMicroCMSConfig() {
  const serviceDomain = process.env.MICROCMS_SERVICE_DOMAIN?.trim();
  const apiKey = process.env.MICROCMS_API_KEY?.trim();

  if (!serviceDomain || !apiKey) {
    return null;
  }

  if (!/^[a-z0-9-]+$/i.test(serviceDomain)) {
    throw new Error("MICROCMS_SERVICE_DOMAIN の形式が不正です。");
  }

  return { serviceDomain, apiKey };
}

export function isMicroCMSConfigured() {
  return getMicroCMSConfig() !== null;
}

async function requestMicroCMS<T>(
  endpoint: string,
  queries: Record<string, string | number | undefined> = {},
  options: { draftKey?: string; revalidate?: number } = {},
): Promise<T | null> {
  const config = getMicroCMSConfig();
  if (!config) return null;

  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(queries)) {
    if (value !== undefined && value !== "") {
      searchParams.set(key, String(value));
    }
  }
  if (options.draftKey) {
    searchParams.set("draftKey", options.draftKey);
  }

  const queryString = searchParams.toString();
  const url = `https://${config.serviceDomain}.${MICROCMS_API_ORIGIN}/api/v1/${endpoint}${
    queryString ? `?${queryString}` : ""
  }`;

  const response = await fetch(url, {
    headers: { "X-MICROCMS-API-KEY": config.apiKey },
    next: {
      revalidate: options.revalidate ?? DEFAULT_REVALIDATE_SECONDS,
      tags: ["microcms-blog"],
    },
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `microCMS API error: ${response.status} ${response.statusText}${
        detail ? ` / ${detail.slice(0, 200)}` : ""
      }`,
    );
  }

  return (await response.json()) as T;
}

export const getBlogCategories = cache(async (): Promise<BlogCategory[]> => {
  try {
    const response = await requestMicroCMS<MicroCMSListResponse<BlogCategory>>(
      "categories",
      { limit: MICROCMS_MAX_LIMIT, orders: "createdAt" },
    );
    return response?.contents ?? [];
  } catch (error) {
    console.error("[blog] categories fetch failed", error);
    return [];
  }
});

export async function getBlogPosts(
  options: GetBlogPostsOptions = {},
): Promise<BlogListResult> {
  const limit = Math.min(Math.max(options.limit ?? 12, 1), MICROCMS_MAX_LIMIT);
  const offset = Math.max(options.offset ?? 0, 0);

  try {
    let filters: string | undefined;
    if (options.categorySlug) {
      const categories = await getBlogCategories();
      const category = categories.find((item) => item.slug === options.categorySlug);
      if (!category) {
        return { contents: [], totalCount: 0, offset, limit };
      }
      filters = `category[equals]${category.id}`;
    }

    const response = await requestMicroCMS<MicroCMSListResponse<BlogPostSummary>>(
      "blog",
      {
        limit,
        offset,
        orders: "-publishedAt",
        depth: 2,
        filters,
        fields:
          "id,title,slug,description,category,eyecatch,publishedAt,updatedAt",
      },
    );

    return (
      response ?? {
        contents: [],
        totalCount: 0,
        offset,
        limit,
      }
    );
  } catch (error) {
    console.error("[blog] list fetch failed", error);
    return { contents: [], totalCount: 0, offset, limit };
  }
}

export async function getBlogPostBySlug(
  slug: string,
  draftKey?: string,
): Promise<BlogPost | null> {
  try {
    const response = await requestMicroCMS<MicroCMSListResponse<BlogPost>>(
      "blog",
      {
        limit: 1,
        depth: 2,
        filters: `slug[equals]${slug}`,
      },
      {
        draftKey,
        revalidate: draftKey ? 0 : DEFAULT_REVALIDATE_SECONDS,
      },
    );

    return response?.contents[0] ?? null;
  } catch (error) {
    console.error(`[blog] detail fetch failed: ${slug}`, error);
    return null;
  }
}

export async function getRelatedBlogPosts(
  post: BlogPost,
  limit = 2,
): Promise<BlogPostSummary[]> {
  const manual = (post.relatedArticles ?? [])
    .filter((item) => item.slug !== post.slug)
    .slice(0, Math.min(limit, 3));

  if (manual.length > 0) return manual;

  try {
    const response = await requestMicroCMS<MicroCMSListResponse<BlogPostSummary>>(
      "blog",
      {
        limit: Math.min(limit + 1, MICROCMS_MAX_LIMIT),
        orders: "-publishedAt",
        depth: 2,
        filters: `category[equals]${post.category.id}`,
        fields:
          "id,title,slug,description,category,eyecatch,publishedAt,updatedAt",
      },
    );

    return (response?.contents ?? [])
      .filter((item) => item.slug !== post.slug)
      .slice(0, limit);
  } catch (error) {
    console.error(`[blog] related fetch failed: ${post.slug}`, error);
    return [];
  }
}

export async function getAllBlogPostsForSitemap(): Promise<BlogPostSummary[]> {
  if (!isMicroCMSConfigured()) return [];

  const all: BlogPostSummary[] = [];
  let offset = 0;
  let totalCount = 0;

  try {
    do {
      const response = await requestMicroCMS<MicroCMSListResponse<BlogPostSummary>>(
        "blog",
        {
          limit: MICROCMS_MAX_LIMIT,
          offset,
          orders: "-publishedAt",
          depth: 2,
          fields:
            "id,title,slug,description,category,eyecatch,publishedAt,updatedAt",
        },
      );

      if (!response) break;
      all.push(...response.contents);
      totalCount = response.totalCount;
      offset += response.limit;
    } while (offset < totalCount);
  } catch (error) {
    console.error("[blog] sitemap fetch failed", error);
  }

  return all;
}

export function formatBlogDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Tokyo",
  }).format(new Date(value));
}

export function enhanceBlogBodyHtml(html: string) {
  return html
    .replace(/<table(\s[^>]*)?>/gi, '<div class="blog-table-scroll"><table$1>')
    .replace(/<\/table>/gi, "</table></div>")
    .replace(/<img(?![^>]*\bloading=)([^>]*)>/gi, '<img loading="lazy" decoding="async"$1>');
}
