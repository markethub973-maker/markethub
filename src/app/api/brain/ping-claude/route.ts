/**
 * Bidirectional Claude (dev) ↔ Alex / agents / operator channel.
 *
 * POST — Alex, any agent, the Telegram webhook, or a cron can drop a
 * message FOR Claude (dev) by posting here. Stored in brain_agent_activity
 * with activity="ping_claude" and result.picked_up=false. Reusable without
 * DDL — leverages the same table dev-pulse uses.
 *
 * GET — Claude CLI calls this at the start of a session to fetch pending
 * pings, automatically marking them picked_up. Default: returns last 24h
 * of unread pings (?since= overrides). Marks each one read after fetch.
 *
 * Companion to /api/brain/dev-pulse (which is one-way Claude → Alex).
 * Together they form a real two-way bridge: Claude pushes status updates
 * via dev-pulse, Alex/operators push asks/questions/blocks via ping-claude.
 *
 * Auth: x-brain-cron-secret header (machine-to-machine).
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

function authOk(req: NextRequest): boolean {
  const secret = req.headers.get("x-brain-cron-secret");
  return Boolean(secret && secret === process.env.BRAIN_CRON_SECRET);
}

interface PingRow {
  id: string;
  created_at: string;
  agent_id: string;
  agent_name: string;
  description: string;
  result: Record<string, unknown> | null;
}

export async function POST(req: NextRequest) {
  if (!authOk(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as {
    from?: string;          // who is asking — "alex" | "sofia" | "eduard_telegram" | etc.
    message?: string;       // the actual question/ask for Claude
    urgency?: "low" | "normal" | "high";
    context?: Record<string, unknown>;
  };
  if (!body.message || body.message.length < 3) {
    return NextResponse.json({ error: "message required (min 3 chars)" }, { status: 400 });
  }
  const from = (body.from || "alex").slice(0, 40);
  const urgency = body.urgency || "normal";

  const svc = createServiceClient();
  try {
    // activity="ping_claude" is a first-class value after the 2026-04-16
    // DDL migration widened brain_agent_activity_activity_check.
    const { data, error } = await svc
      .from("brain_agent_activity")
      .insert({
        agent_id: from === "eduard_telegram" ? "alex" : from, // valid AgentId required
        agent_name: from === "eduard_telegram" ? "Eduard (via Telegram)" : from,
        activity: "ping_claude",
        description: `[${urgency}] ${body.message.slice(0, 500)}`,
        result: {
          ...(body.context ?? {}),
          picked_up: false,
          urgency,
          from,
        },
      })
      .select("id, created_at")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, id: data?.id, at: data?.created_at, picked_up_when: "next Claude CLI session GET" });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "unknown" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  if (!authOk(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sinceParam = req.nextUrl.searchParams.get("since");
  const markRead = req.nextUrl.searchParams.get("mark_read") !== "false";
  const since = sinceParam ?? new Date(Date.now() - 24 * 3600_000).toISOString();

  const svc = createServiceClient();
  const { data, error } = await svc
    .from("brain_agent_activity")
    .select("id, created_at, agent_id, agent_name, description, result")
    .eq("activity", "ping_claude")
    .gte("created_at", since)
    .order("created_at", { ascending: true })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const rows = (data ?? []) as PingRow[];
  const pending = rows.filter((r) => {
    const result = r.result ?? {};
    return !(result.picked_up === true);
  });

  // Mark as picked up so Claude doesn't re-process them next session
  if (markRead && pending.length > 0) {
    const nowIso = new Date().toISOString();
    await Promise.all(
      pending.map((row) => {
        const next = { ...(row.result ?? {}), picked_up: true, picked_up_at: nowIso };
        return svc.from("brain_agent_activity").update({ result: next }).eq("id", row.id);
      }),
    );
  }

  return NextResponse.json({
    ok: true,
    count: pending.length,
    pings: pending.map((r) => ({
      id: r.id,
      at: r.created_at,
      from: (r.result as Record<string, unknown>)?.from ?? r.agent_name,
      urgency: (r.result as Record<string, unknown>)?.urgency ?? "normal",
      message: r.description.replace(/^\[(low|normal|high)\]\s*/, ""),
      context: r.result,
    })),
  });
}
