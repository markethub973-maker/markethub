/**
 * Admin — Support Tickets management (M4 Sprint 1)
 *
 * GET  — list all tickets with filters
 * PATCH — update status + admin reply
 */

import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/adminAuth";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supa = createServiceClient();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const limit = Number(searchParams.get("limit") ?? 50);

  let query = supa
    .from("support_tickets")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Counts for filter chips
  const { data: counts } = await supa
    .from("support_tickets")
    .select("status", { count: "exact" });

  const statusCounts: Record<string, number> = {};
  for (const r of counts ?? []) {
    statusCounts[r.status] = (statusCounts[r.status] ?? 0) + 1;
  }

  return NextResponse.json({
    ok: true,
    tickets: data ?? [],
    counts: statusCounts,
  });
}

export async function PATCH(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    ticket_id?: string;
    status?: string;
    admin_reply?: string;
    resolution_note?: string;
  } | null;

  if (!body?.ticket_id) {
    return NextResponse.json({ error: "ticket_id required" }, { status: 400 });
  }

  const supa = createServiceClient();
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.status) update.status = body.status;
  if (body.status === "resolved") update.resolved_at = new Date().toISOString();
  if (body.resolution_note) update.resolution_note = body.resolution_note;

  const { error } = await supa
    .from("support_tickets")
    .update(update)
    .eq("id", body.ticket_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // If admin replied, add message to thread
  if (body.admin_reply) {
    await supa.from("support_messages").insert({
      ticket_id: body.ticket_id,
      sender_type: "admin",
      sender_name: "MarketHub Team",
      message: body.admin_reply,
    });
  }

  return NextResponse.json({ ok: true });
}
