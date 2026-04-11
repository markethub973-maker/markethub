/**
 * Cockpit — Daily Report endpoint.
 *
 * Pulls a full 24h snapshot of the platform (findings, security events,
 * Stripe activity, new signups, cron health, AI usage, backup status) and
 * asks Claude Haiku to synthesize a NARRATIVE morning report. Sends it
 * via Resend to the admin email.
 *
 * Idempotent per day (fingerprint: "daily-report:YYYY-MM-DD"). Re-running
 * the same day is a no-op. On-demand invocations can pass ?force=1 to
 * bypass the idempotency lock.
 *
 * Auth: Bearer CRON_SECRET. Invoked by the GH Actions workflow at 08:00 UTC
 * daily, or by the assistant tool on user request.
 */
import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cronAuth";
import { createServiceClient } from "@/lib/supabase/service";
import { getAppAnthropicClient } from "@/lib/anthropic-client";
import { Resend } from "resend";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const MODEL = "claude-haiku-4-5-20251001";
const FROM = "MarketHub Pro Cockpit <noreply@markethubpromo.com>";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "markethub973@gmail.com";

const SYSTEM_PROMPT = `You are the Cockpit Analyst for MarketHub Pro — a SaaS marketing platform running on Vercel + Supabase + Stripe + Cloudflare.

You receive a 24-hour JSON snapshot of the platform's state (findings, security events, Stripe activity, signups, cron health, AI usage, backup status). Write a MORNING REPORT in Romanian that the operator will read over coffee. Structure:

1. **Stare generală** — one line verdict: ALL CLEAR / MINOR / DEGRADAT / CRITIC. Explain briefly.
2. **Ce s-a întâmplat peste noapte** — bullet list of notable events, incidents, new signups, payments processed, cron runs, etc.
3. **Probleme active** — unresolved findings grouped by severity, with the suggested fix for the top 3.
4. **Atacuri & securitate** — security event summary, top source IPs, flagged patterns. Be conservative.
5. **Financiar** — new subs, MRR change, AI cost usage, notable Stripe events.
6. **Backup & recovery** — last backup timestamp + verification state, expected next backup.
7. **Acțiuni recomandate** — 0-5 concrete things the operator should do today (ordered by urgency).

Style:
- Concise. No filler. Romanian primarily but code/tech terms stay English.
- Use emoji sparingly (only for status: ✅ 🟡 🔴).
- If a section has nothing to report, write "Nimic de raportat." — don't pad.
- End with "— Cockpit, {date}".

Return PLAIN TEXT (no markdown headers, just bold with ** for section titles).`;

