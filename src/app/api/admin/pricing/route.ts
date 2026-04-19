import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isAdminAuthorized } from "@/lib/adminAuth";
import { PLANS, type PlanId } from "@/lib/plan-config";

const PLAN_IDS: PlanId[] = ["free_test", "lite", "pro", "business", "agency"];

async function getPrices(): Promise<Record<string, number>> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("admin_platform_config")
    .select("extra_data")
    .eq("platform", "plan_prices")
    .single();
  return (data?.extra_data as Record<string, number>) ?? {};
}

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const saved = await getPrices();

  const plans = PLAN_IDS.map(id => ({
    id,
    name: PLANS[id].name,
    price: saved[id] ?? PLANS[id].price,
    period: id === "free_test" ? "7_days" : "monthly",
  }));

  return NextResponse.json({ success: true, plans, db_connected: true });
}

export async function POST(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { plan, price } = await req.json();

  if (!plan || price === undefined)
    return NextResponse.json({ error: "Plan and price are required" }, { status: 400 });
  if (!PLAN_IDS.includes(plan as PlanId))
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  if (plan === "free_test" && price !== 0)
    return NextResponse.json({ error: "Free test plan must be free" }, { status: 400 });
  if (price < 0)
    return NextResponse.json({ error: "Price cannot be negative" }, { status: 400 });

  // Read current prices, merge update, write back
  const current = await getPrices();
  const updated = { ...current, [plan]: price };

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("admin_platform_config")
    .update({ extra_data: updated, updated_at: new Date().toISOString() })
    .eq("platform", "plan_prices");

  if (error) return NextResponse.json({ error: error.message, db_error: true }, { status: 400 });

  return NextResponse.json({
    success: true,
    message: `${PLANS[plan as PlanId].name} updated to $${price}/month`,
    updated_plan: { id: plan, price, period: plan === "free_test" ? "7_days" : "monthly" },
  });
}
