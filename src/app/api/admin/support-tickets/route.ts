/**
 * Admin — Support Tickets management (M4 Sprint 1)
 *
 * GET  — list all tickets with filters
 * PATCH — update status + admin reply
 */

import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/adminAuth";
import { createServiceClient } from "@/lib/supabase/service";
import { saveResolvedIssue } from "@/lib/learningDB";

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

  // M5 Learning DB — when a ticket becomes resolved with a note, persist
  // the resolution so future similar questions can find it.
  if (body.status === "resolved" && body.resolution_note) {
    const { data: ticket } = await supa
      .from("support_tickets")
      .select("message,category,language,created_at,ai_confidence")
      .eq("id", body.ticket_id)
      .maybeSingle();
    if (ticket) {
      const created = ticket.created_at ? new Date(ticket.created_at as string) : null;
      const resMin = created
        ? Math.max(1, Math.floor((Date.now() - created.getTime()) / 60000))
        : null;
      const rawCategory = (ticket.category as string | null) ?? "client_question";
      // Map support categories to learning categories
      const category =
        rawCategory === "bug" ? "bug"
        : rawCategory === "billing" ? "payment"
        : rawCategory === "feature_request" ? "feature_request"
        : rawCategory === "question" ? "client_question"
        : "other";
      await saveResolvedIssue({
        category: category as Parameters<typeof saveResolvedIssue>[0]["category"],
        symptom: (ticket.message as string) ?? "",
        solution: body.resolution_note,
        language: (ticket.language as string | undefined) ?? "en",
        source: "ticket",
        source_ref: body.ticket_id,
        auto_resolved: false,
        resolution_time_minutes: resMin,
      });
    }
  }

  return NextResponse.json({ ok: true });
}
