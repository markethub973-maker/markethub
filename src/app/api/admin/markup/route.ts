import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/adminAuth";
import { createServiceClient } from "@/lib/supabase/service";

const ALL_KEYS = [
  "api_markup_percent",
  "value_fee_percent",
  "value_fee_min_usd",
  "value_fee_max_usd",
  "value_fee_enabled",
];

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const supa = createServiceClient();

  const { data, error } = await supa
    .from("platform_settings" as any)
    .select("key, value")
    .in("key", ALL_KEYS);

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

  const s: Record<string, string> = {};
  for (const row of (data ?? []) as any[]) s[row.key] = row.value;

  return NextResponse.json({
    settings: {
      markup_percent:      parseFloat(s["api_markup_percent"] ?? "20"),
      value_fee_percent:   parseFloat(s["value_fee_percent"]  ?? "10"),
      value_fee_min_usd:   parseFloat(s["value_fee_min_usd"]  ?? "5"),
      value_fee_max_usd:   parseFloat(s["value_fee_max_usd"]  ?? "500"),
      value_fee_enabled:   s["value_fee_enabled"] !== "false",
    },
    // keep legacy field for old clients
    markup_percent: parseFloat(s["api_markup_percent"] ?? "20"),
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

  const supa = createServiceClient();
  const now = new Date().toISOString();

  const upserts = [
    { key: "api_markup_percent", value: String(markup_percent),    updated_at: now },
    { key: "value_fee_percent",  value: String(value_fee_percent ?? 10),  updated_at: now },
    { key: "value_fee_min_usd",  value: String(value_fee_min_usd ?? 5),   updated_at: now },
    { key: "value_fee_max_usd",  value: String(value_fee_max_usd ?? 500), updated_at: now },
    { key: "value_fee_enabled",  value: String(value_fee_enabled !== false), updated_at: now },
  ];

  const { error } = await supa
    .from("platform_settings" as any)
    .upsert(upserts);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
