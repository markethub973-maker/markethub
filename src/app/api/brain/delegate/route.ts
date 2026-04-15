/**
 * /api/brain/delegate — operator turns on/off "Delegate Mode".
 *
 * POST  { action: "start", hours: number, rules: object }
 * POST  { action: "stop" }
 * GET   → current active session (or null)
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

function authOk(req: NextRequest): boolean {
  return req.cookies.get("brain_admin")?.value === "1";
}

export async function GET(req: NextRequest) {
  if (!authOk(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const svc = createServiceClient();
  const { data } = await svc
    .from("delegate_sessions")
    .select("*")
    .eq("active", true)
    .gt("ends_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return NextResponse.json({ ok: true, session: data ?? null });
}

export async function POST(req: NextRequest) {
  if (!authOk(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as {
    action?: "start" | "stop";
    hours?: number;
    rules?: Record<string, unknown>;
  };
  const svc = createServiceClient();

  if (body.action === "stop") {
    // Close any active session
    const { data: active } = await svc
      .from("delegate_sessions")
      .select("id")
      .eq("active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (active) {
      await svc
        .from("delegate_sessions")
        .update({ active: false, ended_at: new Date().toISOString() })
        .eq("id", active.id);
    }
    return NextResponse.json({ ok: true, action: "stopped" });
  }

  if (body.action === "start") {
    const hours = Math.max(0.25, Math.min(12, body.hours ?? 1));
    const endsAt = new Date(Date.now() + hours * 3600 * 1000).toISOString();
    // Close any prior active session first
    await svc
      .from("delegate_sessions")
      .update({ active: false, ended_at: new Date().toISOString() })
      .eq("active", true);
    const { data, error } = await svc
      .from("delegate_sessions")
      .insert({
        ends_at: endsAt,
        active: true,
        rules: body.rules ?? {
          no_spending: true,
          approve_small_outreach: true,
          approve_content_drafts: true,
          block_pricing_changes: true,
          block_pivots: true,
        },
      })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, session: data });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
