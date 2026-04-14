/**
 * N8N Trigger endpoint — M10 Sprint 1
 *
 * POST { template_slug, inputs } → dispatches to self-hosted n8n.
 * Authenticated users only.
 *
 * n8n completion calls back to /api/n8n/callback with HMAC signature
 * to mark runs as succeeded/failed + store output.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { triggerAutomation } from "@/lib/n8n";
import { parseBody, N8NTriggerSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await parseBody(req, N8NTriggerSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  const result = await triggerAutomation(user.id, body.template_slug, body.inputs);
  return NextResponse.json(result, { status: result.ok ? 202 : 500 });
}

export async function GET(req: NextRequest) {
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 20), 100);
  const { data, error } = await supa
    .from("automation_runs")
    .select("id,template_slug,status,error,started_at,finished_at,duration_ms")
    .eq("user_id", user.id)
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, runs: data ?? [] });
}
