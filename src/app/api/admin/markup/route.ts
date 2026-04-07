/**
 * Admin Markup & Value-Fee Settings
 *
 * Storage: admin_platform_config table (already exists), row with platform='markup_settings'.
 * This avoids needing the platform_settings table (which requires exec_sql to create).
 * Format: extra_data JSONB column stores all 5 settings.
 */
import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/adminAuth";
import { createServiceClient } from "@/lib/supabase/service";

const PLATFORM_KEY = "markup_settings";

const DEFAULTS = {
  markup_percent:    20,
  value_fee_percent: 10,
  value_fee_min_usd: 5,
  value_fee_max_usd: 500,
  value_fee_enabled: true,
};

async function loadSettings(supa: ReturnType<typeof createServiceClient>) {
  const { data } = await supa
    .from("admin_platform_config" as any)
    .select("extra_data")
    .eq("platform", PLATFORM_KEY)
    .maybeSingle();
  const d = (data?.extra_data as Record<string, any>) ?? {};
  return {
    markup_percent:    typeof d.markup_percent    === "number" ? d.markup_percent    : DEFAULTS.markup_percent,
    value_fee_percent: typeof d.value_fee_percent === "number" ? d.value_fee_percent : DEFAULTS.value_fee_percent,
    value_fee_min_usd: typeof d.value_fee_min_usd === "number" ? d.value_fee_min_usd : DEFAULTS.value_fee_min_usd,
    value_fee_max_usd: typeof d.value_fee_max_usd === "number" ? d.value_fee_max_usd : DEFAULTS.value_fee_max_usd,
    value_fee_enabled: typeof d.value_fee_enabled === "boolean" ? d.value_fee_enabled : DEFAULTS.value_fee_enabled,
  };
}

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const supa = createServiceClient();

  const settings = await loadSettings(supa);

  // Aggregate costs from api_cost_logs (graceful — table may not exist yet)
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: costs } = await supa
    .from("api_cost_logs" as any)
    .select("service, cost_usd, created_at, operation")
    .gte("created_at", since)
    .order("created_at", { ascending: false });

  const rows = (costs ?? []) as any[];
  const totalUsd = rows.reduce((s: number, r: any) => s + (parseFloat(r.cost_usd) || 0), 0);
  const byService: Record<string, number> = {};
  const byOp: Record<string, number> = {};
  for (const r of rows) {
    byService[r.service] = (byService[r.service] || 0) + (parseFloat(r.cost_usd) || 0);
    byOp[r.operation]   = (byOp[r.operation]   || 0) + (parseFloat(r.cost_usd) || 0);
  }

  return NextResponse.json({
    settings,
    markup_percent: settings.markup_percent, // legacy field
    costs_30d: {
      total_usd:    totalUsd,
      by_service:   byService,
      by_operation: byOp,
      calls_count:  rows.length,
    },
  });
}

export async function POST(req: NextRequest) {
  if (!isAdminAuthorized(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const {
    markup_percent,
    value_fee_percent,
    value_fee_min_usd,
    value_fee_max_usd,
    value_fee_enabled,
  } = body;

  if (typeof markup_percent !== "number" || markup_percent < 0 || markup_percent > 500) {
    return NextResponse.json({ error: "markup_percent must be 0-500" }, { status: 400 });
  }

  const extra_data = {
    markup_percent,
    value_fee_percent:  typeof value_fee_percent  === "number"  ? value_fee_percent  : DEFAULTS.value_fee_percent,
    value_fee_min_usd:  typeof value_fee_min_usd  === "number"  ? value_fee_min_usd  : DEFAULTS.value_fee_min_usd,
    value_fee_max_usd:  typeof value_fee_max_usd  === "number"  ? value_fee_max_usd  : DEFAULTS.value_fee_max_usd,
    value_fee_enabled:  typeof value_fee_enabled  === "boolean" ? value_fee_enabled  : DEFAULTS.value_fee_enabled,
  };

  const supa = createServiceClient();
  const { error } = await supa
    .from("admin_platform_config" as any)
    .upsert({
      platform:   PLATFORM_KEY,
      token:      "config",
      extra_data,
      updated_at: new Date().toISOString(),
    }, { onConflict: "platform" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, settings: extra_data });
}
