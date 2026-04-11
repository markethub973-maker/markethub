/**
 * Cockpit — aggregated live state endpoint.
 *
 * Returns everything the Cockpit UI needs in ONE round-trip so the front-end
 * can render all gauges/instruments from a single fetch. Runs all checks in
 * parallel with short timeouts to keep p95 < 2s even when individual
 * services are slow.
 *
 * Auth: admin session cookie (same as the rest of /api/admin/*), but lives
 * under /api/cockpit to keep the surface clean and future-tunable.
 */
import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/adminAuth";
import { createServiceClient } from "@/lib/supabase/service";

export const maxDuration = 15;
export const dynamic = "force-dynamic";

interface ServiceCheck {
  ok: boolean;
  latency_ms: number;
  detail: string;
}

async function checkSupabase(): Promise<ServiceCheck> {
  const t = Date.now();
  try {
    const supa = createServiceClient();
    const { error } = await supa.from("profiles").select("id").limit(1);
    return {
      ok: !error,
      latency_ms: Date.now() - t,
      detail: error?.message ?? "OK",
    };
  } catch (e) {
    return { ok: false, latency_ms: Date.now() - t, detail: e instanceof Error ? e.message : String(e) };
  }
}

async function checkAnthropic(): Promise<ServiceCheck> {
  const t = Date.now();
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { ok: false, latency_ms: 0, detail: "no key" };
  try {
    const res = await fetch("https://api.anthropic.com/v1/models", {
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01" },
      signal: AbortSignal.timeout(5000),
    });
    return { ok: res.ok, latency_ms: Date.now() - t, detail: res.ok ? "OK" : `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, latency_ms: Date.now() - t, detail: e instanceof Error ? e.message : String(e) };
  }
}

async function checkStripe(): Promise<ServiceCheck> {
  const t = Date.now();
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return { ok: false, latency_ms: 0, detail: "no key" };
  try {
    const res = await fetch("https://api.stripe.com/v1/balance", {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(5000),
    });
    return { ok: res.ok, latency_ms: Date.now() - t, detail: res.ok ? "OK" : `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, latency_ms: Date.now() - t, detail: e instanceof Error ? e.message : String(e) };
  }
}

async function checkResend(): Promise<ServiceCheck> {
  const t = Date.now();
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, latency_ms: 0, detail: "no key" };
  try {
    const res = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(5000),
    });
    return { ok: res.ok, latency_ms: Date.now() - t, detail: res.ok ? "OK" : `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, latency_ms: Date.now() - t, detail: e instanceof Error ? e.message : String(e) };
  }
}

async function checkCloudflare(): Promise<ServiceCheck> {
  const t = Date.now();
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!token) return { ok: true, latency_ms: 0, detail: "no token (skipped)" };
  try {
    const res = await fetch("https://api.cloudflare.com/client/v4/user/tokens/verify", {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    });
    return { ok: res.ok, latency_ms: Date.now() - t, detail: res.ok ? "OK" : `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, latency_ms: Date.now() - t, detail: e instanceof Error ? e.message : String(e) };
  }
}

