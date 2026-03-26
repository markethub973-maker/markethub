/**
 * Token Enforcement System
 * Checks token availability, enforces limits, records usage
 */

import { createClient } from "./supabase/server";
import { getTokenPlan, getTokenCost, TokenAction, getRemainingTokens } from "./token-plan-config";

export interface TokenCheckResult {
  has_tokens: boolean;
  tokens_available: number;
  tokens_required: number;
  remaining_after: number;
  warning?: string;
  error?: string;
}

export interface TokenRecordResult {
  success: boolean;
  tokens_recorded: number;
  remaining_tokens: number;
  total_used_this_month: number;
  warning?: string;
}

/**
 * Check if user has enough tokens for an action
 * Returns result but DOES NOT consume tokens
 */
export async function checkTokenAvailability(
  userId: string,
  action: TokenAction
): Promise<TokenCheckResult> {
  const supabase = await createClient();
  const requiredTokens = getTokenCost(action);

  try {
    // Get user's plan
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("plan")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      return {
        has_tokens: false,
        tokens_available: 0,
        tokens_required: requiredTokens,
        remaining_after: 0,
        error: "Profile not found",
      };
    }

    const plan = getTokenPlan(profile.plan);

    // Get current month tokens used
    const now = new Date();
    const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const { data: tokenUsage } = await supabase
      .from("token_usage")
      .select("tokens_used")
      .eq("user_id", userId)
      .eq("month_year", monthYear)
      .single();

    const usedTokens = tokenUsage?.tokens_used || 0;

    // Get purchased extra tokens
    const { data: purchasedTokens } = await supabase
      .from("token_purchases")
      .select("tokens_purchased, bonus_tokens")
      .eq("user_id", userId)
      .eq("month_year", monthYear)
      .eq("status", "completed");

    const extraTokens = purchasedTokens?.reduce(
      (sum, p) => sum + p.tokens_purchased + (p.bonus_tokens || 0),
      0
    ) || 0;

    const totalAvailable = plan.included_tokens_month + extraTokens;
    const remaining = getRemainingTokens(plan.included_tokens_month, usedTokens, extraTokens);
    const hasTokens = remaining >= requiredTokens;

    return {
      has_tokens: hasTokens,
      tokens_available: Math.max(0, remaining),
      tokens_required: requiredTokens,
      remaining_after: Math.max(0, remaining - requiredTokens),
      warning: remaining < requiredTokens * 2
        ? `⚠️ Low tokens: only ${remaining} available (need ${requiredTokens})`
        : undefined,
    };

  } catch (error: any) {
    return {
      has_tokens: false,
      tokens_available: 0,
      tokens_required: requiredTokens,
      remaining_after: 0,
      error: error.message,
    };
  }
}

/**
 * Record token usage after an action is completed
 * Call AFTER the action succeeds (not before)
 */
export async function recordTokenUsage(
  userId: string,
  action: TokenAction,
  metadata?: Record<string, any>
): Promise<TokenRecordResult> {
  const supabase = await createClient();
  const tokensUsed = getTokenCost(action);

  try {
    const now = new Date();
    const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    // Upsert token usage for this month
    const { data: updated, error: updateError } = await supabase
      .from("token_usage")
      .upsert(
        {
          user_id: userId,
          month_year: monthYear,
          tokens_used: tokensUsed,
        },
        { onConflict: "user_id,month_year" }
      )
      .select()
      .single();

    if (updateError) throw updateError;

    // Log detailed usage
    await supabase.from("token_usage_log").insert({
      user_id: userId,
      tokens_consumed: tokensUsed,
      action: action,
      metadata: metadata || {},
      timestamp: new Date().toISOString(),
    });

    // Get plan for warning
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan")
      .eq("id", userId)
      .single();

    const plan = getTokenPlan(profile?.plan);

    // Get remaining tokens
    const { data: purchasedTokens } = await supabase
      .from("token_purchases")
      .select("tokens_purchased, bonus_tokens")
      .eq("user_id", userId)
      .eq("month_year", monthYear)
      .eq("status", "completed");

    const extraTokens = purchasedTokens?.reduce(
      (sum, p) => sum + p.tokens_purchased + (p.bonus_tokens || 0),
      0
    ) || 0;

    const remaining = getRemainingTokens(plan.included_tokens_month, updated.tokens_used, extraTokens);
    const totalAvailable = plan.included_tokens_month + extraTokens;
    const usagePct = totalAvailable > 0 ? (updated.tokens_used / totalAvailable) * 100 : 0;

    return {
      success: true,
      tokens_recorded: tokensUsed,
      remaining_tokens: Math.max(0, remaining),
      total_used_this_month: updated.tokens_used,
      warning: usagePct >= 80
        ? `⚠️ You've used ${Math.round(usagePct)}% of your monthly token allowance`
        : undefined,
    };

  } catch (error: any) {
    return {
      success: false,
      tokens_recorded: 0,
      remaining_tokens: 0,
      total_used_this_month: 0,
      warning: error.message,
    };
  }
}

/**
 * Get user's current token balance
 */
export async function getUserTokenBalance(userId: string) {
  const supabase = await createClient();

  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan")
      .eq("id", userId)
      .single();

    const plan = getTokenPlan(profile?.plan);

    const now = new Date();
    const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const { data: tokenUsage } = await supabase
      .from("token_usage")
      .select("tokens_used")
      .eq("user_id", userId)
      .eq("month_year", monthYear)
      .single();

    const usedTokens = tokenUsage?.tokens_used || 0;

    const { data: purchasedTokens } = await supabase
      .from("token_purchases")
      .select("tokens_purchased, bonus_tokens")
      .eq("user_id", userId)
      .eq("month_year", monthYear)
      .eq("status", "completed");

    const extraTokens = purchasedTokens?.reduce(
      (sum, p) => sum + p.tokens_purchased + (p.bonus_tokens || 0),
      0
    ) || 0;

    const totalAvailable = plan.included_tokens_month + extraTokens;
    const remaining = getRemainingTokens(plan.included_tokens_month, usedTokens, extraTokens);

    return {
      plan_id: profile?.plan,
      plan_name: plan.name,
      month: monthYear,
      tokens: {
        included: plan.included_tokens_month,
        purchased: extraTokens,
        total_available: totalAvailable,
        used: usedTokens,
        remaining: Math.max(0, remaining),
      },
      usage_pct: totalAvailable > 0 ? Math.round((usedTokens / totalAvailable) * 100) : 0,
    };

  } catch (error: any) {
    console.error("[Token Balance] Error:", error.message);
    return null;
  }
}
