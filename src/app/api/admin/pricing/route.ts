import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { TOKEN_PLANS, type PlanId } from "@/lib/token-plan-config";

const PLAN_IDS: PlanId[] = ["free_test", "starter", "lite", "pro", "business", "enterprise"];

// In-memory overrides (resets on cold start — use admin_plan_config table for persistence)
const priceOverrides: Partial<Record<PlanId, number>> = {};

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  return data?.is_admin ? user : null;
}

export async function GET() {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const plans = PLAN_IDS.map(id => ({
    id,
    name: TOKEN_PLANS[id].name,
    price: priceOverrides[id] ?? TOKEN_PLANS[id].price,
    period: id === "free_test" ? "7_days" : "monthly",
  }));

  return NextResponse.json({ success: true, plans });
}

export async function POST(request: Request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { plan, price } = await request.json();

  if (!plan || price === undefined)
    return NextResponse.json({ error: "Plan and price are required" }, { status: 400 });

  if (!PLAN_IDS.includes(plan as PlanId))
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

  if (plan === "free_test" && price !== 0)
    return NextResponse.json({ error: "Free test plan must be free" }, { status: 400 });

  if (price < 0)
    return NextResponse.json({ error: "Price cannot be negative" }, { status: 400 });

  priceOverrides[plan as PlanId] = price;

  return NextResponse.json({
    success: true,
    message: `${plan} plan updated to $${price}/month`,
    updated_plan: { id: plan, price, period: plan === "free_test" ? "7_days" : "monthly" },
  });
}
