/**
 * Token-Based AI Pricing System
 *
 * BUSINESS MODEL:
 * - Users pay for ACTUAL token consumption (per-usage)
 * - Each plan includes monthly token allowance
 * - Extra tokens can be recharged at discounted rates
 * - Transparent pricing: users see exactly what they're paying for
 *
 * TOKEN COSTS (based on Claude API pricing):
 * - 1 Input token = ~$0.000003 (claude-3-5-sonnet)
 * - 1 Output token = ~$0.000015
 *
 * TYPICAL USAGE:
 * - Caption generation: 800 tokens → ~$0.012
 * - Competitor analysis: 2,000 tokens → ~$0.030
 * - PDF report: 5,000 tokens → ~$0.075
 * - Agent chat message: 10,000 tokens → ~$0.150
 * - Daily agent automation: 50,000 tokens → $0.75/day ($22.50/month)
 * - Intensive agent bulk: 500,000 tokens → $7.50/day ($225/month)
 */

export type PlanId = "free_test" | "starter" | "lite" | "pro" | "business" | "enterprise";

export interface TokenPlanConfig {
  id: PlanId;
  name: string;
  price: number;                    // $/month subscription
  included_tokens_month: number;    // monthly token allowance
  extra_token_cost: number;         // $ per 1000 tokens (overage rate)
  max_monthly_tokens: number;       // hard cap (-1 = unlimited)
  token_recharge_packs: RechargeType[];

  // Other features
  tracked_channels: number;
  instagram_accounts: number;
  tiktok_accounts: number;
  competitor_brands: number;
  team_members: number;
  client_accounts: number;
  history_days: number;
  has_calendar: boolean;
  has_tiktok: boolean;
  has_api_access: boolean;
  has_white_label: boolean;
  has_priority_support: boolean;
  sla_uptime: number | null;
}

export interface RechargeType {
  id: string;
  tokens: number;
  price: number;
  bonus_pct: number;  // 0 = no bonus, 10 = 10% bonus tokens
}

export const TOKEN_PLANS: Record<PlanId, TokenPlanConfig> = {
  free_test: {
    id: "free_test",
    name: "Free Trial",
    price: 0,
    included_tokens_month: 1_000,        // ~83 captions
    extra_token_cost: 0.0015,            // $1.50 per 1000 tokens
    max_monthly_tokens: 1_000,           // Hard cap, no recharge
    token_recharge_packs: [],            // Cannot recharge
    tracked_channels: 3,
    instagram_accounts: 1,
    tiktok_accounts: 1,
    competitor_brands: 2,
    team_members: 1,
    client_accounts: 1,
    history_days: 7,
    has_calendar: false,
    has_tiktok: true,    // ✓ TikTok basic (50 calls/day limit)
    has_api_access: false,
    has_white_label: false,
    has_priority_support: false,
    sla_uptime: null,
  },

  starter: {
    id: "starter",
    name: "Starter",
    price: 14,                           // ↑ from $9 — now includes Calendar + TikTok
    included_tokens_month: 15_000,       // ↑ from 10K — ~1,250 captions
    extra_token_cost: 0.0010,            // $1.00 per 1000 tokens
    max_monthly_tokens: -1,              // Unlimited, but pay per token
    token_recharge_packs: [
      { id: "starter_tokens_15k",  tokens: 15_000,  price: 18,  bonus_pct: 0  },
      { id: "starter_tokens_30k",  tokens: 30_000,  price: 35,  bonus_pct: 10 },
      { id: "starter_tokens_60k",  tokens: 60_000,  price: 65,  bonus_pct: 15 },
    ],
    tracked_channels: 5,                 // ↑ from 3
    instagram_accounts: 1,
    tiktok_accounts: 1,                  // ↑ from 0 — TikTok now included
    competitor_brands: 3,                // ↑ from 2
    team_members: 1,
    client_accounts: 1,
    history_days: 30,
    has_calendar: true,                  // ✓ Calendar now included in Starter
    has_tiktok: true,                    // ✓ TikTok now included in Starter
    has_api_access: false,
    has_white_label: false,
    has_priority_support: false,
    sla_uptime: null,
  },

  lite: {
    id: "lite",
    name: "Lite",
    price: 24,                           // ↑ from $19 — maintains clear gap over Starter
    included_tokens_month: 60_000,       // ↑ from 50K — ~5,000 captions
    extra_token_cost: 0.0009,            // $0.90 per 1000 tokens
    max_monthly_tokens: -1,              // Unlimited
    token_recharge_packs: [
      { id: "lite_tokens_30k",   tokens: 30_000,  price: 25,  bonus_pct: 0  },
      { id: "lite_tokens_60k",   tokens: 60_000,  price: 50,  bonus_pct: 10 },
      { id: "lite_tokens_120k",  tokens: 120_000, price: 95,  bonus_pct: 15 },
      { id: "lite_tokens_300k",  tokens: 300_000, price: 220, bonus_pct: 20 },
    ],
    tracked_channels: 12,                // ↑ from 10
    instagram_accounts: 2,               // ↑ from 1
    tiktok_accounts: 2,                  // ↑ from 1
    competitor_brands: 8,                // ↑ from 5
    team_members: 2,                     // ↑ from 1
    client_accounts: 2,                  // ↑ from 1
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
    price: 49,                           // ↑ from $39 — Lead Finder now included
    included_tokens_month: 150_000,      // ~12,500 captions
    extra_token_cost: 0.0008,            // $0.80 per 1000 tokens
    max_monthly_tokens: -1,              // Unlimited
    token_recharge_packs: [
      { id: "pro_tokens_50k",    tokens: 50_000,   price: 38,  bonus_pct: 0  },
      { id: "pro_tokens_100k",   tokens: 100_000,  price: 78,  bonus_pct: 10 },
      { id: "pro_tokens_250k",   tokens: 250_000,  price: 185, bonus_pct: 15 },
      { id: "pro_tokens_500k",   tokens: 500_000,  price: 360, bonus_pct: 20 },
    ],
    tracked_channels: 30,                // ↑ from 25
    instagram_accounts: 4,               // ↑ from 3
    tiktok_accounts: 4,                  // ↑ from 3
    competitor_brands: 20,               // ↑ from 15
    team_members: 3,                     // ↑ from 2
    client_accounts: 5,                  // ↑ from 3
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
    included_tokens_month: 500_000,
    extra_token_cost: 0.0007,
    max_monthly_tokens: -1,
    token_recharge_packs: [
      { id: "bus_tokens_100k",   tokens: 100_000,  price: 60,  bonus_pct: 0  },
      { id: "bus_tokens_250k",   tokens: 250_000,  price: 165, bonus_pct: 10 },
      { id: "bus_tokens_500k",   tokens: 500_000,  price: 320, bonus_pct: 15 },
      { id: "bus_tokens_1m",     tokens: 1_000_000, price: 600, bonus_pct: 20 },
    ],
    tracked_channels: 100,
    instagram_accounts: 10,
    tiktok_accounts: 10,
    competitor_brands: 25,
    team_members: 2,
    client_accounts: 10,
    history_days: 365,
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
    included_tokens_month: 1_500_000,
    extra_token_cost: 0.0006,
    max_monthly_tokens: -1,
    token_recharge_packs: [
      { id: "ent_tokens_250k",   tokens: 250_000,  price: 140, bonus_pct: 0  },
      { id: "ent_tokens_500k",   tokens: 500_000,  price: 280, bonus_pct: 10 },
      { id: "ent_tokens_1m",     tokens: 1_000_000, price: 540, bonus_pct: 15 },
      { id: "ent_tokens_2m",     tokens: 2_000_000, price: 1000, bonus_pct: 20 },
    ],
    tracked_channels: -1,
    instagram_accounts: -1,
    tiktok_accounts: -1,
    competitor_brands: 50,
    team_members: 5,
    client_accounts: 20,
    history_days: 730,
    has_calendar: true,
    has_tiktok: true,
    has_api_access: true,
    has_white_label: true,
    has_priority_support: true,
    sla_uptime: 99.9,
  },
};

