/**
 * Use-case landing pages — segment-specific marketing surfaces.
 *
 * Each entry curates a subset of features from featuresData and frames
 * them around ONE audience's specific pain. Lives at /for/<slug>.
 */

import type { FeatureCatalogEntry } from "@/lib/featuresData";
import { FEATURES } from "@/lib/featuresData";

export interface UseCase {
  slug: string;
  audience_label: string;        // "Marketing agencies"
  hero_h1: string;               // outcome-driven
  hero_pain: string;             // their specific pain
  hero_emoji: string;
  pain_bullets: string[];        // 3-4 specific pains they recognize
  feature_slugs: string[];       // ordered list of relevant features
  metric_strip: { num: string; label: string }[];   // 3-4 numbers
  testimonial_block: { quote: string; attribution: string };
  cta_h2: string;
  seo_keywords: string[];
}

export const USE_CASES: UseCase[] = [
  {
    slug: "agencies",
    audience_label: "Marketing agencies",
    hero_emoji: "🏢",
    hero_h1: "Run 10 client calendars without 10 logins.",
    hero_pain: "Your team is great. Your tools fight you. Stop paying for Buffer + Canva + Loom + ChatGPT + a CRM. One subscription, every client in one workspace, every AI tool included.",
    pain_bullets: [
      "8h/week lost switching between Buffer, Canva, Whisper, and a CRM",
      "Onboarding new accounts takes a full day per client",
      "Each team member uses different AI tools — outputs feel inconsistent",
      "Reporting clients on what worked = 4 spreadsheets and a prayer",
    ],
    feature_slugs: [
      "calendar",
      "campaign",
      "repurpose",
      "ai-image",
      "thumbnail",
      "lead-finder",
      "competitors",
      "webhooks-api",
      "brand-voice",
      "asset-library",
    ],
    metric_strip: [
      { num: "10+",   label: "client workspaces, one login" },
      { num: "8h",    label: "saved per week, per account" },
      { num: "19",    label: "AI features included on Pro" },
      { num: "$0",    label: "extra for Buffer / Canva / Whisper" },
    ],
    testimonial_block: {
      quote: "We replaced 4 tools and dropped our content ops from 14 hours/week to under 4. The brand voice stays consistent across every client.",
      attribution: "— Agency owner, EU (8 employees)",
    },
    cta_h2: "Run your agency on one tool. Try MarketHub Pro free.",
    seo_keywords: [
      "social media tool for agencies",
      "Buffer alternative agencies",
      "AI marketing platform agency",
      "white-label social media management",
    ],
  },
  {
    slug: "creators",
    audience_label: "Solo creators & founders",
    hero_emoji: "🎙️",
    hero_h1: "Post daily. Without becoming a content factory.",
    hero_pain: "You're one person doing the work of a 5-person team. We give you the AI staff: a designer (image), an editor (video), a voice talent (cloning), a copywriter (caption), a strategist (campaign), and an analyst (predictor). All before lunch.",
    pain_bullets: [
      "You can't film 7 videos a week — but the algorithm wants 7",
      "Captions take 30 minutes each because you over-think every line",
      "You'd love your own voice on Reels — but you can't record 30 takes",
      "Your best post is 6 months old and your audience grew 3x since",
    ],
    feature_slugs: [
      "ai-image",
      "ai-video",
      "ai-audio",
      "thumbnail",
      "video-caption",
      "calendar",
      "recycle",
      "hooks",
      "ab-winner",
      "brand-voice",
    ],
    metric_strip: [
      { num: "10s",   label: "voice sample → infinite voiceovers" },
      { num: "5s",    label: "caption + image + hashtags" },
      { num: "7d",    label: "of content batched in 30 min" },
      { num: "1",     label: "tab. No more 14 open browser windows." },
    ],
    testimonial_block: {
      quote: "I went from posting 3x/week to daily without burning out. My voice clone alone saved me 8h of recording per month.",
      attribution: "— Solo creator (45k followers)",
    },
    cta_h2: "Become a one-person content team. Free trial.",
    seo_keywords: [
      "AI tools for content creators",
      "voice cloning for Reels",
      "creator productivity AI",
      "all-in-one creator platform",
    ],
  },
  {
    slug: "brands",
    audience_label: "In-house brand teams",
    hero_emoji: "🏷️",
    hero_h1: "Stay on-brand. Across 5 platforms. Without micro-managing.",
    hero_pain: "Brand consistency at scale is the #1 reason content teams burn out. Set your Brand Voice + Strategy once — every AI feature on the platform respects it. Your team writes faster; your brand sounds like itself.",
    pain_bullets: [
      "Three different writers = three different brand voices",
      "Every social post needs a manager review before publish",
      "Repurposing across IG / LinkedIn / TikTok = 3x the work",
      "Approving 50 image assets/week eats your entire Friday",
    ],
    feature_slugs: [
      "brand-voice",
      "calendar",
      "ai-image",
      "repurpose",
      "ab-winner",
      "asset-library",
      "campaign",
      "hashtag-scan",
      "content-gap",
      "webhooks-api",
    ],
    metric_strip: [
      { num: "1×",    label: "Brand Voice setup → applies everywhere" },
      { num: "5",     label: "platforms, 1 calendar" },
      { num: "100%",  label: "of AI outputs respect your tone" },
      { num: "API",   label: "to wire into your existing CMS / DAM" },
    ],
    testimonial_block: {
      quote: "We finally have a brand voice that survives contractor changes. New writers ship on-brand from day one.",
      attribution: "— Brand lead, B2B SaaS (50+ employees)",
    },
    cta_h2: "Lock in your brand voice. Scale your content team.",
    seo_keywords: [
      "brand voice AI platform",
      "in-house content team tools",
      "enterprise social media management AI",
      "brand consistency AI",
    ],
  },
];

export function getUseCase(slug: string): UseCase | undefined {
  return USE_CASES.find((u) => u.slug === slug);
}

export function resolveFeaturesForUseCase(uc: UseCase): FeatureCatalogEntry[] {
  return uc.feature_slugs
    .map((s) => FEATURES.find((f) => f.slug === s))
    .filter((f): f is FeatureCatalogEntry => Boolean(f));
}
