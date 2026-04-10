import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/adminAuth";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supa = createServiceClient();
  const severity = req.nextUrl.searchParams.get("severity");
  const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "100");

  let q = supa.from("security_events").select("*").order("created_at", { ascending: false }).limit(limit);
  if (severity) q = q.eq("severity", severity);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Summary stats
  const total = data?.length ?? 0;
  const bySeverity = (data ?? []).reduce((acc: Record<string, number>, e) => {
    acc[e.severity] = (acc[e.severity] ?? 0) + 1;
    return acc;
  }, {});

  return NextResponse.json({ events: data, total, by_severity: bySeverity });
}

export async function PATCH(req: NextRequest) {
  if (!isAdminAuthorized(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await req.json();
  const supa = createServiceClient();
  await supa.from("security_events").update({ resolved: true }).eq("id", id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  if (!isAdminAuthorized(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const supa = createServiceClient();
  // Delete resolved events older than 30 days
  const cutoff = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  await supa.from("security_events").delete().eq("resolved", true).lt("created_at", cutoff);
  return NextResponse.json({ ok: true });
}
