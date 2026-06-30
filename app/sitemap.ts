import type { MetadataRoute } from "next";
import { site } from "@/app/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: site.url,
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${site.url}/system-samples`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${site.url}/services`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${site.url}/service/web-design`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${site.url}/industry/tourism`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${site.url}/web-check`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${site.url}/privacy`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
