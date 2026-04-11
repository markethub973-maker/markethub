/**
 * Maintenance Agent 7 — SIEM Analyst (Claude Haiku-powered)
 *
 * Reads the last 24h of `security_events`, groups them by event_type + ip,
 * sends a compact summary to Claude Haiku 4.5, and asks the model to:
 *
 *   1. Flag genuine attack patterns (brute-force from single IP, coordinated
 *      scans from IP ranges, credential stuffing, SSRF probing, etc.).
 *   2. Rate each pattern's severity (low/medium/high/critical).
 *   3. Recommend a concrete response (block IP via Cloudflare, rotate a key,
 *      add a new middleware rule, etc.).
 *
 * Each pattern becomes a maintenance finding. Fingerprint is a hash of
 * (attack_kind + primary_ip) so repeated daily runs dedupe into occurrences
 * rather than inserting new rows.
 *
 * Why a Haiku analyst instead of hard-coded rules? The existing
 * /api/cron/security-scan already does brute-force counting with fixed
 * thresholds. The analyst adds narrative + cross-event pattern recognition
 * that's tedious to write as regex/SQL but trivial for an LLM.
 *
 * Auth: Bearer CRON_SECRET.
 */
import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cronAuth";
import { reportFinding, autoResolveStale } from "@/lib/maintenanceAgent";
import { createServiceClient } from "@/lib/supabase/service";
import { getAppAnthropicClient } from "@/lib/anthropic-client";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const AGENT_NAME = "siem-analyst";
const MODEL = "claude-haiku-4-5-20251001";

interface SecurityEventRow {
  id: string;
  event_type: string;
  ip: string | null;
  user_agent: string | null;
  path: string | null;
  severity: string;
  details: Record<string, unknown> | null;
  created_at: string;
}

interface GroupedEvent {
  event_type: string;
  ip: string | null;
  count: number;
  paths: string[];
  user_agents: string[];
  first: string;
  last: string;
  severities: string[];
}

interface AnalystPattern {
  kind: string; // short id, e.g. "brute-force-login" or "ssrf-probe"
  severity: "info" | "low" | "medium" | "high" | "critical";
  primary_ip: string | null;
  title: string;
  summary: string;
  response: string; // concrete recommended action
}

interface AnalystResponse {
  patterns: AnalystPattern[];
  all_clear: boolean;
  rationale: string;
}

const SYSTEM_PROMPT = `You are a security operations analyst reviewing 24 hours of SIEM events from a SaaS product (MarketHub Pro — a social media analytics platform hosted on Vercel, using Supabase + Stripe + Cloudflare).

You will receive a JSON array of grouped security events (already counted + deduped by event_type + ip). Your job:

1. Identify GENUINE attack patterns. Ignore normal background noise like:
   - Single-shot cron_unauthorized (usually misconfigured external caller)
   - Occasional admin_login_failed where count <= 2 (typos)
   - Low-severity scanner user agents hitting 404 pages without follow-through

2. Flag patterns like:
   - 5+ admin_login_failed from the same IP in 24h → brute-force admin
   - 10+ brute_force_login across multiple user paths from one IP → credential stuffing
   - Any ssrf_attempt → probe attempt, always high
   - Spike in plan_bypass_attempt from one user_id → privilege escalation try
   - Coordinated cron_unauthorized hitting multiple cron endpoints from one IP → recon

3. For each pattern, return:
   - kind: lowercase kebab-case id (stable across runs)
   - severity: info | low | medium | high | critical
   - primary_ip: the main source IP, or null if distributed
   - title: one-line human-readable summary (max 100 chars)
   - summary: 1-3 sentences explaining what the events show
   - response: ONE concrete action the human should take (e.g. "Block 203.0.113.42 via Cloudflare WAF custom rule", "Rotate ADMIN_TUNNEL_SECRET and force logout all admin sessions", "Add rate limit of 3/min on /api/admin-secret-login")

Return STRICT JSON matching this shape exactly:
{
  "patterns": [ { "kind": "...", "severity": "...", "primary_ip": "...", "title": "...", "summary": "...", "response": "..." } ],
  "all_clear": boolean,
  "rationale": "short explanation of why you flagged (or didn't flag) patterns"
}

If nothing looks suspicious, return { "patterns": [], "all_clear": true, "rationale": "..." }.

Be conservative — false positives waste admin attention. Only flag things that would make a human SOC analyst reach for the block button.`;