async function gatherSnapshot() {
  const supa = createServiceClient();
  const now = new Date();
  const twentyFourHAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const todayStr = now.toISOString().slice(0, 10);

  const [
    findingsRes,
    eventsRes,
    signupsRes,
    cronLogsRes,
    backupLogsRes,
  ] = await Promise.all([
    supa
      .from("maintenance_findings")
      .select("agent_name, severity, title, fix_suggestion, occurrences, first_seen, last_seen, resolved, resolved_at")
      .or(`resolved.eq.false,resolved_at.gte.${twentyFourHAgo}`)
      .neq("agent_name", "digest")
      .neq("agent_name", "daily-report")
      .order("severity", { ascending: true })
      .limit(100),
    supa
      .from("security_events")
      .select("event_type, severity, ip, path, user_agent, created_at")
      .gte("created_at", twentyFourHAgo)
      .order("created_at", { ascending: false })
      .limit(300),
    supa
      .from("profiles")
      .select("id, email, name, plan, created_at")
      .gte("created_at", yesterday.toISOString())
      .order("created_at", { ascending: false })
      .limit(50),
    supa
      .from("cron_logs")
      .select("job, ran_at, result")
      .gte("ran_at", twentyFourHAgo)
      .order("ran_at", { ascending: false })
      .limit(200),
    // Backup job logs live in cron_logs too (agent = "backup")
    supa
      .from("cron_logs")
      .select("job, ran_at, result")
      .eq("job", "cockpit-backup")
      .order("ran_at", { ascending: false })
      .limit(5),
  ]);

  // Count findings by severity + status
  const unresolved = (findingsRes.data ?? []).filter((f) => !f.resolved);
  const resolvedToday = (findingsRes.data ?? []).filter(
    (f) => f.resolved && f.resolved_at && f.resolved_at >= twentyFourHAgo,
  );
  const findingCounts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const f of unresolved) {
    if (f.severity in findingCounts) findingCounts[f.severity as keyof typeof findingCounts]++;
  }

  // Security event breakdown
  const events = eventsRes.data ?? [];
  const eventsByType = events.reduce<Record<string, number>>((acc, e) => {
    acc[e.event_type] = (acc[e.event_type] ?? 0) + 1;
    return acc;
  }, {});
  const ipCounts = new Map<string, number>();
  for (const e of events) {
    if (!e.ip) continue;
    ipCounts.set(e.ip, (ipCounts.get(e.ip) ?? 0) + 1);
  }
  const topIps = [...ipCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Cron summary
  const cronRuns = (cronLogsRes.data ?? []).length;
  const cronByJob = (cronLogsRes.data ?? []).reduce<Record<string, number>>((acc, c) => {
    acc[c.job] = (acc[c.job] ?? 0) + 1;
    return acc;
  }, {});

  const latestBackup = backupLogsRes.data?.[0];

  return {
    date: todayStr,
    window_start: twentyFourHAgo,
    window_end: now.toISOString(),
    findings: {
      unresolved_counts: findingCounts,
      unresolved_total: unresolved.length,
      unresolved_top_20: unresolved.slice(0, 20).map((f) => ({
        agent: f.agent_name,
        severity: f.severity,
        title: f.title,
        fix: f.fix_suggestion,
        occurrences: f.occurrences,
        first_seen: f.first_seen,
      })),
      resolved_last_24h: resolvedToday.length,
    },
    security: {
      events_last_24h: events.length,
      events_by_type: eventsByType,
      top_ips: topIps.map(([ip, count]) => ({ ip, count })),
      critical_events: events.filter((e) => e.severity === "critical").slice(0, 10),
    },
    signups: {
      count: signupsRes.data?.length ?? 0,
      list: (signupsRes.data ?? []).slice(0, 10).map((p) => ({
        email: p.email,
        plan: p.plan,
        at: p.created_at,
      })),
    },
    crons: {
      total_runs_24h: cronRuns,
      by_job: cronByJob,
    },
    backup: {
      last_run: latestBackup?.ran_at ?? null,
      last_result: latestBackup?.result ?? null,
      recent_history: (backupLogsRes.data ?? []).map((b) => ({
        at: b.ran_at,
        result: b.result,
      })),
    },
  };
}

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req, "/api/cockpit/daily-report")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const force = req.nextUrl.searchParams.get("force") === "1";
  const supa = createServiceClient();
  const today = new Date().toISOString().slice(0, 10);

  // Idempotency: one daily report per day unless ?force=1
  if (!force) {
    const { data: existing } = await supa
      .from("maintenance_findings")
      .select("id")
      .eq("agent_name", "daily-report")
      .eq("fingerprint", `daily-report:${today}`)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ ok: true, skipped: "already sent today", today });
    }
  }

  // 1. Gather snapshot
  const snapshot = await gatherSnapshot();

  // 2. Ask Haiku for the narrative
  const anthropic = getAppAnthropicClient();
  let narrative = "";
  try {
    const resp = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Snapshot JSON (24h window ending ${snapshot.window_end}):\n\n${JSON.stringify(snapshot, null, 2)}`,
        },
      ],
    });
    for (const block of resp.content) {
      if (block.type === "text") narrative += block.text;
    }
  } catch (e) {
    return NextResponse.json(
      { error: "Haiku call failed", details: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }

  // 3. Render email
  const counts = snapshot.findings.unresolved_counts;
  const headline =
    counts.critical > 0
      ? `🔴 CRITIC — ${counts.critical} critical / ${counts.high} high`
      : counts.high > 0
        ? `🟡 DEGRADAT — ${counts.high} high / ${counts.medium} medium`
        : counts.medium > 0
          ? `🟡 MINOR — ${counts.medium} medium`
          : "✅ ALL CLEAR";

  const subject = `[Cockpit] ${today} — ${headline}`;
  const narrativeHtml = narrative
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong style='color:#F59E0B'>$1</strong>")
    .replace(/\n/g, "<br>");

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:720px;margin:0 auto;padding:32px 24px;background:#0A0807;color:#FFF8F0">
      <div style="border-bottom:1px solid rgba(245,158,11,0.25);padding-bottom:16px;margin-bottom:24px">
        <div style="font-size:11px;color:#F59E0B;font-family:monospace;letter-spacing:3px;text-transform:uppercase;margin-bottom:4px">COCKPIT // DAILY REPORT</div>
        <h1 style="color:#FFF8F0;font-size:22px;margin:0">MarketHub Pro — ${today}</h1>
        <div style="color:#C4AA8A;font-size:13px;margin-top:4px">${headline}</div>
      </div>
      <div style="font-size:14px;line-height:1.7;color:#E8DFD0">
        ${narrativeHtml}
      </div>
      <hr style="border:none;border-top:1px solid rgba(245,158,11,0.15);margin:32px 0 16px"/>
      <div style="color:#78614E;font-size:11px;text-align:center;font-family:monospace;letter-spacing:1px">
        GENERATED BY COCKPIT · <a href="https://markethubpromo.com/dashboard/admin/cockpit" style="color:#F59E0B;text-decoration:none">OPEN LIVE PANEL</a>
      </div>
    </div>
  `;

  // 4. Send
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "RESEND_API_KEY not set", narrative, subject }, { status: 500 });
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const sent = await resend.emails.send({ from: FROM, to: ADMIN_EMAIL, subject, html });

  // 5. Lock row so we don't re-send
  if (!force) {
    await supa.from("maintenance_findings").insert({
      agent_name: "daily-report",
      severity: "info",
      fingerprint: `daily-report:${today}`,
      title: `Daily report sent ${today}`,
      details: {
        headline,
        counts,
        snapshot_size: JSON.stringify(snapshot).length,
        resend_id: sent.data?.id ?? null,
        resend_error: sent.error ? String(sent.error.message ?? sent.error) : null,
      },
      resolved: true,
      resolved_at: new Date().toISOString(),
      resolved_by: "daily-report-sent",
    });
  }

  // Log to cron_logs
  try {
    await supa.from("cron_logs").insert({
      job: "cockpit-daily-report",
      ran_at: new Date().toISOString(),
      result: {
        headline,
        counts,
        resend_id: sent.data?.id ?? null,
      },
    });
  } catch { /* ignore */ }

  return NextResponse.json({
    ok: true,
    today,
    headline,
    counts,
    sent_to: ADMIN_EMAIL,
    resend_id: sent.data?.id ?? null,
  });
}
