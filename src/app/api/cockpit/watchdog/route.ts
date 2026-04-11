/**
 * Cockpit — Fast Watchdog endpoint.
 *
 * Called every 2 minutes from a GitHub Actions workflow. Does the MINIMUM
 * set of checks that cover "is anything breaking right now" without
 * running the full agent team:
 *
 *   1. Are the 3 critical cron endpoints returning 200? (auto-post,
 *      health-monitor, stripe webhook receiver)
 *   2. Has the security event volume in the last 2 min spiked above
 *      threshold? (hint of an in-progress attack)
 *   3. Is the latest Stripe webhook event < 2 hours old? (webhook receiver
 *      might have died silently — Stripe backs off aggressively on 500s)
 *   4. Is there at least one cron_logs row in the last 30 min? (detects
 *      "all crons stopped firing" case)
 *
 * Any anomaly → finding with agent = "watchdog". Tight budget: should
 * complete in < 8s so a 2-min schedule never overlaps itself.
 *
 * Auth: Bearer CRON_SECRET.
 */
import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cronAuth";
import { reportFinding, autoResolveStale } from "@/lib/maintenanceAgent";
import { createServiceClient } from "@/lib/supabase/service";

export const maxDuration = 15;
export const dynamic = "force-dynamic";

const AGENT_NAME = "watchdog";
const CRITICAL_PROBES = [
  "/api/cron/auto-post",
  "/api/cron/health-monitor",
];
// Threshold: more than N events in 2 min = spike → finding.
const EVENT_SPIKE_THRESHOLD = 15;
// Threshold: no Stripe webhook event in > this many minutes = webhook dead.
const STRIPE_WEBHOOK_MAX_AGE_MIN = 120;
// Threshold: no cron_logs row in > this many minutes = all crons dead.
const CRON_HEARTBEAT_MAX_AGE_MIN = 30;

