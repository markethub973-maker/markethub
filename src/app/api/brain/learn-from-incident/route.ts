/**
 * POST /api/brain/learn-from-incident
 *
 * Feeds a past incident (or the most recent unresolved critical ones) to
 * Claude, who returns a preventive rule. The rule lands in
 * `brain_knowledge_base` with category="auto_learned" + tag "auto_learned"
 * so every agent reading ALEX_KNOWLEDGE_BRIEF rule 14 picks it up on their
 * next invocation.
 *
 * This closes the learning loop: incident happens → auto-rule created →
 * all agents adjust behavior → same incident doesn't repeat. No Eduard
 * involvement needed for minor operational patterns.
 *
 * Body: { incident_id?: string, scan_recent?: boolean, limit?: number }
 *   - incident_id: process one specific incident
 *   - scan_recent: process all unresolved critical/high incidents from last 48h
 *   - limit: cap on recent scan (default 10)
 *
 * Auth: x-brain-cron-secret (cron-gated; the GHA cron calls this every 30 min).
 *
 * GET ?since=ISO returns the latest auto_learned rules so Eduard can audit
 * what the system taught itself.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { generateText } from "@/lib/llm";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

interface IncidentRow {
  id: number;
  created_at: string;
  source: string;
  severity: string;
  subject: string;
  body_excerpt: string | null;
}

interface Learning {
  rule: string;
  context: string;
  applies_to: string[];
  severity: string;
}

function authOk(req: NextRequest): boolean {
  const secret = req.headers.get("x-brain-cron-secret");
  return Boolean(secret && secret === process.env.BRAIN_CRON_SECRET);
}

async function extractRule(incident: IncidentRow): Promise<Learning | null> {
  const sys = `You are a platform operations engineer. Read an incident and extract ONE preventive rule for the AI team (Alex + directors) so it doesn't repeat.

Return JSON with these fields:
- rule: imperative sentence ("Never X when Y", "Always Z before W")
- context: one sentence describing the situation where the rule applies
- applies_to: array of which agents should adopt the rule — any of ["alex","cmo","sales","content","analyst","researcher","competitive","copywriter","strategist","finance","legal"] — use ["all"] if everyone
- severity: "critical" | "high" | "medium" | "low" — how important is enforcement

Output VALID JSON only, no markdown, no commentary.`;

  const user = `Incident:
  subject: ${incident.subject}
  severity: ${incident.severity}
  source: ${incident.source}
  body: ${(incident.body_excerpt ?? "").slice(0, 1500)}

Return the preventive rule JSON.`;

  const raw = await generateText(sys, user, { maxTokens: 400 });
  if (!raw) return null;
  try {
    const jsonStart = raw.indexOf("{");
    const jsonEnd = raw.lastIndexOf("}");
    if (jsonStart < 0 || jsonEnd < 0) return null;
    const parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1)) as Learning;
    if (!parsed.rule || !parsed.context) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function processIncident(incident: IncidentRow): Promise<{
  ok: boolean;
  incident_id: number;
  learning?: Learning;
  kb_id?: string;
  error?: string;
}> {
  const svc = createServiceClient();

  // Skip if we already learned from this incident.
  const { data: existing } = await svc
    .from("brain_knowledge_base")
    .select("id")
    .eq("category", "auto_learned")
    .contains("tags", [`incident:${incident.id}`])
    .maybeSingle();
  if (existing) return { ok: true, incident_id: incident.id, kb_id: existing.id as string };

  const learning = await extractRule(incident);
  if (!learning) return { ok: false, incident_id: incident.id, error: "LLM did not return a usable rule" };

  const { data: inserted, error } = await svc
    .from("brain_knowledge_base")
    .insert({
      // First-class category="auto_learned" (post 2026-04-16 DDL).
      category: "auto_learned",
      name: `Auto-rule: ${learning.rule.slice(0, 80)}`,
      summary: learning.context,
      content: {
        rule: learning.rule,
        context: learning.context,
        applies_to: learning.applies_to,
        severity: learning.severity,
        source_incident_id: incident.id,
        source_incident_subject: incident.subject,
        learned_at: new Date().toISOString(),
      } as unknown as Record<string, unknown>,
      tags: ["auto_learned", `incident:${incident.id}`, ...(learning.applies_to ?? [])],
      source: "learn-from-incident endpoint",
      confidence: 0.85,
    })
    .select("id")
    .single();

  if (error) return { ok: false, incident_id: incident.id, error: error.message };
  return { ok: true, incident_id: incident.id, learning, kb_id: inserted?.id as string };
}

export async function POST(req: NextRequest) {
  if (!authOk(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    incident_id?: number;
    scan_recent?: boolean;
    limit?: number;
  };

  const svc = createServiceClient();
  let incidents: IncidentRow[];

  if (body.incident_id) {
    const { data } = await svc
      .from("ops_incidents")
      .select("id, created_at, source, severity, subject, body_excerpt")
      .eq("id", body.incident_id)
      .maybeSingle();
    if (!data) return NextResponse.json({ error: "incident not found" }, { status: 404 });
    incidents = [data as IncidentRow];
  } else if (body.scan_recent !== false) {
    // Default: scan last 48h of unresolved critical/high incidents
    const since = new Date(Date.now() - 48 * 3600_000).toISOString();
    const { data } = await svc
      .from("ops_incidents")
      .select("id, created_at, source, severity, subject, body_excerpt")
      .is("resolved_at", null)
      .in("severity", ["critical", "high"])
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(body.limit ?? 10);
    incidents = (data ?? []) as IncidentRow[];
  } else {
    return NextResponse.json({ error: "either incident_id or scan_recent required" }, { status: 400 });
  }

  const results = [];
  for (const inc of incidents) {
    results.push(await processIncident(inc));
  }

  return NextResponse.json({
    ok: true,
    processed: results.length,
    created: results.filter((r) => r.ok && r.learning).length,
    skipped_already_learned: results.filter((r) => r.ok && !r.learning && r.kb_id).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  });
}

export async function GET(req: NextRequest) {
  if (!authOk(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sinceParam = req.nextUrl.searchParams.get("since");
  const since = sinceParam ?? new Date(Date.now() - 7 * 24 * 3600_000).toISOString();
  const svc = createServiceClient();
  const { data } = await svc
    .from("brain_knowledge_base")
    .select("id, created_at, name, summary, content, tags, confidence")
    .eq("category", "auto_learned")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(50);
  return NextResponse.json({ ok: true, count: (data ?? []).length, learnings: data ?? [] });
}