async function checkApify(): Promise<ServiceCheck> {
  const t = Date.now();
  const token = process.env.APIFY_TOKEN;
  if (!token) return { ok: true, latency_ms: 0, detail: "no token (skipped)" };
  try {
    const res = await fetch("https://api.apify.com/v2/users/me", {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    });
    return { ok: res.ok, latency_ms: Date.now() - t, detail: res.ok ? "OK" : `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, latency_ms: Date.now() - t, detail: e instanceof Error ? e.message : String(e) };
  }
}

/** Compute an overall health score 0-100 from per-service results. */
function scoreHealth(services: Record<string, ServiceCheck>, findings: { critical: number; high: number; medium: number }): number {
  const total = Object.keys(services).length;
  const failed = Object.values(services).filter((s) => !s.ok).length;
  const serviceScore = ((total - failed) / total) * 70;
  const findingPenalty = Math.min(30, findings.critical * 15 + findings.high * 5 + findings.medium * 1);
  return Math.max(0, Math.round(serviceScore + (30 - findingPenalty)));
}

interface FindingRow {
  id: string;
  agent_name: string;
  severity: string;
  title: string;
  occurrences: number;
  last_seen: string;
  resolved: boolean;
}

interface SecurityEventRow {
  id: string;
  event_type: string;
  severity: string;
  ip: string | null;
  created_at: string;
}

interface CronLogRow {
  job: string;
  ran_at: string;
  result: Record<string, unknown> | null;
}

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supa = createServiceClient();
  const now = new Date();
  const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  // Run everything in parallel
  const [
    supabaseHealth,
    anthropicHealth,
    stripeHealth,
    resendHealth,
    cloudflareHealth,
    apifyHealth,
    findingsRes,
    securityEventsRes,
    cronLogsRes,
    activeSessionsRes,
    newSignupsRes,
  ] = await Promise.all([
    checkSupabase(),
    checkAnthropic(),
    checkStripe(),
    checkResend(),
    checkCloudflare(),
    checkApify(),
    supa
      .from("maintenance_findings")
      .select("id, agent_name, severity, title, occurrences, last_seen, resolved")
      .eq("resolved", false)
      .neq("agent_name", "digest")
      .order("last_seen", { ascending: false })
      .limit(50),
    supa
      .from("security_events")
      .select("id, event_type, severity, ip, created_at")
      .gte("created_at", twentyFourHoursAgo)
      .order("created_at", { ascending: false })
      .limit(200),
    supa
      .from("cron_logs")
      .select("job, ran_at, result")
      .order("ran_at", { ascending: false })
      .limit(15),
    // Approximate "active users last 5 min" via usage_tracking
    supa
      .from("usage_tracking")
      .select("user_id", { count: "exact", head: true })
      .gte("created_at", fiveMinAgo),
    supa
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("created_at", todayStart),
  ]);

  const services: Record<string, ServiceCheck> = {
    supabase: supabaseHealth,
    anthropic: anthropicHealth,
    stripe: stripeHealth,
    resend: resendHealth,
    cloudflare: cloudflareHealth,
    apify: apifyHealth,
  };

  const findings = (findingsRes.data ?? []) as FindingRow[];
  const findingCounts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const f of findings) {
    if (f.severity in findingCounts) findingCounts[f.severity as keyof typeof findingCounts]++;
  }

  const events = (securityEventsRes.data ?? []) as SecurityEventRow[];
  const eventsLastHour = events.filter((e) => e.created_at >= oneHourAgo).length;
  const highSeverityLast24h = events.filter((e) => e.severity === "high" || e.severity === "critical").length;

  // Top IPs by event count (last 24h)
  const ipCounts = new Map<string, number>();
  for (const e of events) {
    if (!e.ip) continue;
    ipCounts.set(e.ip, (ipCounts.get(e.ip) ?? 0) + 1);
  }
  const topIps = [...ipCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([ip, count]) => ({ ip, count }));

  // Cron status
  const cronLogs = (cronLogsRes.data ?? []) as CronLogRow[];
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
  const recentlyRanJobs = new Set(cronLogs.filter((c) => c.ran_at >= twoHoursAgo).map((c) => c.job));

  const healthScore = scoreHealth(services, findingCounts);
  const overallStatus: "healthy" | "degraded" | "critical" =
    healthScore >= 85 ? "healthy" : healthScore >= 60 ? "degraded" : "critical";

  return NextResponse.json({
    timestamp: now.toISOString(),
    overall: {
      status: overallStatus,
      score: healthScore,
    },
    services,
    metrics: {
      active_users_5min: activeSessionsRes.count ?? 0,
      new_signups_today: newSignupsRes.count ?? 0,
      events_last_hour: eventsLastHour,
      events_last_24h: events.length,
      high_severity_events_24h: highSeverityLast24h,
    },
    findings: {
      counts: findingCounts,
      total: findings.length,
      recent: findings.slice(0, 10).map((f) => ({
        id: f.id,
        agent: f.agent_name,
        severity: f.severity,
        title: f.title,
        occurrences: f.occurrences,
        last_seen: f.last_seen,
      })),
    },
    security: {
      events_last_hour: eventsLastHour,
      top_ips: topIps,
      recent_events: events.slice(0, 15).map((e) => ({
        id: e.id,
        type: e.event_type,
        severity: e.severity,
        ip: e.ip,
        at: e.created_at,
      })),
    },
    crons: {
      recently_active: recentlyRanJobs.size,
      last_runs: cronLogs.slice(0, 10).map((c) => ({
        job: c.job,
        ran_at: c.ran_at,
        result: c.result,
      })),
    },
  });
}