async function probeCron(path: string, secret: string): Promise<{ ok: boolean; status: number; err?: string }> {
  try {
    const res = await fetch(`https://viralstat-dashboard.vercel.app${path}`, {
      headers: {
        Authorization: `Bearer ${secret}`,
        "x-maint-probe": "viralstat-probe/1",
      },
      signal: AbortSignal.timeout(6000),
      cache: "no-store",
    });
    return { ok: res.ok, status: res.status };
  } catch (e) {
    return { ok: false, status: 0, err: e instanceof Error ? e.message : String(e) };
  }
}

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req, "/api/cockpit/watchdog")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supa = createServiceClient();
  const active = new Set<string>();
  const secret = process.env.CRON_SECRET ?? "";
  const now = new Date();
  const twoMinAgo = new Date(now.getTime() - 2 * 60 * 1000).toISOString();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const cronHeartbeatAgo = new Date(now.getTime() - CRON_HEARTBEAT_MAX_AGE_MIN * 60 * 1000).toISOString();
  const stripeWebhookAgo = new Date(now.getTime() - STRIPE_WEBHOOK_MAX_AGE_MIN * 60 * 1000).toISOString();

  // Run independent checks in parallel
  const [probeResults, eventSpikeRes, webhookFreshRes, cronHeartbeatRes] = await Promise.all([
    Promise.all(CRITICAL_PROBES.map((p) => probeCron(p, secret).then((r) => ({ path: p, ...r })))),
    supa
      .from("security_events")
      .select("id", { count: "exact", head: true })
      .gte("created_at", twoMinAgo),
    supa
      .from("stripe_webhook_events")
      .select("processed_at", { count: "exact", head: false })
      .gte("processed_at", stripeWebhookAgo)
      .order("processed_at", { ascending: false })
      .limit(1),
    supa
      .from("cron_logs")
      .select("ran_at", { count: "exact", head: false })
      .gte("ran_at", cronHeartbeatAgo)
      .order("ran_at", { ascending: false })
      .limit(1),
  ]);

  // 1. Cron probe failures
  for (const r of probeResults) {
    if (r.ok) continue;
    const fp = `watchdog:cron-down:${r.path}`;
    active.add(fp);
    await reportFinding({
      agent: AGENT_NAME,
      severity: "critical",
      fingerprint: fp,
      title: `Critical cron ${r.path} DOWN — ${r.err ?? `HTTP ${r.status}`}`,
      details: { path: r.path, status: r.status, err: r.err ?? null, at: now.toISOString() },
      fix_suggestion: `Check Vercel logs for ${r.path} around ${now.toISOString()}. Re-run manually with Bearer CRON_SECRET.`,
    });
  }

  // 2. Security event spike
  const eventCount = eventSpikeRes.count ?? 0;
  if (eventCount >= EVENT_SPIKE_THRESHOLD) {
    const fp = `watchdog:event-spike`;
    active.add(fp);
    await reportFinding({
      agent: AGENT_NAME,
      severity: "high",
      fingerprint: fp,
      title: `Security event spike: ${eventCount} events in 2 min (threshold ${EVENT_SPIKE_THRESHOLD})`,
      details: {
        event_count: eventCount,
        window_start: twoMinAgo,
        window_end: now.toISOString(),
        threshold: EVENT_SPIKE_THRESHOLD,
      },
      fix_suggestion: `Open the Cockpit → SIEM radar, inspect top IPs, consider rate-limiting or blocking via Cloudflare WAF.`,
    });
  }

  // 3. Stripe webhook freshness — check if there's an event in the last 2 hours.
  // This is a signal that the receiver is healthy (we get Stripe events
  // multiple times a day normally). No event in 2h for a paying platform
  // usually means the webhook endpoint is broken.
  const webhookRows = (webhookFreshRes.data ?? []) as Array<{ processed_at: string }>;
  // Only alert if we've ever had webhook activity (skip on brand-new deploys)
  const { data: anyEverRow } = await supa
    .from("stripe_webhook_events")
    .select("processed_at")
    .order("processed_at", { ascending: false })
    .limit(1);
  const hasAnyWebhookHistory = (anyEverRow?.length ?? 0) > 0;
  if (hasAnyWebhookHistory && webhookRows.length === 0) {
    const fp = `watchdog:stripe-webhook-silent`;
    active.add(fp);
    await reportFinding({
      agent: AGENT_NAME,
      severity: "high",
      fingerprint: fp,
      title: `Stripe webhook silent for > ${STRIPE_WEBHOOK_MAX_AGE_MIN} min`,
      details: {
        threshold_min: STRIPE_WEBHOOK_MAX_AGE_MIN,
        last_known_event: anyEverRow?.[0]?.processed_at ?? null,
      },
      fix_suggestion: `Check /api/stripe/webhook route + Stripe Dashboard → Developers → Webhooks → last delivery attempts. If Stripe is retrying with errors, the receiver is broken.`,
    });
  }

  // 4. Cron heartbeat — if NO job logged in the last 30 min, something broke
  // the scheduler or the logger itself.
  const cronRows = (cronHeartbeatRes.data ?? []) as Array<{ ran_at: string }>;
  if (cronRows.length === 0) {
    const fp = `watchdog:cron-heartbeat-dead`;
    active.add(fp);
    await reportFinding({
      agent: AGENT_NAME,
      severity: "critical",
      fingerprint: fp,
      title: `No cron_logs rows in the last ${CRON_HEARTBEAT_MAX_AGE_MIN} min — scheduler dead or all crons broken`,
      details: { threshold_min: CRON_HEARTBEAT_MAX_AGE_MIN },
      fix_suggestion: `Verify Vercel cron schedule is enabled + GitHub Actions /5min workflows are still running. Trigger one cron manually to confirm writes still land in cron_logs.`,
    });
  }

  await autoResolveStale(AGENT_NAME, active);

  // Log to cron_logs so THIS watchdog run itself counts as a heartbeat
  // (otherwise we'd false-positive ourselves at the 31-min mark).
  try {
    await supa.from("cron_logs").insert({
      job: "cockpit-watchdog",
      ran_at: now.toISOString(),
      result: {
        probes: probeResults,
        event_count: eventCount,
        webhook_fresh: webhookRows.length > 0,
        cron_heartbeat_ok: cronRows.length > 0,
        findings: active.size,
      },
    });
  } catch { /* ignore */ }

  return NextResponse.json({
    ok: active.size === 0,
    active_findings: active.size,
    checks: {
      cron_probes: probeResults,
      event_spike: { count: eventCount, threshold: EVENT_SPIKE_THRESHOLD, spike: eventCount >= EVENT_SPIKE_THRESHOLD },
      stripe_webhook_fresh: webhookRows.length > 0,
      cron_heartbeat_ok: cronRows.length > 0,
    },
    meta: { window_min: 2, now: now.toISOString(), one_hour_ago: oneHourAgo },
  });
}
