import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { TOKEN_PLANS, type PlanId } from "@/lib/token-plan-config";
import { PLAN_FEATURES } from "@/lib/plan-features";

const PLAN_IDS: PlanId[] = ["free_test", "lite", "pro", "business", "enterprise"];

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  return data?.is_admin ? user : null;
}

async function getConfigRows() {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("admin_platform_config")
    .select("platform, extra_data")
    .in("platform", ["plan_tokens", "plan_features"]);

  const tokens: Record<string, number> = {};
  const features: Record<string, Record<string, boolean>> = {};

  for (const row of data ?? []) {
    if (row.platform === "plan_tokens") Object.assign(tokens, row.extra_data);
    if (row.platform === "plan_features") Object.assign(features, row.extra_data);
  }
  return { tokens, features };
}

export async function GET() {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tokens, features } = await getConfigRows();

  const plans = PLAN_IDS.map((id) => {
    const base = TOKEN_PLANS[id];
    return {
      id,
      name: base.name,
      tokens_month: tokens[id] ?? base.included_tokens_month,
      features: {
        // DB override wins → falls back to plan-features.ts (source of truth for access control)
        has_calendar:         features[id]?.has_calendar         ?? PLAN_FEATURES[id]?.has_calendar         ?? base.has_calendar,
        has_tiktok:           features[id]?.has_tiktok           ?? PLAN_FEATURES[id]?.has_tiktok           ?? base.has_tiktok,
        has_api_access:       features[id]?.has_api_access       ?? PLAN_FEATURES[id]?.has_api_access       ?? base.has_api_access,
        has_white_label:      features[id]?.has_white_label      ?? PLAN_FEATURES[id]?.has_white_label      ?? base.has_white_label,
        has_priority_support: features[id]?.has_priority_support ?? PLAN_FEATURES[id]?.has_priority_support ?? base.has_priority_support,
      },
    };
  });

  return NextResponse.json({ plans, table_exists: true });
}

export async function POST(req: Request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { plan_id, tokens_month, feature_flags } = body as {
    plan_id: PlanId; tokens_month?: number; feature_flags?: Record<string, boolean>;
  };

  if (!PLAN_IDS.includes(plan_id)) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

  const supabase = createServiceClient();
  const { tokens, features } = await getConfigRows();

  if (tokens_month !== undefined) {
    const updated = { ...tokens, [plan_id]: tokens_month };
    const { error } = await supabase
      .from("admin_platform_config")
      .update({ extra_data: updated, updated_at: new Date().toISOString() })
      .eq("platform", "plan_tokens");
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (feature_flags !== undefined) {
    const updated = { ...features, [plan_id]: feature_flags };
    const { error } = await supabase
      .from("admin_platform_config")
      .update({ extra_data: updated, updated_at: new Date().toISOString() })
      .eq("platform", "plan_features");
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