function groupEvents(events: SecurityEventRow[]): GroupedEvent[] {
  const map = new Map<string, GroupedEvent>();
  for (const e of events) {
    const key = `${e.event_type}:${e.ip ?? "unknown"}`;
    let g = map.get(key);
    if (!g) {
      g = {
        event_type: e.event_type,
        ip: e.ip,
        count: 0,
        paths: [],
        user_agents: [],
        first: e.created_at,
        last: e.created_at,
        severities: [],
      };
      map.set(key, g);
    }
    g.count++;
    if (e.path && !g.paths.includes(e.path)) g.paths.push(e.path);
    if (e.user_agent && !g.user_agents.includes(e.user_agent) && g.user_agents.length < 3) {
      g.user_agents.push(e.user_agent);
    }
    if (!g.severities.includes(e.severity)) g.severities.push(e.severity);
    if (e.created_at < g.first) g.first = e.created_at;
    if (e.created_at > g.last) g.last = e.created_at;
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

function fingerprintFor(p: AnalystPattern): string {
  return `siem:${p.kind}:${p.primary_ip ?? "distributed"}`;
}

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req, "/api/maint/siem-analyst")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supa = createServiceClient();

  // Pull last 24h of events. Cap hard at 1000 rows — if we have more than
  // that we're either under attack or logging too much noise, either way we
  // don't want to send 5000 rows to Haiku.
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: events, error } = await supa
    .from("security_events")
    .select("id, event_type, ip, user_agent, path, severity, details, created_at")
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(1000);

  if (error) {
    return NextResponse.json({ error: "Failed to fetch security_events", details: error.message }, { status: 500 });
  }

  const rawEvents = (events ?? []) as SecurityEventRow[];

  // Filter out events generated by our own maintenance probe agent. The
  // probe hits /api/admin/* and other protected routes on purpose to verify
  // the auth response, and the proxy used to log those as brute_force_admin.
  // We added an `x-maint-probe` header on the probe + a skip in proxy.ts so
  // future events won't include this noise, but historical events from the
  // last 24h still pollute the window. Filter them by user_agent (curl from
  // smoke tests) and by the known UNAUTH_API_PROBES paths from the probe agent.
  const PROBE_PATHS = new Set([
    "/api/instagram",
    "/api/linkedin",
    "/api/calendar",
    "/api/stripe/checkout",
    "/api/stripe/webhook",
    "/api/admin/pricing",
    "/api/admin/users",
    "/api/billing",
    "/api/assets",
    "/api/clients",
  ]);
  const eventList = rawEvents.filter((e) => {
    // Skip events that match our probe targets — no false positive feed.
    if (e.path && PROBE_PATHS.has(e.path)) return false;
    // Skip curl-issued events (smoke tests + manual ops from this terminal)
    if (e.user_agent && /^curl\//.test(e.user_agent)) return false;
    return true;
  });

  // Zero events is not a problem — still call autoResolveStale to clear any
  // prior findings that have aged out.
  if (eventList.length === 0) {
    await autoResolveStale(AGENT_NAME, new Set());
    return NextResponse.json({
      ok: true,
      events_in_window: rawEvents.length,
      events_after_filter: 0,
      patterns: 0,
      all_clear: true,
    });
  }

  const grouped = groupEvents(eventList);
  // Trim grouped to top 50 buckets so the prompt fits comfortably in Haiku's
  // context without wasting tokens. The tail of rare event types usually
  // isn't where an attack lives.
  const topGrouped = grouped.slice(0, 50);

  // Call Haiku for analysis
  const anthropic = getAppAnthropicClient();
  let analystText = "";
  try {
    const resp = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Analyze these grouped SIEM events from the last 24 hours:\n\n${JSON.stringify(topGrouped, null, 2)}`,
        },
      ],
    });
    for (const block of resp.content) {
      if (block.type === "text") analystText += block.text;
    }
  } catch (e) {
    return NextResponse.json(
      { error: "Haiku call failed", details: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }

  // Extract the JSON object from the response. Haiku sometimes wraps it in
  // ```json fences — strip those first.
  let parsed: AnalystResponse | null = null;
  try {
    const jsonStart = analystText.indexOf("{");
    const jsonEnd = analystText.lastIndexOf("}");
    if (jsonStart >= 0 && jsonEnd > jsonStart) {
      parsed = JSON.parse(analystText.slice(jsonStart, jsonEnd + 1)) as AnalystResponse;
    }
  } catch (e) {
    return NextResponse.json(
      { error: "Haiku output not valid JSON", raw: analystText.slice(0, 500), parseError: String(e) },
      { status: 500 },
    );
  }
  if (!parsed) {
    return NextResponse.json({ error: "No JSON found in Haiku output", raw: analystText.slice(0, 500) }, { status: 500 });
  }

  // Report each flagged pattern as a finding
  const active = new Set<string>();
  for (const p of parsed.patterns) {
    const fp = fingerprintFor(p);
    active.add(fp);
    await reportFinding({
      agent: AGENT_NAME,
      severity: p.severity,
      fingerprint: fp,
      title: p.title,
      details: {
        kind: p.kind,
        primary_ip: p.primary_ip,
        summary: p.summary,
        events_in_window: eventList.length,
        grouped_buckets: topGrouped.length,
      },
      fix_suggestion: p.response,
    });
  }

  await autoResolveStale(AGENT_NAME, active);

  return NextResponse.json({
    ok: parsed.all_clear,
    events_in_window: eventList.length,
    grouped_buckets: grouped.length,
    patterns: parsed.patterns.length,
    all_clear: parsed.all_clear,
    rationale: parsed.rationale,
    flagged: parsed.patterns.map((p) => ({
      kind: p.kind,
      severity: p.severity,
      ip: p.primary_ip,
      title: p.title,
    })),
  });
}
