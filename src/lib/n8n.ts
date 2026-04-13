/**
 * N8N client — M10 Sprint 1
 *
 * Dispatches HMAC-signed requests to the self-hosted n8n instance at
 * automations.markethubpromo.com. Records run history in
 * `automation_runs`.
 *
 * Call flow:
 *   triggerAutomation(user, slug, inputs)
 *     → insert automation_runs (queued)
 *     → POST https://automations.markethubpromo.com/webhook/<path>
 *       with X-MarketHub-Signature: sha256=<hmac>
 *     → on 2xx: update run to running + store execution_id
 *     → on !2xx: update run to failed
 *
 * n8n workflows verify the signature via the MARKETHUB_WEBHOOK_SECRET env var.
 */

import { createHmac } from "crypto";
import { createServiceClient } from "@/lib/supabase/service";

const N8N_BASE = (process.env.N8N_BASE_URL ?? "").replace(/\/$/, "");
const WEBHOOK_SECRET = process.env.N8N_WEBHOOK_SECRET ?? "";

export interface TriggerResult {
  ok: boolean;
  run_id: string | null;
  status: "queued" | "running" | "succeeded" | "failed";
  execution_id?: string | null;
  error?: string;
}

export async function triggerAutomation(
  userId: string | null,
  slug: string,
  inputs: Record<string, unknown>,
): Promise<TriggerResult> {
  const service = createServiceClient();

  // 1. Look up template
  const { data: template } = await service
    .from("automation_templates")
    .select("slug,webhook_path,required_plan,is_active")
    .eq("slug", slug)
    .maybeSingle();

  if (!template || !template.is_active) {
    return { ok: false, run_id: null, status: "failed", error: "Template not found or inactive" };
  }

  // 2. Insert run record
  const { data: run } = await service
    .from("automation_runs")
    .insert({
      user_id: userId,
      template_slug: slug,
      status: "queued",
      inputs,
    })
    .select("id")
    .single();

  const runId = (run?.id as string) ?? null;
  if (!runId) {
    return { ok: false, run_id: null, status: "failed", error: "Failed to create run" };
  }

  if (!N8N_BASE || !WEBHOOK_SECRET) {
    await service
      .from("automation_runs")
      .update({
        status: "failed",
        error: "N8N not configured (N8N_BASE_URL or N8N_WEBHOOK_SECRET missing)",
        finished_at: new Date().toISOString(),
      })
      .eq("id", runId);
    return {
      ok: false,
      run_id: runId,
      status: "failed",
      error: "N8N not configured on this environment",
    };
  }

  // 3. Sign + dispatch
  const body = JSON.stringify({ run_id: runId, user_id: userId, inputs });
  const signature = createHmac("sha256", WEBHOOK_SECRET).update(body).digest("hex");

  const started = Date.now();
  try {
    const res = await fetch(`${N8N_BASE}/webhook/${template.webhook_path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-MarketHub-Signature": `sha256=${signature}`,
        "X-MarketHub-Run-Id": runId,
      },
      body,
      signal: AbortSignal.timeout(15_000),
    });

    const duration = Date.now() - started;
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      await service
        .from("automation_runs")
        .update({
          status: "failed",
          error: `n8n returned ${res.status}: ${errText.slice(0, 500)}`,
          finished_at: new Date().toISOString(),
          duration_ms: duration,
        })
        .eq("id", runId);
      return { ok: false, run_id: runId, status: "failed", error: `HTTP ${res.status}` };
    }

    const data = (await res.json().catch(() => ({}))) as { executionId?: string };
    await service
      .from("automation_runs")
      .update({
        status: "running",
        n8n_execution_id: data.executionId ?? null,
      })
      .eq("id", runId);

    return {
      ok: true,
      run_id: runId,
      status: "running",
      execution_id: data.executionId ?? null,
    };
  } catch (e) {
    const duration = Date.now() - started;
    await service
      .from("automation_runs")
      .update({
        status: "failed",
        error: e instanceof Error ? e.message : "Unknown dispatch error",
        finished_at: new Date().toISOString(),
        duration_ms: duration,
      })
      .eq("id", runId);
    return {
      ok: false,
      run_id: runId,
      status: "failed",
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}

export function verifyN8NCallbackSignature(body: string, signature: string): boolean {
  if (!WEBHOOK_SECRET) return false;
  const expected = createHmac("sha256", WEBHOOK_SECRET).update(body).digest("hex");
  const provided = signature.replace(/^sha256=/, "");
  if (expected.length !== provided.length) return false;
  // Constant-time compare
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ provided.charCodeAt(i);
  }
  return diff === 0;
}