/**
 * TOKEN COSTS FOR DIFFERENT ACTIONS
 * Based on typical Claude API usage
 */
export const TOKEN_COSTS = {
  caption_set: 800,                // 3 captions via Claude
  ai_analysis: 2_000,              // Competitor/product analysis
  pdf_report: 5_000,               // Full PDF report generation
  agent_message_haiku: 5_000,      // Support agent message
  agent_message_sonnet: 10_000,    // Research/Email/Financial agent
  email_campaign: 8_000,           // Email campaign generation
  hashtag_analysis: 3_000,         // Hashtag research & recommendations
  trend_analysis: 6_000,           // Trend analysis report
  lead_wizard_analyze: 2_000,      // AI source + keyword suggestions (step 3)
  lead_wizard_score: 4_000,        // AI batch scoring of prospects (step 4)
  lead_wizard_message: 1_500,      // AI outreach message generation (step 5)
} as const;

export type TokenAction = keyof typeof TOKEN_COSTS;

/**
 * Get plan configuration
 */
export function getTokenPlan(planId: string | null | undefined): TokenPlanConfig {
  return TOKEN_PLANS[(planId as PlanId) ?? "free_test"] ?? TOKEN_PLANS.free_test;
}

/**
 * Calculate token cost for an action
 */
export function getTokenCost(action: TokenAction): number {
  return TOKEN_COSTS[action] ?? 0;
}

/**
 * Calculate remaining tokens for user
 */
export function getRemainingTokens(
  planTokens: number,
  usedTokens: number,
  extraTokensPurchased: number = 0
): number {
  return Math.max(0, planTokens + extraTokensPurchased - usedTokens);
}

/**
 * Calculate token usage percentage
 */
export function getTokenUsagePct(used: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((used / total) * 100));
}

/**
 * Calculate cost of overage tokens
 */
export function calculateOverageCost(
  overageTokens: number,
  extraTokenCostPer1k: number
): number {
  return (overageTokens / 1000) * extraTokenCostPer1k;
}

/**
 * Get recharge packs for a plan
 */
export function getRechargePacks(planId: string | null | undefined) {
  const plan = getTokenPlan(planId);
  return plan.token_recharge_packs;
}
