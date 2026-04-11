/**
 * Cockpit — Reactive SIEM endpoint.
 *
 * Fire-and-forget target from `logSecurityEvent()` when a high/critical
 * security event is logged. Pulls the trigger event + the last 15 minutes
 * of events from the same IP (context window), asks Claude Haiku to decide
 * "is this an actual attack", and if YES:
 *   - writes a finding to `maintenance_findings` with agent = "reactive-siem"
 *   - writes a compact log to `cron_logs` for cockpit telemetry
 *
 * The existing email-alert path in logSecurityEvent still fires regardless.
 * This endpoint adds a second layer of narrative analysis on top, so the
 * Cockpit's warning-lights panel reflects the analyst's verdict, not just
 * the raw severity mapping.
 *
 * Auth: Bearer CRON_SECRET. Called ONLY from inside the app runtime.
 */
import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cronAuth";
import { reportFinding } from "@/lib/maintenanceAgent";
import { createServiceClient } from "@/lib/supabase/service";
import { getAppAnthropicClient } from "@/lib/anthropic-client";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

const AGENT_NAME = "reactive-siem";
const MODEL = "claude-haiku-4-5-20251001";

interface SecurityEventRow {
  id: string;
  event_type: string;
  severity: string;
  ip: string | null;
  user_agent: string | null;
  path: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

interface AnalystVerdict {
  kind: string;
  verdict: "false-alarm" | "isolated" | "attack-confirmed";
  severity: "info" | "low" | "medium" | "high" | "critical";
  title: string;
  reasoning: string;
  suggested_action: string;
}

const SYSTEM_PROMPT = `You are an always-on security analyst triaging a single just-fired security event on MarketHub Pro (a SaaS marketing platform).

You receive:
  - The trigger event (type, severity, IP, path, user_agent, details)
  - The last 15 minutes of events from the SAME IP (for context)

Your job: decide whether this specific event is:
  - "false-alarm"      — our own tooling (probe, cron, smoke test) or a legitimate user glitch
  - "isolated"         — a real suspicious event but not part of a coordinated attack
  - "attack-confirmed" — part of an obvious attack pattern (brute-force, credential stuffing, SSRF probing, etc.)

Be conservative — prefer "isolated" over "attack-confirmed" unless the evidence is clear (e.g., same IP 5+ failed admin logins in < 5 min, or SSRF attempt with private-IP payload).

IGNORE signals that look like our own maintenance probe agent:
  - User-Agent containing "viralstat-probe" or "gha-maint"
  - Event with null user_agent on /api/admin/*  (our probe strips UA)
  - Request coming from 162.158.x.x or other known Cloudflare edge IPs with no UA

Return STRICT JSON:
{
  "kind": "short-lowercase-id",
  "verdict": "false-alarm" | "isolated" | "attack-confirmed",
  "severity": "info" | "low" | "medium" | "high" | "critical",
  "title": "one-line summary (max 100 chars)",
  "reasoning": "1-3 sentences explaining the verdict",
  "suggested_action": "ONE concrete next step for the admin"
}`;

export async function POST(req: NextRequest) {
  if (!verifyCronSecret(req, "/api/cockpit/reactive-siem")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as { event_id?: string } | null;
  if (!body?.event_id) {
    return NextResponse.json({ error: "event_id required" }, { status: 400 });
  }

  const supa = createServiceClient();

  // 1. Pull the trigger event
  const { data: trigger, error: triggerErr } = await supa
    .from("security_events")
    .select("*")
    .eq("id", body.event_id)
    .single();

  if (triggerErr || !trigger) {
    return NextResponse.json({ error: "Event not found", details: triggerErr?.message }, { status: 404 });
  }

  const triggerRow = trigger as SecurityEventRow;

  // 2. Pull last 15 min of context from the same IP
  const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  let context: SecurityEventRow[] = [];
  if (triggerRow.ip) {
    const { data: ctx } = await supa
      .from("security_events")
      .select("*")
      .eq("ip", triggerRow.ip)
      .gte("created_at", fifteenMinAgo)
      .order("created_at", { ascending: false })
      .limit(50);
    context = ((ctx ?? []) as SecurityEventRow[]).filter((e) => e.id !== triggerRow.id);
  }

  // 3. Ask Haiku for verdict
  const anthropic = getAppAnthropicClient();
  let analystText = "";
  try {
    const resp = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `TRIGGER EVENT:\n${JSON.stringify(triggerRow, null, 2)}\n\nCONTEXT (last 15 min from same IP, ${context.length} events):\n${JSON.stringify(context, null, 2)}`,
        },
      ],
    });
    for (const block of resp.content) {
      if (block.type === "text") analystText += block.text;
    }
  } catch (e) {
    return NextResponse.json({
      error: "Haiku call failed",
      details: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }

  // 4. Parse JSON verdict
  let verdict: AnalystVerdict | null = null;
  try {
    const jsonStart = analystText.indexOf("{");
    const jsonEnd = analystText.lastIndexOf("}");
    if (jsonStart >= 0 && jsonEnd > jsonStart) {
      verdict = JSON.parse(analystText.slice(jsonStart, jsonEnd + 1)) as AnalystVerdict;
    }
  } catch { /* fall through */ }

  if (!verdict) {
    return NextResponse.json({
      error: "Haiku verdict not parseable",
      raw: analystText.slice(0, 500),
    }, { status: 500 });
  }

  // 5. Act on verdict
  if (verdict.verdict === "attack-confirmed" || verdict.verdict === "isolated") {
    const fp = `reactive-siem:${verdict.kind}:${triggerRow.ip ?? "unknown"}`;
    await reportFinding({
      agent: AGENT_NAME,
      severity: verdict.severity,
      fingerprint: fp,
      title: verdict.title,
      details: {
        verdict: verdict.verdict,
        reasoning: verdict.reasoning,
        trigger_event_id: triggerRow.id,
        trigger_type: triggerRow.event_type,
        ip: triggerRow.ip,
        path: triggerRow.path,
        context_size: context.length,
      },
      fix_suggestion: verdict.suggested_action,
    });
  }

  // 6. Log to cron_logs for cockpit telemetry
  try {
    await supa.from("cron_logs").insert({
      job: "cockpit-reactive-siem",
      ran_at: new Date().toISOString(),
      result: {
        trigger_id: triggerRow.id,
        verdict: verdict.verdict,
        kind: verdict.kind,
      },
    });
  } catch { /* ignore */ }

  return NextResponse.json({
    ok: true,
    verdict: verdict.verdict,
    kind: verdict.kind,
    severity: verdict.severity,
    action: verdict.verdict === "false-alarm" ? "ignored" : "finding-reported",
  });
}
