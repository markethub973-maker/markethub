/**
 * Single source of truth for all plan limits.
 *
 * Pricing model: monthly subscription with included "Premium AI Actions".
 * Basic AI (Haiku, captions, drafts) is unlimited on every paid plan.
 * Premium Actions (Lead Scoring, Outreach Personalizat, Full Campaign,
 * Marketing Advisor / APEX) are metered per month and reset on the 1st
 * of each month UTC via the consume_premium_action() RPC.
 *
 *   Plan (ID)       Label     Price   Premium Actions/mo   Basic AI
 *   ──────────────────────────────────────────────────────────────────
 *   free_test       Starter   $0      5                    unlimited
 *   lite            Creator   $24     20                   unlimited
 *   pro             Pro       $49     50                   unlimited
 *   business        Studio    $99     200                  unlimited
 *   enterprise      Agency    $249    1000                 unlimited
 *
 * The legacy ai_budget_usd / ai_credits fields are kept for the admin
 * finance dashboard which still tracks raw API spend, but they no longer
 * gate user requests — premium_actions_per_month is the source of truth.
 */

export type PlanId = "free_forever" | "free_test" | "lite" | "pro" | "business" | "enterprise";

export interface PlanConfig {
  id: PlanId;
  name: string;
  price: number;           // $/month
  premium_actions_per_month: number;  // -1 = unlimited
  premium_action_model: string;       // Anthropic model used for the 4 premium routes
  ai_budget_usd: number;   // legacy — admin finance tracking only
  ai_credits: number;      // legacy — admin finance tracking only
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
  free_forever: {
    id: "free_forever",
    name: "Free",
    price: 0,
    premium_actions_per_month: 0,
    premium_action_model: "claude-haiku-4-5-20251001",
    ai_budget_usd: 0.5,
    ai_credits: 500,
    tracked_channels: 1,
    instagram_accounts: 1,
    tiktok_accounts: 0,
    competitor_brands: 1,
    ai_captions_month: 10,
    team_members: 0,
    client_accounts: 0,
    pdf_reports_month: 0,
    history_days: 7,
    has_calendar: false,
    has_tiktok: false,
    has_api_access: false,
    has_white_label: false,
    has_priority_support: false,
    sla_uptime: null,
  },

  free_test: {
    id: "free_test",
    name: "Starter",
    price: 0,
    premium_actions_per_month: 5,
    premium_action_model: "claude-haiku-4-5-20251001",
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
    history_days: 14,
    has_calendar: true,
    has_tiktok: true,
    has_api_access: false,
    has_white_label: false,
    has_priority_support: false,
    sla_uptime: null,
  },

  lite: {
    id: "lite",
    name: "Creator",
    price: 24,
    premium_actions_per_month: 20,
    premium_action_model: "claude-haiku-4-5-20251001",
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
    premium_actions_per_month: 50,
    premium_action_model: "claude-sonnet-4-6",
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
    name: "Studio",
    price: 99,
    premium_actions_per_month: 200,
    premium_action_model: "claude-sonnet-4-6",
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
    name: "Agency",
    price: 249,
    premium_actions_per_month: 1000,
    premium_action_model: "claude-sonnet-4-6",
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
