import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/adminAuth";
import { createServiceClient } from "@/lib/supabase/service";

const PLAN_ORDER = ["free_test", "lite", "pro", "business", "agency"];

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

  if (authError && !authError.message.toLowerCase().includes("already")) {
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  // Resolve userId — from new user or sign in to get session (extracts user ID from JWT)
  let userId = authUser?.user?.id;
  if (!userId) {
    try {
      const signinRes = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          },
          body: JSON.stringify({ email, password }),
        }
      );
      const session = await signinRes.json();
      userId = session?.user?.id ?? null;
    } catch {}
  }

  if (userId) {
    // Set plan via direct REST (most reliable — JS client upsert can fail silently)
    await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
          Prefer: "resolution=merge-duplicates",
        },
        body: JSON.stringify({ id: userId, plan }),
      }
    );
  }

  return NextResponse.json({ success: true, email });
}
