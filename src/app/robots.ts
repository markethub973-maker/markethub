import type { MetadataRoute } from "next";

const SITE = "https://markethubpromo.com";

// Next.js App Router generates /robots.txt from this export.
// Strategy: allow indexing of public marketing/legal pages, explicitly
// disallow everything else so crawlers don't waste budget on /dashboard,
// /api/*, /markethub973, and all authenticated pages that redirect to /login.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/promo",
          "/pricing",
          "/login",
          "/register",
          "/privacy",
          "/terms",
          "/blocked",
          "/upgrade-required",
          "/l/",        // bio-link public pages
          "/portal/",   // client portal public pages
          "/approve/",  // client approval public pages
          "/report/",   // shared report public pages
        ],
        disallow: [
          "/api/",
          "/dashboard/",
          "/markethub973",
          "/admin/",
          "/settings",
          "/upgrade",    // authenticated upgrade flow, not the marketing pricing page
          "/ai-hub",
          "/calendar",
          "/instagram",
          "/tiktok",
          "/youtube",
          "/linkedin",
          "/clients",
          "/influencers",
          "/leads",
          "/campaigns",
          "/research",
          "/lead-finder",
          "/team",
          "/assets",
          "/integrations",
          "/hashtags",
          "/captions",
          "/competitors",
          "/trending-alerts",
          "/social-listening",
          "/proposals",
          "/time-tracking",
          "/referral",
          "/roi-calculator",
          "/email-campaigns",
          "/email-reports",
          "/affiliate",
          "/alerts",
          "/monthly-report",
          "/api-keys",
          "/white-label",
          "/news",
          "/trends",
          "/videos",
          "/channels",
          "/my-channel",
          "/meta-insights",
          "/demographics",
          "/instagram-search",
          "/ads-library",
        ],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
