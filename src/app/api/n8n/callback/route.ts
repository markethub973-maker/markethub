/**
 * N8N Callback endpoint — M10 Sprint 1
 *
 * n8n workflows call this at the end of execution (via HTTP Request node).
 * Body must be HMAC-signed with MARKETHUB_WEBHOOK_SECRET.
 *
 * Body: { run_id, status: 'succeeded'|'failed', output?, error? }
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyN8NCallbackSignature } from "@/lib/n8n";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-markethub-signature") ?? "";

  if (!verifyN8NCallbackSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: {
    run_id?: string;
    status?: "succeeded" | "failed";
    output?: unknown;
    error?: string;
  };
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.run_id || (body.status !== "succeeded" && body.status !== "failed")) {
    return NextResponse.json({ error: "run_id + status required" }, { status: 400 });
  }

  const service = createServiceClient();
  const { data: run } = await service
    .from("automation_runs")
    .select("started_at")
    .eq("id", body.run_id)
    .maybeSingle();

  const started = run?.started_at ? new Date(run.started_at as string).getTime() : Date.now();
  const duration = Date.now() - started;

  const { error } = await service
    .from("automation_runs")
    .update({
      status: body.status,
      output: body.output ?? null,
      error: body.error ?? null,
      finished_at: new Date().toISOString(),
      duration_ms: duration,
    })
    .eq("id", body.run_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
