import { NextRequest, NextResponse } from "next/server";
import { bridgeAuth } from "@/lib/bridgeAuth";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * GET /api/bridge/leads — List prospects from brain_global_prospects
 * Query params: ?status=prospect&limit=50&offset=0
 */
export async function GET(req: NextRequest) {
  const auth = bridgeAuth(req);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "prospect";
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
  const offset = parseInt(searchParams.get("offset") || "0");

  const supa = createServiceClient();

  let query = supa
    .from("brain_global_prospects")
    .select("id, domain, business_name, email, phone, country_code, snippet, source, outreach_status, fit_score, detected_needs, last_scanned_at, created_at")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status !== "all") {
    query = query.eq("outreach_status", status);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ leads: data ?? [], count: data?.length ?? 0, offset, limit });
}

/**
 * POST /api/bridge/leads — Create or update a prospect
 * Body: { domain, business_name, email?, phone?, country_code?, snippet?, source?, fit_score?, detected_needs?, outreach_status? }
 */
export async function POST(req: NextRequest) {
  const auth = bridgeAuth(req);
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  if (!body || !body.domain) {
    return NextResponse.json({ error: "domain is required" }, { status: 400 });
  }

  const supa = createServiceClient();

  const payload = {
    domain: body.domain,
    business_name: body.business_name || body.domain,
    email: body.email || null,
    phone: body.phone || null,
    country_code: body.country_code || null,
    snippet: body.snippet || null,
    source: body.source || "zurio-bridge",
    outreach_status: body.outreach_status || "prospect",
    fit_score: body.fit_score || null,
    detected_needs: body.detected_needs || null,
    last_scanned_at: new Date().toISOString(),
  };

  // Upsert by domain
  const { data, error } = await supa
    .from("brain_global_prospects")
    .upsert(payload, { onConflict: "domain" })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ lead: data, created: true });
}
