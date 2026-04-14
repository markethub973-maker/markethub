import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isAdminAuthorized } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const format = searchParams.get("format"); // "csv" for export
  const limit  = Math.min(parseInt(searchParams.get("limit")  ?? "50"), 10000);
  const offset = parseInt(searchParams.get("offset") ?? "0");
  const action = searchParams.get("action") ?? null;
  const fromDate = searchParams.get("from"); // ISO date YYYY-MM-DD
  const toDate   = searchParams.get("to");
  const search   = searchParams.get("q")?.trim() || null; // actor_id or ip

  const supa = createServiceClient();

  let query = supa
    .from("audit_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (action) query = query.eq("action", action);
  if (fromDate) query = query.gte("created_at", `${fromDate}T00:00:00Z`);
  if (toDate)   query = query.lte("created_at", `${toDate}T23:59:59Z`);
  if (search) {
    // Match either actor_id or IP (OR filter)
    query = query.or(`actor_id.ilike.%${search}%,ip.ilike.%${search}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    // Table may not exist yet — return empty gracefully
    if (format === "csv") return new Response("", { status: 200, headers: { "Content-Type": "text/csv" } });
    return NextResponse.json({ logs: [], total: 0 });
  }

  // CSV export branch — useful for compliance/audit requests
  if (format === "csv") {
    const rows = data ?? [];
    const header = ["timestamp", "action", "actor", "target", "entity", "ip", "user_agent", "details"];
    const csvRows = [
      header.join(","),
      ...rows.map((r) => {
        const cells = [
          r.created_at,
          r.action,
          r.actor_id ?? "",
          r.target_id ?? "",
          r.entity_type ?? "",
          r.ip ?? "",
          r.user_agent ?? "",
          r.details ? JSON.stringify(r.details) : "",
        ];
        return cells
          .map((c) => {
            const s = String(c ?? "");
            // Quote if contains comma, quote, or newline
            if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
            return s;
          })
          .join(",");
      }),
    ];
    const csv = csvRows.join("\n");
    const today = new Date().toISOString().slice(0, 10);
    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="audit-logs-${today}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }

  return NextResponse.json({ logs: data ?? [], total: count ?? 0 });
}
