/**
 * Admin Security Agents status — M6 Sprint 1
 *
 * Returns the same check /api/security/health-check runs, but gated
 * behind admin auth so we don't leak agent names publicly.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

const AGENTS: Array<{
  job: string;
  label: string;
  max_stale_min: number;
  severity: "critical" | "high" | "medium";
  kind: "security" | "maintenance" | "core";
}> = [
  { job: "security-scan", label: "Daily Security Scan", max_stale_min: 60 * 30, severity: "critical", kind: "security" },
  { job: "abuse-scan", label: "Daily Abuse Scan", max_stale_min: 60 * 30, severity: "high", kind: "security" },
  { job: "cockpit-reactive-siem", label: "Reactive SIEM (2m)", max_stale_min: 15, severity: "critical", kind: "security" },
  { job: "cockpit-watchdog", label: "Cockpit Watchdog (2m)", max_stale_min: 15, severity: "critical", kind: "security" },
  { job: "health-monitor", label: "Health Monitor (daily)", max_stale_min: 60 * 30, severity: "high", kind: "core" },
  { job: "refresh-tokens", label: "Token Refresh (weekly)", max_stale_min: 60 * 24 * 8, severity: "high", kind: "core" },
  { job: "cockpit-backup", label: "Cockpit Backup (daily)", max_stale_min: 60 * 30, severity: "high", kind: "maintenance" },
  { job: "cockpit-daily-report", label: "Daily Report", max_stale_min: 60 * 30, severity: "medium", kind: "maintenance" },
  { job: "security-health-check", label: "Health Check (6h)", max_stale_min: 60 * 7, severity: "medium", kind: "security" },
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
  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const service = createServiceClient();
  const now = Date.now();
  const statuses = [];
  for (const a of AGENTS) {
    const { data } = await service
      .from("cron_logs")
      .select("ran_at")
      .eq("job", a.job)
      .order("ran_at", { ascending: false })
      .limit(1);
    const last = data?.[0]?.ran_at as string | undefined;
    const ageMin = last ? Math.floor((now - new Date(last).getTime()) / 60000) : null;
    statuses.push({
      ...a,
      last_run: last ?? null,
      age_min: ageMin,
      status:
        ageMin === null ? "missing" : ageMin <= a.max_stale_min ? "ok" : "stale",
    });
  }

  const ok = statuses.filter((s) => s.status === "ok").length;
  const stale = statuses.filter((s) => s.status === "stale").length;
  const missing = statuses.filter((s) => s.status === "missing").length;
  const criticalBroken = statuses.some(
    (s) => s.status !== "ok" && s.severity === "critical",
  );
  const overall = criticalBroken ? "down" : stale + missing > 0 ? "degraded" : "ok";

  return NextResponse.json({
    ok: true,
    summary: { total: statuses.length, ok, stale, missing, overall },
    agents: statuses,
  });
}
