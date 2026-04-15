/**
 * GET /api/brain/gmail-analyze?days=30&max=500
 *
 * Deep-scans Gmail (INBOX + all user labels/folders except Spam/Trash),
 * classifies every message by source + severity, and returns a structured
 * platform-health report so Alex/Eduard can see what's wrong across
 * Sentry, Vercel, Stripe, Supabase, Cloudflare, Resend, GitHub, Apify, etc.
 *
 * Auth: x-brain-cron-secret header (BRAIN_CRON_SECRET).
 */

import { NextRequest, NextResponse } from "next/server";
import { listMessages, getMessage, headerOf } from "@/lib/gmail";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const OPERATOR_EMAIL = "markethub973@gmail.com";

type Severity = "critical" | "warning" | "info";

interface Classification {
  source: string;
  severity: Severity;
}

function classify(from: string, subject: string): Classification {
  const f = from.toLowerCase();
  const s = subject.toLowerCase();

  if (f.includes("sentry.io")) {
    if (s.includes("new issue") || s.includes("regression") || s.includes("spike")) return { source: "sentry", severity: "critical" };
    return { source: "sentry", severity: "warning" };
  }
  if (f.includes("vercel.com") || f.includes("noreply@vercel")) {
    if (s.includes("failed") || s.includes("error") || s.includes("down")) return { source: "vercel", severity: "critical" };
    if (s.includes("deployed") || s.includes("succeeded")) return { source: "vercel", severity: "info" };
    return { source: "vercel", severity: "warning" };
  }
  if (f.includes("stripe.com")) {
    if (s.includes("dispute") || s.includes("chargeback") || s.includes("failed payment") || s.includes("fraud")) return { source: "stripe", severity: "critical" };
    if (s.includes("payment") || s.includes("receipt")) return { source: "stripe", severity: "info" };
    return { source: "stripe", severity: "warning" };
  }
  if (f.includes("supabase.io") || f.includes("supabase.com")) {
    if (s.includes("outage") || s.includes("downtime") || s.includes("quota exceeded") || s.includes("limit")) return { source: "supabase", severity: "critical" };
    return { source: "supabase", severity: "warning" };
  }
  if (f.includes("cloudflare.com")) {
    if (s.includes("downtime") || s.includes("expir") || s.includes("attack")) return { source: "cloudflare", severity: "critical" };
    return { source: "cloudflare", severity: "warning" };
  }
  if (f.includes("resend.com") || f.includes("resend.dev")) {
    if (s.includes("bounce") || s.includes("complaint") || s.includes("blocked") || s.includes("suppressed")) return { source: "resend", severity: "warning" };
    return { source: "resend", severity: "info" };
  }
  if (f.includes("github.com") || f.includes("noreply@github")) {
    if (s.includes("security") || s.includes("vulnerability") || s.includes("secret") || s.includes("run failed")) return { source: "github", severity: "critical" };
    return { source: "github", severity: "info" };
  }
  if (f.includes("apify.com")) {
    if (s.includes("low credit") || s.includes("failed") || s.includes("exceeded")) return { source: "apify", severity: "warning" };
    return { source: "apify", severity: "info" };
  }
  if (f.includes("openai.com")) {
    if (s.includes("limit") || s.includes("exceeded") || s.includes("suspended")) return { source: "openai", severity: "critical" };
    return { source: "openai", severity: "info" };
  }
  if (f.includes("anthropic.com")) {
    if (s.includes("limit") || s.includes("exceeded") || s.includes("suspended")) return { source: "anthropic", severity: "critical" };
    return { source: "anthropic", severity: "info" };
  }
  if (f.includes("google.com") && (s.includes("security alert") || s.includes("sign-in"))) {
    return { source: "google_security", severity: "warning" };
  }
  if (f.includes("elevenlabs")) {
    return { source: "elevenlabs", severity: "info" };
  }
  if (f.includes("telegram")) {
    return { source: "telegram", severity: "info" };
  }
  return { source: "other", severity: "info" };
}

export async function GET(req: NextRequest) {
  if (req.headers.get("x-brain-cron-secret") !== process.env.BRAIN_CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const days = Math.min(Number(req.nextUrl.searchParams.get("days") ?? "30"), 90);
  const max = Math.min(Number(req.nextUrl.searchParams.get("max") ?? "500"), 1000);

  // Scan across ALL mail (INBOX + labels + archives), excluding Trash/Spam.
  // "-in:trash -in:spam" matches everywhere else.
  const query = `newer_than:${days}d -in:trash -in:spam`;
  const list = await listMessages(OPERATOR_EMAIL, query, max);
  if (!list.length) {
    return NextResponse.json({ ok: true, total: 0, note: "No messages in window" });
  }

  type Row = { source: string; severity: Severity; subject: string; from: string; date: string; snippet: string };
  const bySource: Record<string, { total: number; critical: number; warning: number; info: number; recent: Row[] }> = {};
  const criticalAlerts: Row[] = [];
  const warningAlerts: Row[] = [];
  let processed = 0;

  for (const { id } of list) {
    const msg = await getMessage(OPERATOR_EMAIL, id);
    if (!msg) continue;
    processed++;
    const from = headerOf(msg, "From") ?? "";
    const subject = headerOf(msg, "Subject") ?? "(no subject)";
    const date = headerOf(msg, "Date") ?? "";
    const cls = classify(from, subject);
    const row: Row = {
      source: cls.source,
      severity: cls.severity,
      subject: subject.slice(0, 200),
      from: from.slice(0, 100),
      date,
      snippet: (msg.snippet ?? "").slice(0, 200),
    };
    const bucket = (bySource[cls.source] ??= { total: 0, critical: 0, warning: 0, info: 0, recent: [] });
    bucket.total++;
    bucket[cls.severity]++;
    if (bucket.recent.length < 5) bucket.recent.push(row);
    if (cls.severity === "critical") criticalAlerts.push(row);
    else if (cls.severity === "warning" && warningAlerts.length < 30) warningAlerts.push(row);
  }

  // Sort sources by criticality
  const summary = Object.entries(bySource)
    .map(([source, b]) => ({ source, ...b }))
    .sort((a, b) => (b.critical - a.critical) || (b.warning - a.warning) || (b.total - a.total));

  return NextResponse.json({
    ok: true,
    window_days: days,
    total_scanned: processed,
    summary,
    critical_alerts: criticalAlerts.slice(0, 50),
    warning_alerts: warningAlerts,
  });
}
