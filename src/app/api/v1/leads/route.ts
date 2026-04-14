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
import { dispatchWebhookEvent } from "@/lib/outboundWebhooks";

export const dynamic = "force-dynamic";

const VALID_PIPELINE = ["new", "qualified", "contacted", "won", "lost"];

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

/**
 * POST /api/v1/leads — create a lead.
 *
 * Body:
 *   {
 *     "name": "Acme Cafe",       // required
 *     "email": "...",            // optional
 *     "phone": "...",            // optional
 *     "city": "...",             // optional
 *     "website": "...",          // optional
 *     "category": "Restaurant",  // optional
 *     "source": "imported",      // optional, defaults "api"
 *     "pipeline_status": "new",  // optional, defaults "new"
 *     "notes": "..."             // optional
 *   }
 */
export async function POST(req: NextRequest) {
  const auth = await verifyToken(
    req.headers.get("authorization"),
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
  );
  if (!auth) {
    return NextResponse.json({ error: "Invalid or missing API token" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    name?: string;
    email?: string;
    phone?: string;
    city?: string;
    website?: string;
    category?: string;
    source?: string;
    pipeline_status?: string;
    notes?: string;
  } | null;

  if (!body?.name || body.name.trim().length < 1) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }

  const pipeline = body.pipeline_status && VALID_PIPELINE.includes(body.pipeline_status)
    ? body.pipeline_status
    : "new";

  const service = createServiceClient();
  const { data, error } = await service
    .from("research_leads")
    .insert({
      user_id: auth.user_id,
      name: body.name.trim().slice(0, 200),
      email: body.email?.trim().toLowerCase().slice(0, 254) ?? null,
      phone: body.phone?.trim().slice(0, 50) ?? null,
      city: body.city?.trim().slice(0, 100) ?? null,
      website: body.website?.trim().slice(0, 500) ?? null,
      category: body.category?.trim().slice(0, 100) ?? null,
      source: body.source?.trim().slice(0, 50) ?? "api",
      lead_type: "manual",
      pipeline_status: pipeline,
      notes: body.notes?.trim().slice(0, 5000) ?? null,
      contacted: false,
    })
    .select("id,name,email,phone,city,source,pipeline_status,created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (data) {
    void dispatchWebhookEvent(auth.user_id, "lead.created", {
      lead_id: data.id,
      name: data.name,
      email: data.email,
      source: data.source,
      pipeline_status: data.pipeline_status,
    });
  }

  return NextResponse.json({ ok: true, lead: data }, { status: 201 });
}

/**
 * PATCH /api/v1/leads?id=... — update lead status / contacted flag / notes.
 */
export async function PATCH(req: NextRequest) {
  const auth = await verifyToken(
    req.headers.get("authorization"),
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
  );
  if (!auth) {
    return NextResponse.json({ error: "Invalid or missing API token" }, { status: 401 });
  }
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const body = (await req.json().catch(() => null)) as {
    pipeline_status?: string;
    contacted?: boolean;
    notes?: string;
    estimated_value?: number;
    close_date?: string;
  } | null;
  if (!body) return NextResponse.json({ error: "body required" }, { status: 400 });

  const updates: Record<string, unknown> = { last_activity_at: new Date().toISOString() };
  if (body.pipeline_status && VALID_PIPELINE.includes(body.pipeline_status)) {
    updates.pipeline_status = body.pipeline_status;
  }
  if (typeof body.contacted === "boolean") updates.contacted = body.contacted;
  if (typeof body.notes === "string") updates.notes = body.notes.slice(0, 5000);
  if (typeof body.estimated_value === "number") updates.estimated_value = body.estimated_value;
  if (body.close_date) updates.close_date = body.close_date;

  const service = createServiceClient();
  const { data, error } = await service
    .from("research_leads")
    .update(updates)
    .eq("id", id)
    .eq("user_id", auth.user_id)
    .select("id,name,pipeline_status,contacted,estimated_value,close_date,last_activity_at")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Lead not found or not yours" }, { status: 404 });

  if (typeof updates.pipeline_status === "string") {
    void dispatchWebhookEvent(auth.user_id, "lead.status_changed", {
      lead_id: data.id,
      name: data.name,
      pipeline_status: data.pipeline_status,
      contacted: data.contacted,
    });
  }

  return NextResponse.json({ ok: true, lead: data });
}
