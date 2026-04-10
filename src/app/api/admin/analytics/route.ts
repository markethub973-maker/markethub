import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if admin
    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!adminProfile?.is_admin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const periodRaw = url.searchParams.get("period") || "monthly";
    const VALID_PERIODS = ["daily", "weekly", "monthly"];
    const period = VALID_PERIODS.includes(periodRaw) ? periodRaw : "monthly";

    // Get all users count
    const { count: totalUsers } = await supabase
      .from("profiles")
      .select("id", { count: "exact" });

    // Get active subscriptions
    const { data: subscriptions } = await supabase
      .from("subscriptions")
      .select("user_id, plan:profiles(plan)")
      .eq("status", "active");

    // Count by plan
    const activeCounts = {
      free_test: subscriptions?.filter((s: any) => s.profiles?.plan === "free_test").length || 0,
      lite: subscriptions?.filter((s: any) => s.profiles?.plan === "lite").length || 0,
      pro: subscriptions?.filter((s: any) => s.profiles?.plan === "pro").length || 0,
    };

    // Get total revenue (sum of all API costs)
    const { data: allUsage } = await supabase
      .from("usage_tracking")
      .select("cost_usd, month_year");

    const currentMonth = new Date().toISOString().substring(0, 7);
    const monthlyRevenue = allUsage
      ?.filter((u: any) => u.month_year === currentMonth)
      .reduce((sum: number, u: any) => sum + (u.cost_usd || 0), 0) || 0;

    // Get analytics data based on period
    let analyticsData: any[] = [];

    if (period === "daily") {
      // Last 30 days
      const last30Days = [];
      for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];

        const { count: newSignups } = await supabase
          .from("profiles")
          .select("id", { count: "exact" })
          .gte("created_at", `${dateStr}T00:00:00`)
          .lt("created_at", `${dateStr}T23:59:59`);

        const { data: dayUsage } = await supabase
          .from("usage_tracking")
          .select("cost_usd")
          .gte("timestamp", `${dateStr}T00:00:00`)
          .lt("timestamp", `${dateStr}T23:59:59`);

        const dayRevenue = dayUsage?.reduce((sum: number, u: any) => sum + (u.cost_usd || 0), 0) || 0;

        analyticsData.push({
          date: dateStr,
          revenue: parseFloat(dayRevenue.toFixed(2)),
          new_signups: newSignups || 0,
        });
      }
    } else if (period === "weekly") {
      // Last 12 weeks
      for (let i = 11; i >= 0; i--) {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay() - i * 7);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        const weekLabel = `${weekStart.toISOString().split("T")[0]} to ${weekEnd.toISOString().split("T")[0]}`;

        const { count: newSignups } = await supabase
          .from("profiles")
          .select("id", { count: "exact" })
          .gte("created_at", weekStart.toISOString())
          .lt("created_at", weekEnd.toISOString());

        const { data: weekUsage } = await supabase
          .from("usage_tracking")
          .select("cost_usd")
          .gte("timestamp", weekStart.toISOString())
          .lt("timestamp", weekEnd.toISOString());

        const weekRevenue = weekUsage?.reduce((sum: number, u: any) => sum + (u.cost_usd || 0), 0) || 0;

        analyticsData.push({
          date: weekLabel,
          revenue: parseFloat(weekRevenue.toFixed(2)),
          new_signups: newSignups || 0,
        });
      }
    } else {
      // Monthly (last 12 months)
      for (let i = 11; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthStr = date.toISOString().substring(0, 7);

        const { count: newSignups } = await supabase
          .from("profiles")
          .select("id", { count: "exact" })
          .gte("created_at", `${monthStr}-01T00:00:00`)
          .lt("created_at", `${monthStr}-31T23:59:59`);

        const { data: monthUsage } = await supabase
          .from("usage_tracking")
          .select("cost_usd")
          .eq("month_year", monthStr);

        const monthRevenue = monthUsage?.reduce((sum: number, u: any) => sum + (u.cost_usd || 0), 0) || 0;

        analyticsData.push({
          date: monthStr,
          revenue: parseFloat(monthRevenue.toFixed(2)),
          new_signups: newSignups || 0,
        });
      }
    }

    return NextResponse.json({
      success: true,
      period,
      data: analyticsData,
      summary: {
        total_users: totalUsers || 0,
        total_revenue: parseFloat(monthlyRevenue.toFixed(2)),
        active_subscriptions: activeCounts,
        mrr: activeCounts.lite * 20 + activeCounts.pro * 40, // Monthly Recurring Revenue
      },
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
