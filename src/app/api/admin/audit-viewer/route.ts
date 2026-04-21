import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/adminAuth";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20")));
  const action = searchParams.get("action") ?? null;
  const userId = searchParams.get("user_id") ?? null;
  const offset = (page - 1) * limit;

  const supa = createServiceClient();

  try {
    let query = supa
      .from("audit_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (action) query = query.eq("action", action);
    if (userId) query = query.or(`actor_id.ilike.%${userId}%`);

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ logs: [], total: 0, page });
    }

    return NextResponse.json({
      logs: data ?? [],
      total: count ?? 0,
      page,
    });
  } catch {
    return NextResponse.json({ logs: [], total: 0, page });
  }
}
