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

    // Get all users with subscription data
    const { data: users, error: usersError } = await supabase
      .from("profiles")
      .select(
        `id, email, name, plan, is_admin, created_at,
         stripe_customer_id, stripe_subscription_id`
      )
      .order("created_at", { ascending: false });

    if (usersError) {
      return NextResponse.json({ error: usersError.message }, { status: 400 });
    }

    // Get subscription info and trial data for each user
    const { data: subscriptions } = await supabase
      .from("subscriptions")
      .select("user_id, status, expires_at");

    const { data: usage } = await supabase
      .from("usage_tracking")
      .select("user_id, cost_usd, month_year")
      .eq("month_year", new Date().toISOString().substring(0, 7));

    // Combine data
    const enrichedUsers = users?.map((u: any) => {
      const subscription = subscriptions?.find(
        (s: any) => s.user_id === u.id
      );
      const monthlyUsage = usage?.filter((ut: any) => ut.user_id === u.id);
      const totalApiCost = monthlyUsage?.reduce(
        (sum: number, ut: any) => sum + (ut.cost_usd || 0),
        0
      ) || 0;

      return {
        id: u.id,
        email: u.email,
        name: u.name,
        plan: u.plan,
        is_admin: u.is_admin,
        subscription_status: subscription?.status || "inactive",
        trial_expires_at: subscription?.expires_at || null,
        created_at: u.created_at,
        total_api_cost_month: parseFloat(totalApiCost.toFixed(2)),
        stripe_customer_id: u.stripe_customer_id,
      };
    }) || [];

    return NextResponse.json({
      success: true,
      users: enrichedUsers,
      total: enrichedUsers.length,
    });
  } catch (error) {
    console.error("Get users error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
