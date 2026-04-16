/**
 * POST /api/brain/dev-pulse
 *
 * Bridge between this Claude CLI dev session and the production AI team.
 * When the developer (Claude) takes a code/ops action that the agents
 * (Alex, Sofia, Vera, etc.) should be aware of — file changes, deploys,
 * test sends, manual fixes — POST a one-line description here and it
 * lands in `brain_agent_activity` with agent_id="dev".
 *
 * The boardroom UI surfaces these in the live feed (Layer 4 of cockpit).
 * `/api/brain/ask-agent` injects the latest dev events into every agent
 * conversation, so when Eduard asks Sofia a question she already knows
 * what Claude just changed in the codebase. No more "3 separate threads
 * not talking to each other".
 *
 * Body: { description: string, kind?: "code"|"deploy"|"test"|"ops"|"note", payload?: object }
 * Auth: x-brain-cron-secret header (no cookie path — this is machine-to-machine).
 *
 * GET version returns the last 20 dev events (so Claude can see what was
 * logged previously when resuming a session).
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

function authOk(req: NextRequest): boolean {
  const secret = req.headers.get("x-brain-cron-secret");
  return Boolean(secret && secret === process.env.BRAIN_CRON_SECRET);
}

export async function POST(req: NextRequest) {
  if (!authOk(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as {
    description?: string;
    kind?: "code" | "deploy" | "test" | "ops" | "note";
    payload?: Record<string, unknown>;
  };
  if (!body.description || body.description.length < 3) {
    return NextResponse.json({ error: "description required (min 3 chars)" }, { status: 400 });
  }
  const kind = body.kind ?? "note";

  const svc = createServiceClient();
  // Pattern: write a "completed" event so it shows immediately in the feed
  // (no parent "started" needed — these are atomic dev pings, not long jobs).
  try {
    const { data, error } = await svc
      .from("brain_agent_activity")
      .insert({
        agent_id: "dev",
        agent_name: "Claude (dev)",
        activity: "completed",
        description: `[${kind}] ${body.description.slice(0, 240)}`,
        result: body.payload ?? null,
      })
      .select("id, created_at")
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, id: data?.id, at: data?.created_at });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  if (!authOk(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const limit = Math.min(50, Number(req.nextUrl.searchParams.get("limit") ?? "20"));
  const svc = createServiceClient();
  const { data } = await svc
    .from("brain_agent_activity")
    .select("id, created_at, description, result")
    .eq("agent_id", "dev")
    .order("created_at", { ascending: false })
    .limit(limit);
  return NextResponse.json({ ok: true, events: data ?? [] });
}
