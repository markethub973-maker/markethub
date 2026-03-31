import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTokenPlan, getRemainingTokens, getTokenUsagePct } from "@/lib/token-plan-config";

/**
 * GET /api/tokens/usage
 * Returns current token usage for logged-in user
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get user's plan
    const { data: profile } = await supabase
      .from("profiles")
            .select("subscription_plan")
      .eq("id", user.id)
      .single();

    const planId = profile?.subscription_plan || "free_test";
    const plan = getTokenPlan(planId);

    // Get current month tokens used
    const now = new Date();
    const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const { data: tokenUsage } = await supabase
      .from("token_usage")
      .select("tokens_used")
      .eq("user_id", user.id)
      .eq("month_year", monthYear)
      .single();

    const usedTokens = tokenUsage?.tokens_used || 0;

    // Get purchased extra tokens
    const { data: purchasedTokens } = await supabase
      .from("token_purchases")
      .select("tokens_purchased")
      .eq("user_id", user.id)
      .eq("month_year", monthYear);

    const extraTokensPurchased = purchasedTokens?.reduce(
      (sum, p) => sum + p.tokens_purchased,
      0
    ) || 0;

    const totalAvailable = plan.included_tokens_month + extraTokensPurchased;
    const remaining = getRemainingTokens(plan.included_tokens_month, usedTokens, extraTokensPurchased);
    const usagePct = getTokenUsagePct(usedTokens, totalAvailable);

    // Calculate estimated overage cost if exceeds
    let overageCost = 0;
    if (remaining < 0) {
      const overageTokens = Math.abs(remaining);
      overageCost = (overageTokens / 1000) * plan.extra_token_cost;
    }

    return NextResponse.json({
      plan: planId,
      plan_name: plan.name,
      plan_price: plan.price,
      month: monthYear,
      tokens: {
        included: plan.included_tokens_month,
        purchased: extraTokensPurchased,
        total_available: totalAvailable,
        used: usedTokens,
        remaining: Math.max(0, remaining),
        overage: Math.max(0, -remaining),
      },
      usage_pct: usagePct,
      overage_cost: parseFloat(overageCost.toFixed(2)),
      overage_rate: `$${plan.extra_token_cost.toFixed(4)}/1000 tokens`,
      warning: usagePct >= 80 ? "You're using 80%+ of your tokens" : null,
      can_recharge: plan.token_recharge_packs.length > 0,
    });

  } catch (error: any) {
    console.error("[Token Usage] Error:", error.message);
    return NextResponse.json(
      { error: error.message, type: "system_error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tokens/usage
 * Record token usage for an action (called by features after consuming tokens)
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tokens_used, action, metadata } = await req.json();

  if (!tokens_used || tokens_used <= 0) {
    return NextResponse.json(
      { error: "tokens_used must be > 0" },
      { status: 400 }
    );
  }

  try {
    const now = new Date();
    const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    // Upsert token usage for this month
    const { data, error } = await supabase
      .from("token_usage")
      .upsert(
        {
          user_id: user.id,
          month_year: monthYear,
          tokens_used: tokens_used,
        },
        { onConflict: "user_id,month_year" }
      )
      .select()
      .single();

    if (error) throw error;

    // Log individual action (for analytics)
    await supabase.from("token_usage_log").insert({
      user_id: user.id,
      tokens_consumed: tokens_used,
      action: action || "unspecified",
      metadata: metadata || {},
      timestamp: new Date().toISOString(),
    });

    // Get updated usage
    const plan = getTokenPlan((await supabase
      .from("profiles")
            .select("subscription_plan")
      .eq("id", user.id)
      .single()).data?.subscription_plan);

    const remaining = getRemainingTokens(plan.included_tokens_month, data.tokens_used);

    // Warn if usage high
    const usagePct = getTokenUsagePct(data.tokens_used, plan.included_tokens_month);

    return NextResponse.json({
      success: true,
      tokens_recorded: tokens_used,
      total_used_this_month: data.tokens_used,
      remaining_tokens: Math.max(0, remaining),
      usage_pct: usagePct,
      warning: usagePct >= 80 ? "⚠️ You've used 80%+ of your monthly tokens" : null,
    });

  } catch (error: any) {
    console.error("[Token Usage Record] Error:", error.message);
    return NextResponse.json(
      { error: error.message, type: "system_error" },
      { status: 500 }
    );
  }
}
