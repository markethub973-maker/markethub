/**
 * checkPlanLimits — pre-flight enforcement before any AI/API call.
 * Call this at the start of every AI route handler.
 *
 * Usage:
 *   const check = await checkPlanLimits(userId, "ai_call");
 *   if (!check.allowed) return NextResponse.json({ error: check.reason }, { status: 429 });
 */

import { createClient } from "@/lib/supabase/server";
import { AI_ACTION_COSTS, AIAction } from "@/lib/plan-config";

export interface PlanCheckResult {
  allowed: boolean;
  reason?: string;
  plan: string;
  status: string;
  ai_calls_today: number;
  ai_calls_limit: number;
  api_cost_this_month: number;
  api_cost_limit: number;
}

export async function checkPlanLimits(
  userId: string,
  action: AIAction | "ai_call"
): Promise<PlanCheckResult> {
  const supabase = await createClient();

  // 1. Get profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_plan, subscription_status, trial_expires_at")
    .eq("id", userId)
    .single();

  const plan = profile?.subscription_plan ?? "free_test";
  const status = profile?.subscription_status ?? "active";

  // 2. Expired plan → block immediately
  if (plan === "expired" || status === "expired") {
    return {
      allowed: false,
      reason: "Your trial has expired. Please upgrade to continue.",
      plan,
      status,
      ai_calls_today: 0,
      ai_calls_limit: 0,
      api_cost_this_month: 0,
      api_cost_limit: 0,
    };
  }

  // 3. Check if free_test trial is expired (in case cron hasn't run yet)
  if (plan === "free_test" && profile?.trial_expires_at) {
    const expired = new Date(profile.trial_expires_at) < new Date();
    if (expired) {
      // Lazy expire
      await supabase
        .from("profiles")
        .update({ subscription_plan: "expired", subscription_status: "expired" })
        .eq("id", userId);
      return {
        allowed: false,
        reason: "Your free trial has expired. Please upgrade to continue.",
        plan: "expired",
        status: "expired",
        ai_calls_today: 0,
        ai_calls_limit: 0,
        api_cost_this_month: 0,
        api_cost_limit: 0,
      };
    }
  }

  // 4. Get plan limits
  const { data: planLimits } = await supabase
    .from("plan_limits")
    .select("ai_calls_per_day, api_cost_max")
    .eq("plan", plan)
    .single();

  const dailyLimit = planLimits?.ai_calls_per_day ?? 5;
  const costLimit = planLimits?.api_cost_max ?? 0;

  // 5. Count today's AI calls
  const today = new Date().toISOString().split("T")[0];
  const { count: aiCallsToday } = await supabase
    .from("usage_tracking")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("feature", "ai_call")
    .gte("created_at", `${today}T00:00:00`);

  const callsUsed = aiCallsToday ?? 0;

  if (dailyLimit > 0 && callsUsed >= dailyLimit) {
    return {
      allowed: false,
      reason: `Daily AI call limit reached (${callsUsed}/${dailyLimit}). Upgrade your plan for more.`,
      plan,
      status,
      ai_calls_today: callsUsed,
      ai_calls_limit: dailyLimit,
      api_cost_this_month: 0,
      api_cost_limit: costLimit,
    };
  }

  // 6. Check monthly API cost
  const currentMonth = new Date().toISOString().substring(0, 7);
  const { data: monthlyUsage } = await supabase
    .from("usage_tracking")
    .select("cost_usd")
    .eq("user_id", userId)
    .eq("month_year", currentMonth);

  const totalCost = monthlyUsage?.reduce((s, r) => s + (r.cost_usd ?? 0), 0) ?? 0;
  const actionCost = action !== "ai_call" ? (AI_ACTION_COSTS[action as AIAction] ?? 0) : 0;

  if (costLimit > 0 && totalCost + actionCost > costLimit) {
    return {
      allowed: false,
      reason: `Monthly AI budget exceeded ($${totalCost.toFixed(2)}/$${costLimit}). Upgrade your plan.`,
      plan,
      status,
      ai_calls_today: callsUsed,
      ai_calls_limit: dailyLimit,
      api_cost_this_month: totalCost,
      api_cost_limit: costLimit,
    };
  }

  return {
    allowed: true,
    plan,
    status,
    ai_calls_today: callsUsed,
    ai_calls_limit: dailyLimit,
    api_cost_this_month: totalCost,
    api_cost_limit: costLimit,
  };
}

/**
 * Record an AI call in usage_tracking.
 * Call AFTER the action succeeds.
 */
export async function recordUsage(
  userId: string,
  feature: string,
  costUsd: number
): Promise<void> {
  const supabase = await createClient();
  const monthYear = new Date().toISOString().substring(0, 7);

  await supabase.from("usage_tracking").insert({
    user_id: userId,
    feature,
    cost_usd: costUsd,
    month_year: monthYear,
  });
}
