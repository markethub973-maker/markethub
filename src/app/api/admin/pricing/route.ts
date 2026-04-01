import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { TOKEN_PLANS, type PlanId } from "@/lib/token-plan-config";

const PLAN_IDS: PlanId[] = ["free_test", "starter", "lite", "pro", "business", "enterprise"];

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

  const supabase = createServiceClient();

  // Read saved prices from Supabase
  const { data, error } = await supabase
    .from("admin_plan_config")
    .select("plan_id, price");

  const tableExists = !error || !error.message?.includes("does not exist");
  const saved: Record<string, number> = {};
  if (!error && data) {
    for (const row of data) {
      if (row.price !== null && row.price !== undefined) saved[row.plan_id] = row.price;
    }
  }

  const plans = PLAN_IDS.map(id => ({
    id,
    name: TOKEN_PLANS[id].name,
    price: saved[id] ?? TOKEN_PLANS[id].price,
    period: id === "free_test" ? "7_days" : "monthly",
  }));

  return NextResponse.json({ success: true, plans, db_connected: tableExists });
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

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("admin_plan_config")
    .upsert(
      { plan_id: plan, price, updated_at: new Date().toISOString() },
      { onConflict: "plan_id" }
    );

  if (error) return NextResponse.json({ error: error.message, db_error: true }, { status: 400 });

  return NextResponse.json({
    success: true,
    message: `${TOKEN_PLANS[plan as PlanId].name} updated to $${price}/month`,
    updated_plan: { id: plan, price, period: plan === "free_test" ? "7_days" : "monthly" },
  });
}
