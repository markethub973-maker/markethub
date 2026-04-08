/**
 * Single source of truth for all plan limits.
 *
 * AI Budget logic — Enterprise $249 = $60 AI cap (24.1% of price).
 * All other plans scaled proportionally so limits are honest/fair.
 *
 *   Plan       Price   AI Budget   Ratio
 *   ──────────────────────────────────────
 *   lite       $24     $6          25.0%
 *   pro        $49     $12         24.5%
 *   business   $99     $24         24.2%
 *   enterprise $249    $60         24.1%  ← reference
 */

export type PlanId = "free_test" | "lite" | "pro" | "business" | "enterprise";

export interface PlanConfig {
  id: PlanId;
  name: string;
  price: number;           // $/month
  ai_budget_usd: number;   // max Claude API spend per month ($)
  ai_credits: number;      // display credits (1 credit = $0.001)
  tracked_channels: number;
  instagram_accounts: number;
  tiktok_accounts: number;
  competitor_brands: number;
  ai_captions_month: number;   // max caption sets per month
  team_members: number;
  client_accounts: number;
  pdf_reports_month: number;   // -1 = unlimited
  history_days: number;
  has_calendar: boolean;
  has_tiktok: boolean;
  has_api_access: boolean;
  has_white_label: boolean;
  has_priority_support: boolean;
  sla_uptime: number | null;   // % or null
}

export const PLANS: Record<PlanId, PlanConfig> = {
  free_test: {
    id: "free_test",
    name: "Free Trial",
    price: 0,
    ai_budget_usd: 1,
    ai_credits: 1_000,
    tracked_channels: 3,
    instagram_accounts: 1,
    tiktok_accounts: 1,
    competitor_brands: 2,
    ai_captions_month: 20,
    team_members: 1,
    client_accounts: 1,
    pdf_reports_month: 3,
    history_days: 7,
    has_calendar: true,
    has_tiktok: true,
    has_api_access: false,
    has_white_label: false,
    has_priority_support: false,
    sla_uptime: null,
  },

  lite: {
    id: "lite",
    name: "Lite",
    price: 24,
    ai_budget_usd: 6,
    ai_credits: 6_000,
    tracked_channels: 12,
    instagram_accounts: 2,
    tiktok_accounts: 2,
    competitor_brands: 8,
    ai_captions_month: 200,
    team_members: 2,
    client_accounts: 2,
    pdf_reports_month: 10,
    history_days: 90,
    has_calendar: true,
    has_tiktok: true,
    has_api_access: false,
    has_white_label: false,
    has_priority_support: false,
    sla_uptime: null,
  },

  pro: {
    id: "pro",
    name: "Pro",
    price: 49,
    ai_budget_usd: 12,
    ai_credits: 12_000,
    tracked_channels: 30,
    instagram_accounts: 4,
    tiktok_accounts: 4,
    competitor_brands: 20,
    ai_captions_month: 600,
    team_members: 3,
    client_accounts: 5,
    pdf_reports_month: 25,
    history_days: 365,
    has_calendar: true,
    has_tiktok: true,
    has_api_access: false,
    has_white_label: false,
    has_priority_support: true,
    sla_uptime: null,
  },

  business: {
    id: "business",
    name: "Business",
    price: 99,
    ai_budget_usd: 24,
    ai_credits: 24_000,
    tracked_channels: 100,
    instagram_accounts: 10,
    tiktok_accounts: 10,
    competitor_brands: 50,
    ai_captions_month: 2_000,
    team_members: 5,
    client_accounts: 20,
    pdf_reports_month: -1,
    history_days: 730,
    has_calendar: true,
    has_tiktok: true,
    has_api_access: true,
    has_white_label: false,
    has_priority_support: true,
    sla_uptime: 99.5,
  },

  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    price: 249,
    ai_budget_usd: 60,       // ← hard cap, extra credits purchaseable
    ai_credits: 60_000,
    tracked_channels: -1,    // unlimited
    instagram_accounts: -1,
    tiktok_accounts: -1,
    competitor_brands: -1,
    ai_captions_month: -1,
    team_members: -1,
    client_accounts: -1,
    pdf_reports_month: -1,
    history_days: -1,
    has_calendar: true,
    has_tiktok: true,
    has_api_access: true,
    has_white_label: true,
    has_priority_support: true,
    sla_uptime: 99.9,
  },
};

/** Credit packs users can purchase to extend AI budget */
export const CREDIT_PACKS = [
  { id: "credits_10",  label: "$10 AI Credits",  usd: 10, credits: 10_000, bonus_pct: 0  },
  { id: "credits_25",  label: "$25 AI Credits",  usd: 25, credits: 27_500, bonus_pct: 10 },
  { id: "credits_50",  label: "$50 AI Credits",  usd: 50, credits: 57_500, bonus_pct: 15 },
  { id: "credits_100", label: "$100 AI Credits", usd: 100, credits: 120_000, bonus_pct: 20 },
];

/** Cost in USD per AI action (used for budget tracking) */
export const AI_ACTION_COSTS = {
  caption_set:          0.025,   // 3 captions via Sonnet
  agent_message_haiku:  0.001,   // Support agent (Haiku)
  agent_message_sonnet: 0.035,   // Research/Email/Financial agents (Sonnet)
  pdf_report:           0.08,    // Full report generation
  ai_analysis:          0.02,    // Quick analysis
  sentiment_analysis:   0.03,    // Comment sentiment analysis
  ab_titles:            0.02,    // A/B title generator (10 variants)
  monthly_report:       0.10,    // Full monthly AI report
  weekly_digest:        0.04,    // Weekly digest email content
  comment_faq:          0.05,    // Comment FAQ extraction + content ideas
  category_analysis:    0.03,    // Category performance AI analysis
  playlist_strategy:    0.03,    // Playlist strategy AI analysis
} as const;

export type AIAction = keyof typeof AI_ACTION_COSTS;

/** Returns the plan config for a given plan id, defaulting to free_test */
export function getPlanConfig(planId: string | null | undefined): PlanConfig {
  return PLANS[(planId as PlanId) ?? "free_test"] ?? PLANS.free_test;
}

/** Returns remaining AI budget in USD for the current month */
export function getRemainingBudget(
  planBudget: number,
  spentUsd: number,
  extraCreditsUsd: number = 0
): number {
  return Math.max(0, planBudget + extraCreditsUsd - spentUsd);
}

/** Returns usage percentage (0-100) */
export function getUsagePct(spent: number, budget: number): number {
  if (budget <= 0) return 0;
  return Math.min(100, Math.round((spent / budget) * 100));
}
