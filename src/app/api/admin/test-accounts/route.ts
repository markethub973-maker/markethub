import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/adminAuth";
import { createServiceClient } from "@/lib/supabase/service";

const PLAN_ORDER = ["free_test", "starter", "lite", "pro", "business", "enterprise"];

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Get one user per plan
  const { data: users } = await supabase
    .from("profiles")
    .select("id, email, plan, subscription_plan, subscription_status, full_name, created_at")
    .order("created_at", { ascending: true });

  // Group by plan — take first user per plan
  const byPlan: Record<string, any> = {};
  for (const user of users ?? []) {
    const plan = user.subscription_plan || user.plan || "free_test";
    if (!byPlan[plan]) byPlan[plan] = user;
  }

  const accounts = PLAN_ORDER.map(planId => ({
    plan: planId,
    user: byPlan[planId] || null,
  }));

  return NextResponse.json({ accounts });
}

// Create a test account for a plan
export async function POST(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { plan } = await req.json();
  if (!PLAN_ORDER.includes(plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const email = `test.${plan}@markethubpromo.com`;
  const password = `Test${plan.charAt(0).toUpperCase() + plan.slice(1)}2026!`;

  // Create user in Supabase Auth
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError && !authError.message.includes("already registered")) {
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  // Resolve userId — from new user or look up existing by email via admin REST
  let userId = authUser?.user?.id;
  if (!userId) {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}&limit=1`,
        {
          headers: {
            apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
          },
        }
      );
      const data = await res.json();
      userId = data?.users?.[0]?.id ?? null;
    } catch {}
  }

  if (userId) {
    // Set plan on profile — always overwrite, even if profile already exists
    await supabase.from("profiles").upsert({
      id: userId,
      email,
      subscription_plan: plan,
      subscription_status: plan === "free_test" ? "trialing" : "active",
      trial_expires_at: plan === "free_test" ? new Date(Date.now() + 7 * 86400000).toISOString() : null,
    }, { onConflict: "id" });
  }

  return NextResponse.json({ success: true, email, password });
}
