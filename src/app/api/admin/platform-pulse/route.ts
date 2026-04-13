/**
 * Admin Platform Pulse — B unified status (post Sprint 1)
 *
 * Single endpoint that aggregates cross-module status for the
 * AdminCommandCenter "Subsystems" strip. One round trip instead of 4.
 *
 * Returns counts + simple status per subsystem:
 *  - security_agents: agents stale/missing vs total
 *  - support_tickets: open / escalated / resolved last 24h
 *  - learning_db:    total resolutions / new last 7d
 *  - automations:    total active templates / runs last 24h
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

const HEALTH_AGENTS = [
  { job: "security-scan", max_stale_min: 60 * 30, severity: "critical" },
  { job: "abuse-scan", max_stale_min: 60 * 30, severity: "high" },
  { job: "cockpit-reactive-siem", max_stale_min: 15, severity: "critical" },
  { job: "cockpit-watchdog", max_stale_min: 15, severity: "critical" },
  { job: "health-monitor", max_stale_min: 60 * 30, severity: "high" },
  { job: "cockpit-backup", max_stale_min: 60 * 30, severity: "high" },
  { job: "cockpit-daily-report", max_stale_min: 60 * 30, severity: "medium" },
  { job: "security-health-check", max_stale_min: 60 * 7, severity: "medium" },
];

export async function GET() {
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: profile } = await supa
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const service = createServiceClient();
  const now = Date.now();
  const dayAgo = new Date(now - 24 * 3600 * 1000).toISOString();
  const weekAgo = new Date(now - 7 * 24 * 3600 * 1000).toISOString();

  // Fetch in parallel
  const [agentRows, ticketRows, learningTotal, learningRecent, autoTemplates, autoRunsRecent] =
    await Promise.all([
      // Security agents — single query latest per job via DISTINCT ON
      service
        .from("cron_logs")
        .select("job,ran_at")
        .in("job", HEALTH_AGENTS.map((a) => a.job))
        .order("ran_at", { ascending: false })
        .limit(200), // we'll dedupe client-side
      service
        .from("support_tickets")
        .select("status,created_at"),
      service
        .from("resolved_issues")
        .select("id", { count: "exact", head: true }),
      service
        .from("resolved_issues")
        .select("id", { count: "exact", head: true })
        .gte("created_at", weekAgo),
      service
        .from("automation_templates")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true),
      service
        .from("automation_runs")
        .select("status,started_at")
        .gte("started_at", dayAgo),
    ]);

  // Security agents: dedupe latest per job
  const latestPerJob = new Map<string, string>();
  for (const r of agentRows.data ?? []) {
    if (!latestPerJob.has(r.job as string)) {
      latestPerJob.set(r.job as string, r.ran_at as string);
    }
  }
  let agentsOk = 0;
  let agentsStale = 0;
  let agentsMissing = 0;
  let criticalStale = 0;
  for (const a of HEALTH_AGENTS) {
    const last = latestPerJob.get(a.job);
    if (!last) {
      agentsMissing++;
      if (a.severity === "critical") criticalStale++;
      continue;
    }
    const ageMin = Math.floor((now - new Date(last).getTime()) / 60000);
    if (ageMin <= a.max_stale_min) agentsOk++;
    else {
      agentsStale++;
      if (a.severity === "critical") criticalStale++;
    }
  }
  const agentsStatus = criticalStale > 0 ? "critical" : agentsStale + agentsMissing > 0 ? "warning" : "ok";

  // Support tickets
  const tickets = ticketRows.data ?? [];
  const escalated = tickets.filter((t) => t.status === "escalated").length;
  const open = tickets.filter((t) => ["new", "ai_responded", "investigating"].includes(t.status as string)).length;
  const resolved24h = tickets.filter(
    (t) =>
      t.status === "resolved" &&
      new Date(t.created_at as string).getTime() > now - 24 * 3600 * 1000,
  ).length;
  const ticketsStatus = escalated > 0 ? "warning" : "ok";

  // Automation runs
  const runs = autoRunsRecent.data ?? [];
  const runsFailed = runs.filter((r) => r.status === "failed").length;
  const runsTotal = runs.length;
  const automationStatus = runsFailed > 0 && runsFailed / Math.max(runsTotal, 1) > 0.2 ? "warning" : "ok";

  return NextResponse.json({
    ok: true,
    pulse: {
      security_agents: {
        status: agentsStatus,
        ok: agentsOk,
        stale: agentsStale,
        missing: agentsMissing,
        total: HEALTH_AGENTS.length,
      },
      support_tickets: {
        status: ticketsStatus,
        open,
        escalated,
        resolved_24h: resolved24h,
        total: tickets.length,
      },
      learning_db: {
        status: "ok" as const,
        total: learningTotal.count ?? 0,
        new_7d: learningRecent.count ?? 0,
      },
      automations: {
        status: automationStatus,
        templates: autoTemplates.count ?? 0,
        runs_24h: runsTotal,
        runs_failed_24h: runsFailed,
      },
    },
  });
}
