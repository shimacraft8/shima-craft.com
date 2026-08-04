import type { Metadata } from "next";

import { BlogPostContent, buildBlogPostMetadata } from "../BlogPostContent";

// searchParams(draftKey)を使う下書きプレビュー専用ルート。generateStaticParamsを
// 持たないため常に動的レンダリングになり、公開用の /blog/[slug]（静的生成）と
// 衝突しない。理由はBlogPostContent.tsxの冒頭コメントを参照。

type PreviewPageProps = {
  params: { slug: string };
  searchParams?: { draftKey?: string | string[] };
};

function first(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({
  params,
  searchParams,
}: PreviewPageProps): Promise<Metadata> {
  const draftKey = first(searchParams?.draftKey);
  const metadata = await buildBlogPostMetadata(params.slug, draftKey);
  return { ...metadata, robots: { index: false, follow: false } };
}

export default async function BlogPreviewPage({ params, searchParams }: PreviewPageProps) {
  const draftKey = first(searchParams?.draftKey);
  return <BlogPostContent slug={params.slug} draftKey={draftKey} />;
}
