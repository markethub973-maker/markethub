/**
 * Admin API for the maintenance findings UI.
 *
 * GET    → list findings (unresolved by default, or ?include_resolved=1 for
 *          last-7-days resolved). Grouped totals in response.
 * PATCH  → { id, resolved: true|false } — manually flip a finding's resolved
 *          state. Sets `resolved_by` to `admin-manual`.
 */
import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/adminAuth";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supa = createServiceClient();
  const includeResolved = req.nextUrl.searchParams.get("include_resolved") === "1";

  const { data: unresolved, error: err1 } = await supa
    .from("maintenance_findings")
    .select("*")
    .eq("resolved", false)
    .neq("agent_name", "digest")
    .order("last_seen", { ascending: false })
    .limit(500);

  if (err1) return NextResponse.json({ error: err1.message }, { status: 500 });

  let resolved: unknown[] = [];
  if (includeResolved) {
    const cutoff = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
    const { data } = await supa
      .from("maintenance_findings")
      .select("*")
      .eq("resolved", true)
      .gte("resolved_at", cutoff)
      .neq("agent_name", "digest")
      .order("resolved_at", { ascending: false })
      .limit(200);
    resolved = data ?? [];
  }

  // Summary counts
  const counts: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const f of unresolved ?? []) {
    const sev = (f as { severity: string }).severity;
    counts[sev] = (counts[sev] ?? 0) + 1;
  }

  return NextResponse.json({
    unresolved: unresolved ?? [],
    resolved,
    counts,
    total_unresolved: unresolved?.length ?? 0,
  });
}

export async function PATCH(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as { id?: string; resolved?: boolean };
  if (!body.id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const supa = createServiceClient();
  const { error } = await supa
    .from("maintenance_findings")
    .update({
      resolved: body.resolved ?? true,
      resolved_at: body.resolved === false ? null : new Date().toISOString(),
      resolved_by: body.resolved === false ? null : "admin-manual",
    })
    .eq("id", body.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
