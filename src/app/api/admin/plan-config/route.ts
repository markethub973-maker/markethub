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
  const { data, error } = await supabase
    .from("admin_plan_config")
    .select("plan_id, tokens_month, feature_flags");

  const tableExists = !error || !error.message?.includes("does not exist");
  const overrides: Record<string, { tokens_month?: number; feature_flags?: Record<string, boolean> }> = {};
  if (!error && data) {
    for (const row of data) overrides[row.plan_id] = row;
  }

  const plans = PLAN_IDS.map((id) => {
    const base = TOKEN_PLANS[id];
    const ov = overrides[id] ?? {};
    return {
      id,
      name: base.name,
      tokens_month: ov.tokens_month ?? base.included_tokens_month,
      features: {
        has_calendar:        ov.feature_flags?.has_calendar        ?? base.has_calendar,
        has_tiktok:          ov.feature_flags?.has_tiktok          ?? base.has_tiktok,
        has_api_access:      ov.feature_flags?.has_api_access      ?? base.has_api_access,
        has_white_label:     ov.feature_flags?.has_white_label     ?? base.has_white_label,
        has_priority_support: ov.feature_flags?.has_priority_support ?? base.has_priority_support,
      },
    };
  });

  return NextResponse.json({ plans, table_exists: tableExists });
}

export async function POST(req: Request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { plan_id, tokens_month, feature_flags } = body as {
    plan_id: PlanId; tokens_month?: number; feature_flags?: Record<string, boolean>;
  };

  if (!PLAN_IDS.includes(plan_id)) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  if (tokens_month !== undefined && tokens_month < 0) return NextResponse.json({ error: "Tokens must be ≥ 0" }, { status: 400 });

  const supabase = createServiceClient();
  const payload: Record<string, unknown> = { plan_id, updated_at: new Date().toISOString() };
  if (tokens_month !== undefined) payload.tokens_month = tokens_month;
  if (feature_flags !== undefined) payload.feature_flags = feature_flags;

  const { error } = await supabase
    .from("admin_plan_config")
    .upsert(payload, { onConflict: "plan_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
