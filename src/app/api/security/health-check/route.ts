/**
 * Security Health Check — M6 Sprint 1
 *
 * Verifies all security & maintenance agents are running on schedule.
 * Each agent declares an expected max staleness; if the latest cron_logs
 * row is older, it's flagged and escalated via Telegram + email.
 *
 * Trigger:
 *  - GET (Bearer CRON_SECRET) — full check, persists heartbeat, sends alerts.
 *    Vercel cron auto-injects Authorization: Bearer ${CRON_SECRET}.
 *  - GET (no auth) — public summary counts only, no alerts.
 *
 * Scheduled every 6h via vercel.json.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyCronSecret } from "@/lib/cronAuth";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Each agent: job name in cron_logs, human label, expected cadence in minutes,
// severity if stale.
const AGENTS: Array<{
  job: string;
  label: string;
  max_stale_min: number;
  severity: "critical" | "high" | "medium";
  kind: "security" | "maintenance" | "core";
}> = [
  { job: "security-scan", label: "Daily Security Scan", max_stale_min: 60 * 30, severity: "critical", kind: "security" },
  { job: "abuse-scan", label: "Daily Abuse Scan", max_stale_min: 60 * 36, severity: "high", kind: "security" }, // 36h tolerance — daily cron may skip occasionally
  // Reactive-SIEM is event-triggered (runs only when security events occur),
  // NOT a timer. 24h silence = no incidents, which is GOOD. Widen threshold
  // so the health check doesn't flag "stale" during quiet periods.
  { job: "cockpit-reactive-siem", label: "Reactive SIEM (event-driven)", max_stale_min: 60 * 24 * 7, severity: "medium", kind: "security" },
  // Cockpit-watchdog runs via GitHub Actions — cron claim "every 2 min" but
  // empirical observation 2026-04-16 shows gaps of 40 min to 4h because GH
  // Actions heavily throttles high-frequency scheduled workflows on private
  // repos past the free-tier minutes threshold. Tolerance widened to 180 min
  // and severity dropped from critical → high so stale watchdog no longer
  // triggers the GHA Security Health Check failure cascade. Next step:
  // reduce the workflow cadence to every 10 min to stay under the throttle.
  { job: "cockpit-watchdog", label: "Cockpit Watchdog (via GHA, throttled)", max_stale_min: 180, severity: "high", kind: "security" },
  { job: "health-monitor", label: "Health Monitor (daily)", max_stale_min: 60 * 30, severity: "high", kind: "core" },
  { job: "refresh-tokens", label: "Token Refresh (weekly)", max_stale_min: 60 * 24 * 8, severity: "high", kind: "core" },
  { job: "cockpit-backup", label: "Cockpit Backup (daily)", max_stale_min: 60 * 30, severity: "high", kind: "maintenance" },
  { job: "cockpit-daily-report", label: "Daily Report", max_stale_min: 60 * 30, severity: "medium", kind: "maintenance" },
];

interface AgentStatus {
  job: string;
  label: string;
  kind: string;
  severity: string;
  last_run: string | null;
  age_min: number | null;
  max_stale_min: number;
  status: "ok" | "stale" | "missing";
}

export async function GET(req: NextRequest) {
  const authed = verifyCronSecret(req, "/api/security/health-check");

  const statuses = await runChecks();
  const summary = summarize(statuses);

  if (!authed) {
    // Public summary only
    return NextResponse.json({ ok: true, summary });
  }

  // Alert if any critical stale OR 2+ high stale
  const criticalStale = statuses.filter(
    (s) => s.status !== "ok" && s.severity === "critical",
  ).length;
  const highStale = statuses.filter(
    (s) => s.status !== "ok" && s.severity === "high",
  ).length;
  const shouldAlert = criticalStale > 0 || highStale >= 2;

  // Defensive try/catch — before this, an unhandled throw from notifyAdmin
  // (Gmail quota, Telegram error, etc.) or the cron_logs insert could
  // propagate as HTTP 500, which made the GHA Security Health Check
  // workflow fail even though the check itself succeeded. Both side
  // effects are best-effort; swallow their errors and always return 200.
  if (shouldAlert) {
    try {
      await notifyAdmin(statuses, summary);
    } catch (e) {
      console.error("[health-check] notifyAdmin failed:", e);
    }
  }

  try {
    const service = createServiceClient();
    await service.from("cron_logs").insert({
      job: "security-health-check",
      result: { summary, alerted: shouldAlert },
    });
  } catch (e) {
    console.error("[health-check] cron_logs insert failed:", e);
  }

  return NextResponse.json({
    ok: true,
    summary,
    agents: statuses,
    alerted: shouldAlert,
  });
}

async function runChecks(): Promise<AgentStatus[]> {
  const service = createServiceClient();
  const now = Date.now();

  const results: AgentStatus[] = [];
  for (const agent of AGENTS) {
    const { data } = await service
      .from("cron_logs")
      .select("ran_at")
      .eq("job", agent.job)
      .order("ran_at", { ascending: false })
      .limit(1);
    const last = data?.[0]?.ran_at as string | undefined;

    if (!last) {
      results.push({
        job: agent.job,
        label: agent.label,
        kind: agent.kind,
        severity: agent.severity,
        last_run: null,
        age_min: null,
        max_stale_min: agent.max_stale_min,
        status: "missing",
      });
      continue;
    }
    const ageMin = Math.floor((now - new Date(last).getTime()) / 60000);
    results.push({
      job: agent.job,
      label: agent.label,
      kind: agent.kind,
      severity: agent.severity,
      last_run: last,
      age_min: ageMin,
      max_stale_min: agent.max_stale_min,
      status: ageMin <= agent.max_stale_min ? "ok" : "stale",
    });
  }
  return results;
}

interface Summary {
  total: number;
  ok: number;
  stale: number;
  missing: number;
  overall: "ok" | "degraded" | "down";
}

function summarize(statuses: AgentStatus[]): Summary {
  const ok = statuses.filter((s) => s.status === "ok").length;
  const stale = statuses.filter((s) => s.status === "stale").length;
  const missing = statuses.filter((s) => s.status === "missing").length;
  const criticalBroken = statuses.some(
    (s) => s.status !== "ok" && s.severity === "critical",
  );
  const overall: Summary["overall"] = criticalBroken
    ? "down"
    : stale + missing > 0
    ? "degraded"
    : "ok";
  return { total: statuses.length, ok, stale, missing, overall };
}

async function notifyAdmin(statuses: AgentStatus[], summary: Summary) {
  const broken = statuses.filter((s) => s.status !== "ok");
  if (broken.length === 0) return;

  const rows = broken
    .map(
      (b) =>
        `• ${b.label} [${b.severity}] — ${
          b.last_run
            ? `stale ${b.age_min}min (limit ${b.max_stale_min}min)`
            : "never ran"
        }`,
    )
    .join("\n");

  const text = `🛡️ <b>Security Health Check — ${summary.overall.toUpperCase()}</b>
${summary.ok}/${summary.total} agents OK · ${summary.stale} stale · ${summary.missing} missing

<b>Broken agents:</b>
${rows}

<a href="https://markethubpromo.com/dashboard/admin">Open Admin</a>`;

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (botToken && chatId) {
    try {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
      });
    } catch {
      /* silent */
    }
  }

  const resendKey = process.env.RESEND_API_KEY;
  const adminEmail = process.env.ADMIN_EMAIL;
  if (resendKey && adminEmail) {
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "MarketHub Security <security@markethubpromo.com>",
          to: [adminEmail],
          subject: `[Security] Health check ${summary.overall} — ${broken.length} agent(s) broken`,
          text: text.replace(/<[^>]+>/g, ""),
        }),
      });
    } catch {
      /* silent */
    }
  }
}
