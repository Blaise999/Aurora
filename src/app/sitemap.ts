import type { MetadataRoute } from "next";

const BASE = "https://www.auroranft.art";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date().toISOString();

  return [
    { url: BASE, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE}/explore`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/mint`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/create`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/news`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${BASE}/login`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE}/signup`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];
}
