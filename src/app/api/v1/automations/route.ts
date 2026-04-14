/**
 * GET /api/v1/automations — list automation runs for the authenticated user.
 *
 * Query params:
 *   ?limit=20 (max 100)
 *   ?status=succeeded|failed|running|queued
 *   ?template_slug=social-cross-post
 *
 * Returns latest 20 runs by default. Authenticated with API token.
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
    return NextResponse.json(
      { error: "Invalid or missing API token" },
      { status: 401 },
    );
  }

  const p = req.nextUrl.searchParams;
  const limit = Math.min(parseInt(p.get("limit") ?? "20"), 100);
  const status = p.get("status");
  const slug = p.get("template_slug");

  const service = createServiceClient();
  let q = service
    .from("automation_runs")
    .select("id,template_slug,status,error,started_at,finished_at,duration_ms")
    .eq("user_id", auth.user_id)
    .order("started_at", { ascending: false })
    .limit(limit);
  if (status) q = q.eq("status", status);
  if (slug) q = q.eq("template_slug", slug);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, runs: data ?? [] });
}
