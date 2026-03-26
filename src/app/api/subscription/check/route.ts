import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user subscription info
  const { data: userData } = await supabase
    .from("users")
    .select("subscription_plan, trial_expires_at, total_api_cost_month")
    .eq("id", user.id)
    .single();

  if (!userData) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Get plan limits
  const { data: planLimits } = await supabase
    .from("plan_limits")
    .select("*")
    .eq("plan", userData.subscription_plan)
    .single();

  // Get today's AI calls count
  const today = new Date().toISOString().split("T")[0];
  const { data: todayUsage, count: aiCallsToday } = await supabase
    .from("usage_tracking")
    .select("*", { count: "exact" })
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

  const totalApiCost = monthlyUsage?.reduce((sum, item) => sum + (item.cost_usd || 0), 0) || 0;

  // Calculate days remaining for trial
  let daysRemaining = null;
  if (userData.subscription_plan === "free_test" && userData.trial_expires_at) {
    const expiresAt = new Date(userData.trial_expires_at);
    const now = new Date();
    daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }

  // Get social media accounts count
  const { count: socialAccountsCount } = await supabase
    .from("social_accounts")
    .select("*", { count: "exact" })
    .eq("user_id", user.id);

  return NextResponse.json({
    success: true,
    plan: userData.subscription_plan,
    days_remaining: daysRemaining,
    api_cost_this_month: parseFloat(totalApiCost.toFixed(2)),
    api_cost_limit: planLimits?.api_cost_max || 0,
    ai_calls_today: {
      used: aiCallsToday || 0,
      limit: planLimits?.ai_calls_per_day || 5,
    },
    social_accounts: {
      used: socialAccountsCount || 0,
      limit: planLimits?.social_media_accounts || 2,
    },
    storage_gb: planLimits?.storage_gb || 1,
    features: {
      email_reports: planLimits?.email_reports || false,
      webhook_integration: planLimits?.webhook_integration || false,
      custom_dashboard: planLimits?.custom_dashboard || false,
      priority_support: planLimits?.priority_support || false,
    },
  });
}
