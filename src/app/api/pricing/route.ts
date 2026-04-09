import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { PLANS } from "@/lib/plan-config";
import { TOKEN_PLANS } from "@/lib/token-plan-config";

// Public endpoint — no auth required
export async function GET() {
  const svc = createServiceClient();

  // Fetch admin-configured prices (may override defaults)
  let savedPrices: Record<string, number> = {};
  try {
    const { data } = await svc
      .from("admin_platform_config")
      .select("extra_data")
      .eq("platform", "plan_prices")
      .single();
    if (data?.extra_data) savedPrices = data.extra_data as Record<string, number>;
  } catch { /* use defaults */ }

  const PLAN_IDS = ["free_test", "lite", "pro", "business", "enterprise"] as const;

  // plan-config.ts is the source of truth for user-facing limits (the new
  // Premium AI Actions billing model). token-plan-config.ts is kept for the
  // legacy /api/tokens/* runtime enforcement layer until that is migrated.
  const plans = PLAN_IDS.map(id => {
    const cfg = PLANS[id];
    const legacy = TOKEN_PLANS[id];
    return {
      id,
      name: cfg.name,
      price: savedPrices[id] ?? cfg.price,
      period: id === "free_test" ? "7 days" : "monthly",
      // ── New billing surface ──
      premium_actions_per_month: cfg.premium_actions_per_month,
      basic_ai_unlimited: true,
      // ── Existing limits (now sourced from plan-config) ──
      tracked_channels: cfg.tracked_channels,
      instagram_accounts: cfg.instagram_accounts,
      tiktok_accounts: cfg.tiktok_accounts,
      competitor_brands: cfg.competitor_brands,
      team_members: cfg.team_members,
      client_accounts: cfg.client_accounts,
      history_days: cfg.history_days,
      has_calendar: cfg.has_calendar,
      has_tiktok: cfg.has_tiktok,
      has_api_access: cfg.has_api_access,
      has_white_label: cfg.has_white_label,
      has_priority_support: cfg.has_priority_support,
      sla_uptime: cfg.sla_uptime,
      // ── Legacy token fields (kept for backward compat with token-enforcement) ──
      tokens: legacy.included_tokens_month,
      extra_token_cost: legacy.extra_token_cost,
      max_monthly_tokens: legacy.max_monthly_tokens,
    };
  });

  return NextResponse.json({ plans });
}
