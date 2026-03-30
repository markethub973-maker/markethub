/**
 * Plan Limits Enforcement
 *
 * Centralized check to run BEFORE any AI/paid action.
 * Follows the same pattern as individual AI routes (profiles + usage_tracking + ai_credits).
 */

import { createClient } from "./supabase/server";
import { getPlanConfig, getRemainingBudget, AI_ACTION_COSTS, AIAction } from "./plan-config";

export interface PlanLimitResult {
  allowed: boolean;
  reason?: string;
  plan: string;
  budget_remaining_usd: number;
  budget_limit_usd: number;
  trial_expired: boolean;
  credits_url: string;
}

/**
 * Check if a user is allowed to perform an AI action.
 * Returns { allowed: true } or { allowed: false, reason: "..." }
 *
 * Usage:
 *   const check = await checkPlanLimits(user.id, "sentiment_analysis");
 *   if (!check.allowed) return NextResponse.json({ error: check.reason }, { status: 402 });
 */
export async function checkPlanLimits(
  userId: string,
  action: AIAction
): Promise<PlanLimitResult> {
  const supabase = await createClient();
  const currentMonth = new Date().toISOString().substring(0, 7);

  // Get user plan and trial info
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, trial_expires_at")
    .eq("id", userId)
    .single();

  const planConfig = getPlanConfig(profile?.plan);

  // Check if trial has expired
  if (profile?.plan === "free_test" && profile?.trial_expires_at) {
    const expiresAt = new Date(profile.trial_expires_at as string);
    if (expiresAt < new Date()) {
      return {
        allowed: false,
        reason: "Your free trial has expired. Upgrade to continue using AI features.",
        plan: "free_test",
        budget_remaining_usd: 0,
        budget_limit_usd: planConfig.ai_budget_usd,
        trial_expired: true,
        credits_url: "/pricing",
      };
    }
  }

  // Get spend this month from usage_tracking
  const { data: spendData } = await supabase
    .from("usage_tracking")
    .select("cost_usd")
    .eq("user_id", userId)
    .eq("month_year", currentMonth);

  // Get extra AI credits purchased this month
  const { data: extraCredits } = await supabase
    .from("ai_credits")
    .select("credits_usd")
    .eq("user_id", userId)
    .eq("month_year", currentMonth)
    .maybeSingle();

  const spent = spendData?.reduce((s, r) => s + (r.cost_usd ?? 0), 0) ?? 0;
  const extraUsd = (extraCredits as { credits_usd?: number } | null)?.credits_usd ?? 0;
  const remaining = getRemainingBudget(planConfig.ai_budget_usd, spent, extraUsd);
  const actionCost = AI_ACTION_COSTS[action];

  if (remaining < actionCost) {
    return {
      allowed: false,
      reason: `AI budget exhausted ($${planConfig.ai_budget_usd.toFixed(2)}/month limit). Purchase extra credits to continue.`,
      plan: profile?.plan ?? "free_test",
      budget_remaining_usd: parseFloat(remaining.toFixed(4)),
      budget_limit_usd: planConfig.ai_budget_usd,
      trial_expired: false,
      credits_url: "/settings?tab=credits",
    };
  }

  return {
    allowed: true,
    plan: profile?.plan ?? "free_test",
    budget_remaining_usd: parseFloat(remaining.toFixed(4)),
    budget_limit_usd: planConfig.ai_budget_usd,
    trial_expired: false,
    credits_url: "/settings?tab=credits",
  };
}
