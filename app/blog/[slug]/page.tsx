import type { Metadata } from "next";

import { getAllBlogPostsForSitemap } from "@/app/lib/blog";
import { BlogPostContent, buildBlogPostMetadata } from "./BlogPostContent";

export const revalidate = 60;
export const dynamicParams = true;

type BlogDetailPageProps = {
  params: { slug: string };
};

export async function generateStaticParams() {
  const posts = await getAllBlogPostsForSitemap();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: BlogDetailPageProps): Promise<Metadata> {
  return buildBlogPostMetadata(params.slug);
}

export default async function BlogDetailPage({ params }: BlogDetailPageProps) {
  return <BlogPostContent slug={params.slug} />;
}
