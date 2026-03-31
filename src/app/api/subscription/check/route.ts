import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user profile with subscription info
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_plan, subscription_status, trial_expires_at, total_api_cost_month")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // Get plan limits
  const { data: planLimits } = await supabase
    .from("plan_limits")
    .select("*")
    .eq("plan", profile.subscription_plan)
    .single();

  // Get today's AI calls count
  const today = new Date().toISOString().split("T")[0];
  const { count: aiCallsToday } = await supabase
    .from("usage_tracking")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("feature", "ai_call")
    .gte("created_at", `${today}T00:00:00`);

  // Get current month API cost
  const currentMonth = new Date().toISOString().substring(0, 7);
  const { data: monthlyUsage } = await supabase
    .from("usage_tracking")
    .select("cost_usd")
    .eq("user_id", user.id)
    .eq("month_year", currentMonth);

  const totalApiCost = monthlyUsage?.reduce((sum, item) => sum + (item.cost_usd || 0), 0) ?? 0;

  // Calculate days remaining for trial
  let daysRemaining: number | null = null;
  if (profile.subscription_plan === "free_test" && profile.trial_expires_at) {
    const expiresAt = new Date(profile.trial_expires_at);
    daysRemaining = Math.max(
      0,
      Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    );
  }

  return NextResponse.json({
    success: true,
    plan: profile.subscription_plan,
    status: profile.subscription_status,
    days_remaining: daysRemaining,
    api_cost_this_month: parseFloat(totalApiCost.toFixed(4)),
    api_cost_limit: planLimits?.api_cost_max ?? 0,
    ai_calls_today: {
      used: aiCallsToday ?? 0,
      limit: planLimits?.ai_calls_per_day ?? 5,
    },
    storage_gb: planLimits?.storage_gb ?? 1,
    features: {
      email_reports:       planLimits?.email_reports ?? false,
      webhook_integration: planLimits?.webhook_integration ?? false,
      custom_dashboard:    planLimits?.custom_dashboard ?? false,
      priority_support:    planLimits?.priority_support ?? false,
    },
  });
}
