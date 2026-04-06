import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
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

  const PLAN_IDS = ["free_test", "starter", "lite", "pro", "business", "enterprise"] as const;

  const plans = PLAN_IDS.map(id => {
    const cfg = TOKEN_PLANS[id];
    return {
      id,
      name: cfg.name,
      price: savedPrices[id] ?? cfg.price,
      period: id === "free_test" ? "7 days" : "monthly",
      tokens: cfg.included_tokens_month,
      extra_token_cost: cfg.extra_token_cost,
      max_monthly_tokens: cfg.max_monthly_tokens,
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
    };
  });

  return NextResponse.json({ plans });
}
