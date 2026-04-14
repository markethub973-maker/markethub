import type { MetadataRoute } from "next";

const SITE = "https://markethubpromo.com";

// Next.js App Router generates /sitemap.xml from this export.
// Only list public pages — authenticated routes (/dashboard, /calendar, etc.)
// redirect to /login for crawlers and should NOT be in the sitemap.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    {
      url: `${SITE}/promo`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0, // canonical landing page
    },
    {
      url: `${SITE}/pricing`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE}/register`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${SITE}/help`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${SITE}/changelog`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${SITE}/api/docs`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${SITE}/status`,
      lastModified: now,
      changeFrequency: "always",
      priority: 0.4,
    },
    {
      url: `${SITE}/privacy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE}/terms`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    // NOTE: /login intentionally NOT included — robots: noindex per SEO
    // metadata. Crawlers find it via direct links if needed.
  ];
}
