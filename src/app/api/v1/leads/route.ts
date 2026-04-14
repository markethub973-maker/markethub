/**
 * GET /api/v1/leads — list the authenticated user's CRM leads.
 *
 * Query params:
 *   ?pipeline_status=new|qualified|contacted|won|lost (optional)
 *   ?source=facebook_groups|reddit|google_maps|... (optional)
 *   ?limit=20 (1-100)
 *   ?contacted=true|false (optional)
 *
 * Excludes internal extra_data JSON to keep payloads lean.
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
  const status = p.get("pipeline_status");
  const source = p.get("source");
  const contacted = p.get("contacted");

  const service = createServiceClient();
  let q = service
    .from("research_leads")
    .select(
      "id,name,category,city,phone,website,email,rating,reviews_count,source,lead_type,pipeline_status,contacted,estimated_value,close_date,last_activity_at,created_at",
    )
    .eq("user_id", auth.user_id)
    .order("last_activity_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (status) q = q.eq("pipeline_status", status);
  if (source) q = q.eq("source", source);
  if (contacted === "true") q = q.eq("contacted", true);
  if (contacted === "false") q = q.eq("contacted", false);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, leads: data ?? [] });
}
