/**
 * Competitor comparison landing pages — /vs/<competitor>
 *
 * High-intent SEO surface ("buffer alternative", "hootsuite alternative").
 * Each entry frames MarketHub Pro vs ONE established competitor with:
 *   - honest acknowledgement of what they do well (builds trust)
 *   - feature parity table (yes / no / partial)
 *   - 'why people switch' real reasons
 *   - migration path / try-before-leave CTA
 *
 * IMPORTANT: keep claims defensible. If a competitor recently added a
 * feature, mark it accurately. We win on bundling, not on punching down.
 */

export interface ComparisonRow {
  feature: string;        // capability label
  us: "yes" | "no" | "partial";
  them: "yes" | "no" | "partial";
  note?: string;          // optional one-liner clarification
}

export interface Comparison {
  slug: string;                       // /vs/<slug>
  competitor_name: string;            // "Buffer"
  competitor_strength: string;        // 1 sentence — what they're known for
  hero_h1: string;
  hero_pain: string;
  why_switch_bullets: string[];       // 3-5 honest reasons people leave
  feature_table: ComparisonRow[];     // 10-15 rows
  pricing_note: string;               // 1-2 sentences on cost
  migration_help: string;             // what we offer to ease switching
  seo_keywords: string[];
}

export const COMPARISONS: Comparison[] = [
  {
    slug: "buffer",
    competitor_name: "Buffer",
    competitor_strength: "Buffer pioneered social scheduling and is rock-solid for queue-based publishing on a small scale.",
    hero_h1: "Buffer + design + transcription + AI writing in one tool. For less.",
    hero_pain: "Buffer publishes great. But you still need a design tool for visuals, a transcription service for video, an AI writer for captions, and a CRM for leads. We bundle all of that — and you pay one subscription instead of five.",
    why_switch_bullets: [
      "Buffer doesn't generate AI images, video, voiceovers, or thumbnails — you stack 4-5 other tools",
      "AI Assistant on Buffer is text-only and not brand-voice aware across your library",
      "No native A/B testing for captions or AI-driven content campaigns",
      "Their lead/CRM features are non-existent — you sync to HubSpot or stay manual",
    ],
    feature_table: [
      { feature: "Multi-platform scheduling (IG/FB/LinkedIn/X/TikTok)", us: "yes", them: "yes" },
      { feature: "AI image generation (on-brand, multiple aspect ratios)", us: "yes", them: "no" },
      { feature: "AI video generation (text → video)",            us: "yes", them: "no" },
      { feature: "AI audio + voice cloning (your voice)",         us: "yes", them: "no" },
      { feature: "YouTube thumbnail generator",                    us: "yes", them: "no" },
      { feature: "Video → caption (auto-transcript + 5 platforms)", us: "yes", them: "no" },
      { feature: "Caption A/B test winner picker",                us: "yes", them: "no" },
      { feature: "Cross-platform repurposing engine",             us: "yes", them: "partial", note: "Buffer cross-posts; we rewrite per-platform rules" },
      { feature: "Hashtag scanner (rising / saturated buckets)",  us: "yes", them: "no" },
      { feature: "Hook library (save + AI-extract)",              us: "yes", them: "no" },
      { feature: "Brand voice + content strategy that compounds", us: "yes", them: "partial", note: "Buffer's AI Assistant has tone but no strategy layer" },
      { feature: "Lead finder + AI enrichment + lightweight CRM", us: "yes", them: "no" },
      { feature: "Competitor tracker with 24h deltas",            us: "yes", them: "no" },
      { feature: "Public REST API + 10 webhook events",           us: "yes", them: "yes" },
      { feature: "Asset library (DAM with alt-text)",             us: "yes", them: "partial" },
    ],
    pricing_note: "Buffer Essentials starts ~$6/channel/month and Team plans climb to $120+. MarketHub Pro is one flat plan that includes every AI feature on this page.",
    migration_help: "We export your scheduled queue as CSV. Upload it to MarketHub in 30 seconds — no link rebuild needed.",
    seo_keywords: [
      "Buffer alternative", "Buffer vs MarketHub", "Buffer with AI", "all-in-one social tool",
    ],
  },
  {
    slug: "hootsuite",
    competitor_name: "Hootsuite",
    competitor_strength: "Hootsuite has deep enterprise integrations and team-permissions infrastructure built over 15+ years.",
    hero_h1: "Get Hootsuite's planning. Plus the AI it doesn't have.",
    hero_pain: "Hootsuite is a planning powerhouse. It's also expensive, dated, and AI-sparse. We give you their best (multi-platform scheduling, team workflows) plus 19 AI features — at a fraction of the cost.",
    why_switch_bullets: [
      "Hootsuite Professional starts $99/mo — and AI add-ons are extra",
      "Their AI is bolted on; ours is woven through every screen (image, video, audio, captions, hashtags, hooks, leads…)",
      "No voice cloning, no AI video generation, no thumbnail generator — those are separate purchases",
      "Reporting is great but the daily workflow involves 3-5 dashboards",
    ],
    feature_table: [
      { feature: "Multi-platform scheduling",                      us: "yes", them: "yes" },
      { feature: "Team workflows + approvals",                     us: "partial", them: "yes", note: "Hootsuite leads on enterprise approvals; we have multi-seat" },
      { feature: "AI image generation",                            us: "yes", them: "partial", note: "Add-on, limited resolutions" },
      { feature: "AI video generation",                            us: "yes", them: "no" },
      { feature: "Voice cloning",                                  us: "yes", them: "no" },
      { feature: "YouTube thumbnail generator",                    us: "yes", them: "no" },
      { feature: "Video → caption pipeline (auto-transcript)",               us: "yes", them: "no" },
      { feature: "Caption A/B winner picker (with rationale)",     us: "yes", them: "no" },
      { feature: "Hashtag scanner with buckets",                   us: "yes", them: "partial" },
      { feature: "Lead finder + enrichment",                       us: "yes", them: "no" },
      { feature: "Competitor tracking",                            us: "yes", them: "yes" },
      { feature: "Public REST API + webhooks",                     us: "yes", them: "yes" },
      { feature: "Brand voice that powers EVERY AI feature",       us: "yes", them: "no" },
      { feature: "Content strategy profile (ICP + clusters)",      us: "yes", them: "no" },
      { feature: "Asset library + DAM",                            us: "yes", them: "yes" },
    ],
    pricing_note: "Hootsuite Professional is $99/mo (1 user). Their AI add-ons stack additional $29-99. MarketHub Pro covers everything in this table for a single flat fee.",
    migration_help: "We import your social handles + scheduled queue. The team workflow setup takes ~10 minutes — Ask Consultant can walk you through.",
    seo_keywords: [
      "Hootsuite alternative", "Hootsuite vs MarketHub", "cheaper Hootsuite", "AI Hootsuite alternative",
    ],
  },
  {
    slug: "later",
    competitor_name: "Later",
    competitor_strength: "Later is excellent for visual planning, especially for Instagram-first creators and small brands.",
    hero_h1: "Later's visual calendar. Plus the AI to fill it.",
    hero_pain: "Later's grid preview is beautiful — but staring at empty slots is the actual problem. We pair a powerful calendar with AI that generates the image, writes the caption, picks the hashtags, and predicts engagement before you publish.",
    why_switch_bullets: [
      "Later doesn't generate AI images or video — you still open Canva or hire a designer",
      "Caption AI is basic (templated suggestions, not brand-voice-aware)",
      "No A/B testing, no content gap analyzer, no hook library, no lead finder",
      "Pricing climbs fast once you add platforms or users",
    ],
    feature_table: [
      { feature: "Instagram-first visual calendar",               us: "yes", them: "yes" },
      { feature: "Multi-platform publishing",                     us: "yes", them: "yes" },
      { feature: "AI image generation (on-brand)",                us: "yes", them: "no" },
      { feature: "AI video generation",                           us: "yes", them: "no" },
      { feature: "Voice cloning + AI audio",                      us: "yes", them: "no" },
      { feature: "Video → caption pipeline (auto-transcript)",              us: "yes", them: "no" },
      { feature: "Caption A/B winner",                            us: "yes", them: "no" },
      { feature: "Hashtag scanner with rising/saturated buckets", us: "yes", them: "partial" },
      { feature: "Cross-platform repurposing per platform rules", us: "yes", them: "no" },
      { feature: "Hook library + AI extraction",                  us: "yes", them: "no" },
      { feature: "Content gap analyzer vs competitors",           us: "yes", them: "no" },
      { feature: "Lead finder + enrichment",                      us: "yes", them: "no" },
      { feature: "Brand voice + content strategy compounding",    us: "yes", them: "no" },
      { feature: "Public REST API + webhooks",                    us: "yes", them: "yes" },
      { feature: "Asset library + alt-text generator",            us: "yes", them: "partial" },
    ],
    pricing_note: "Later Starter starts ~$25/mo per user, scales fast with users + platforms. MarketHub Pro is flat-fee with all 19 AI features included.",
    migration_help: "Export your media + scheduled posts from Later. Drop them into our Asset Library and Calendar in one go.",
    seo_keywords: [
      "Later alternative", "Later vs MarketHub", "Later with AI", "Instagram scheduler AI",
    ],
  },
];

export function getComparison(slug: string): Comparison | undefined {
  return COMPARISONS.find((c) => c.slug === slug);
}
