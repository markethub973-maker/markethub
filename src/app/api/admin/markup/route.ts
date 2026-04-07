import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/adminAuth";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const supa = createServiceClient();

  const { data, error } = await supa
    .from("platform_settings" as any)
    .select("key, value")
    .in("key", ["api_markup_percent"]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Also fetch aggregate costs (last 30 days)
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: costs } = await supa
    .from("api_cost_logs" as any)
    .select("service, cost_usd, created_at, operation, user_id")
    .gte("created_at", since)
    .order("created_at", { ascending: false });

  const rows = (costs ?? []) as any[];
  const totalUsd = rows.reduce((s: number, r: any) => s + (parseFloat(r.cost_usd) || 0), 0);
  const byService: Record<string, number> = {};
  const byOp: Record<string, number> = {};
  for (const r of rows) {
    byService[r.service] = (byService[r.service] || 0) + parseFloat(r.cost_usd);
    byOp[r.operation] = (byOp[r.operation] || 0) + parseFloat(r.cost_usd);
  }

  const settings: Record<string, string> = {};
  for (const row of (data ?? []) as any[]) settings[row.key] = row.value;

  return NextResponse.json({
    markup_percent: parseFloat(settings["api_markup_percent"] ?? "20"),
    costs_30d: {
      total_usd: totalUsd,
      by_service: byService,
      by_operation: byOp,
      calls_count: rows.length,
    },
  });
}

export async function POST(req: NextRequest) {
  if (!isAdminAuthorized(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { markup_percent } = await req.json();
  if (typeof markup_percent !== "number" || markup_percent < 0 || markup_percent > 500) {
    return NextResponse.json({ error: "markup_percent must be 0-500" }, { status: 400 });
  }

  const supa = createServiceClient();
  const { error } = await supa
    .from("platform_settings" as any)
    .upsert({ key: "api_markup_percent", value: String(markup_percent), updated_at: new Date().toISOString() });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, markup_percent });
}
