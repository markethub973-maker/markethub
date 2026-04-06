import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isAdminAuthorized } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const limit  = Math.min(parseInt(searchParams.get("limit")  ?? "50"), 200);
  const offset = parseInt(searchParams.get("offset") ?? "0");
  const action = searchParams.get("action") ?? null;

  const supa = createServiceClient();

  let query = supa
    .from("audit_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (action) query = query.eq("action", action);

  const { data, error, count } = await query;

  if (error) {
    // Table may not exist yet — return empty gracefully
    return NextResponse.json({ logs: [], total: 0 });
  }

  return NextResponse.json({ logs: data ?? [], total: count ?? 0 });
}
