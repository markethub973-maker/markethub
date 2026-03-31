/**
 * GET  /api/ai-budget          — returns current AI budget status for logged-in user
 * POST /api/ai-budget          — records an AI action cost & checks if budget exceeded
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPlanConfig, getRemainingBudget, getUsagePct, AI_ACTION_COSTS, type AIAction } from "@/lib/plan-config";

async function getUserPlanAndSpend(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const currentMonth = new Date().toISOString().substring(0, 7);

  const [profileRes, spendRes, extraRes] = await Promise.all([
    supabase.from("profiles").select("subscription_plan").eq("id", userId).single(),
    supabase.from("usage_tracking").select("cost_usd").eq("user_id", userId).eq("month_year", currentMonth),
    // extra credits — table may not exist yet, handle gracefully
    Promise.resolve(supabase.from("ai_credits").select("credits_usd").eq("user_id", userId).eq("month_year", currentMonth).maybeSingle()).catch(() => ({ data: null })),
  ]);

  const plan = profileRes.data?.subscription_plan ?? "free_test";
  const config = getPlanConfig(plan);
  const spent = (spendRes.data ?? []).reduce((s: number, r: any) => s + (r.cost_usd ?? 0), 0);
  const extraUsd = extraRes.data?.credits_usd ?? 0;
  const remaining = getRemainingBudget(config.ai_budget_usd, spent, extraUsd);
  const pct = getUsagePct(spent, config.ai_budget_usd + extraUsd);

  return { plan, config, spent, extraUsd, remaining, pct, currentMonth };
}

// ── GET — budget status ──────────────────────────────────────────────────────
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { config, spent, extraUsd, remaining, pct } = await getUserPlanAndSpend(supabase, user.id);

  return NextResponse.json({
    plan: config.id,
    plan_name: config.name,
    budget_usd: config.ai_budget_usd,
    extra_credits_usd: extraUsd,
    total_budget_usd: config.ai_budget_usd + extraUsd,
    spent_usd: parseFloat(spent.toFixed(4)),
    remaining_usd: parseFloat(remaining.toFixed(4)),
    usage_pct: pct,
    is_exhausted: remaining <= 0,
    can_purchase_credits: true,
  });
}

// ── POST — record usage & check limit ────────────────────────────────────────
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const action = body.action as AIAction | undefined;
  const cost_usd: number = body.cost_usd ?? (action ? AI_ACTION_COSTS[action] : 0);
  const feature: string = body.feature ?? action ?? "ai_usage";
  const api_name: string = body.api_name ?? "anthropic";

  const { config, spent, extraUsd, remaining, currentMonth } = await getUserPlanAndSpend(supabase, user.id);

  // Pre-check: would this action exceed the budget?
  if (remaining <= 0 || cost_usd > remaining) {
    return NextResponse.json({
      error: "ai_budget_exceeded",
      message: `🤖 You've used your full AI budget for this month ($${config.ai_budget_usd.toFixed(0)}). Purchase extra credits to continue.`,
      plan: config.id,
      plan_name: config.name,
      budget_usd: config.ai_budget_usd,
      extra_credits_usd: extraUsd,
      spent_usd: parseFloat(spent.toFixed(4)),
      remaining_usd: 0,
      usage_pct: 100,
      can_purchase_credits: true,
      credit_packs_url: "/settings?tab=credits",
    }, { status: 402 });
  }

  // Record usage
  await supabase.from("usage_tracking").insert({
    user_id: user.id,
    feature,
    api_name,
    cost_usd,
    month_year: currentMonth,
    timestamp: new Date().toISOString(),
  });

  const newSpent = spent + cost_usd;
  const newRemaining = getRemainingBudget(config.ai_budget_usd, newSpent, extraUsd);
  const newPct = getUsagePct(newSpent, config.ai_budget_usd + extraUsd);

  // Warn if getting close (>80%)
  const warning = newPct >= 80
    ? `⚠️ You've used ${newPct}% of your monthly AI budget ($${config.ai_budget_usd}). Consider purchasing extra credits.`
    : null;

  return NextResponse.json({
    success: true,
    spent_usd: parseFloat(newSpent.toFixed(4)),
    remaining_usd: parseFloat(newRemaining.toFixed(4)),
    usage_pct: newPct,
    warning,
  });
}
