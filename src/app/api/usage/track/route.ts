import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { feature, api_name, cost_usd = 0 } = body;

    if (!feature) {
      return NextResponse.json({ error: "Feature is required" }, { status: 400 });
    }

    const currentMonth = new Date().toISOString().substring(0, 7);

    // Check if user exceeded plan limits
    const { data: userData } = await supabase
      .from("users")
      .select("subscription_plan")
      .eq("id", user.id)
      .single();

    const { data: planLimits } = await supabase
      .from("plan_limits")
      .select("*")
      .eq("plan", userData?.subscription_plan)
      .single();

    // Get current month usage
    const { data: monthlyUsage } = await supabase
      .from("usage_tracking")
      .select("cost_usd")
      .eq("user_id", user.id)
      .eq("month_year", currentMonth);

    const totalApiCost = (monthlyUsage?.reduce((sum, item) => sum + (item.cost_usd || 0), 0) || 0) + cost_usd;

    // Check if over limit
    if (planLimits && totalApiCost > planLimits.api_cost_max && planLimits.api_cost_max > 0) {
      return NextResponse.json(
        {
          error: "API cost limit exceeded for this month",
          current_cost: totalApiCost.toFixed(2),
          limit: planLimits.api_cost_max,
          message: `Your plan limit is $${planLimits.api_cost_max}/month. Upgrade your plan to continue.`
        },
        { status: 429 }
      );
    }

    // Record usage
    const { data, error } = await supabase
      .from("usage_tracking")
      .insert({
        user_id: user.id,
        feature,
        api_name,
        cost_usd,
        month_year: currentMonth,
        timestamp: new Date().toISOString(),
      });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      usage_recorded: data,
      current_month_cost: parseFloat(totalApiCost.toFixed(2)),
      remaining_budget: planLimits ? parseFloat((planLimits.api_cost_max - totalApiCost).toFixed(2)) : null,
    });
  } catch (error) {
    console.error("Usage tracking error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
