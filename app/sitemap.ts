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
  ];
}
