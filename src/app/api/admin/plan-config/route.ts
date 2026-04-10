import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isAdminAuthorized } from "@/lib/adminAuth";
import { PLANS, type PlanId } from "@/lib/plan-config";
import { PLAN_FEATURES } from "@/lib/plan-features";

const PLAN_IDS: PlanId[] = ["free_test", "lite", "pro", "business", "enterprise"];

async function getFeatureOverrides(): Promise<Record<string, Record<string, boolean>>> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("admin_platform_config")
    .select("extra_data")
    .eq("platform", "plan_features")
    .single();
  return (data?.extra_data as Record<string, Record<string, boolean>>) ?? {};
}

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const features = await getFeatureOverrides();

  const plans = PLAN_IDS.map((id) => {
    const base = PLANS[id];
    return {
      id,
      name: base.name,
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

export async function POST(req: NextRequest) {
  if (!isAdminAuthorized(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { plan_id, feature_flags } = body as {
    plan_id: PlanId; feature_flags?: Record<string, boolean>;
  };

  if (!PLAN_IDS.includes(plan_id)) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

  if (feature_flags !== undefined) {
    const supabase = createServiceClient();
    const features = await getFeatureOverrides();
    const updated = { ...features, [plan_id]: feature_flags };
    const { error } = await supabase
      .from("admin_platform_config")
      .update({ extra_data: updated, updated_at: new Date().toISOString() })
      .eq("platform", "plan_features");
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
