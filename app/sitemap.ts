import type { MetadataRoute } from "next";
import { site } from "@/app/lib/site";
import {
  amamiGreetings,
  amamiProverbs,
  amamiWords,
  wordCategories,
  wordRegions,
} from "@/app/lib/amamiDialect";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date("2026-07-01T00:00:00+09:00");
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: site.url,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${site.url}/system-samples`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${site.url}/services`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${site.url}/service/web-design`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${site.url}/industry/tourism`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${site.url}/web-check`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${site.url}/tools/photo-colorize`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${site.url}/nagino-yado-lp/`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${site.url}/amami-dialect`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${site.url}/amami-dialect/proverbs`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${site.url}/amami-dialect/greetings`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${site.url}/amami-dialect/words`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${site.url}/amami-dialect/search`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${site.url}/amami-dialect/about`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.5,
    },
    {
      url: `${site.url}/privacy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  const proverbRoutes: MetadataRoute.Sitemap = amamiProverbs.map((record) => ({
    url: `${site.url}/amami-dialect/proverbs/${record.id}`,
    lastModified: now,
    changeFrequency: "yearly",
    priority: 0.4,
  }));

  const greetingRoutes: MetadataRoute.Sitemap = amamiGreetings.map((record) => ({
    url: `${site.url}/amami-dialect/greetings/${record.id}`,
    lastModified: now,
    changeFrequency: "yearly",
    priority: 0.4,
  }));

  const wordCategoryRoutes: MetadataRoute.Sitemap = wordCategories.map((category) => ({
    url: `${site.url}/amami-dialect/words/category/${category.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  const wordRoutes: MetadataRoute.Sitemap = amamiWords.map((record) => ({
    url: `${site.url}/amami-dialect/words/${record.id}`,
    lastModified: now,
    changeFrequency: "yearly",
    priority: 0.4,
  }));

  const regionRoutes: MetadataRoute.Sitemap = wordRegions.map((region) => ({
    url: `${site.url}/amami-dialect/regions/${region.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [
    ...staticRoutes,
    ...proverbRoutes,
    ...greetingRoutes,
    ...wordCategoryRoutes,
    ...wordRoutes,
    ...regionRoutes,
  ];
}
