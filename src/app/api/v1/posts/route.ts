/**
 * GET /api/v1/posts — list the authenticated user's scheduled posts.
 *
 * Query params:
 *   ?status=scheduled|published|draft|failed (optional)
 *   ?limit=20 (1-100)
 *   ?from=YYYY-MM-DD (optional lower bound on scheduled_for)
 *   ?to=YYYY-MM-DD   (optional upper bound)
 *
 * Returns latest first. Safe fields only — no internal token / OAuth refs.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/apiTokens";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await verifyToken(
    req.headers.get("authorization"),
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
  );
  if (!auth) {
    return NextResponse.json({ error: "Invalid or missing API token" }, { status: 401 });
  }

  const p = req.nextUrl.searchParams;
  const limit = Math.min(Math.max(parseInt(p.get("limit") ?? "20"), 1), 100);
  const status = p.get("status");
  const from = p.get("from");
  const to = p.get("to");

  const service = createServiceClient();
  let q = service
    .from("scheduled_posts")
    .select(
      "id,title,caption,platforms,media_urls,status,scheduled_for,published_at,created_at,updated_at",
    )
    .eq("user_id", auth.user_id)
    .order("scheduled_for", { ascending: false })
    .limit(limit);

  if (status) q = q.eq("status", status);
  if (from) q = q.gte("scheduled_for", `${from}T00:00:00Z`);
  if (to)   q = q.lte("scheduled_for", `${to}T23:59:59Z`);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, posts: data ?? [] });
}
