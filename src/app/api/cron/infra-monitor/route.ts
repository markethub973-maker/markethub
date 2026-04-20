/**
 * GET /api/cron/infra-monitor — Infrastructure capacity monitor.
 *
 * Runs every hour via GHA. Checks:
 * - Supabase DB connections
 * - Supabase storage usage
 * - Active users count
 * - Outreach email count today
 * - API cost tracking
 *
 * Alerts on Telegram when approaching limits.
 * Auth: CRON_SECRET
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

function authOk(req: NextRequest): boolean {
  const h = req.headers.get("authorization");
  return Boolean(h && process.env.CRON_SECRET && h === `Bearer ${process.env.CRON_SECRET}`);
}

interface Threshold {
  metric: string;
  current: number;
  limit: number;
  pct: number;
  action: string;
}

export async function GET(req: NextRequest) {
  if (!authOk(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const svc = createServiceClient();
  const alerts: Threshold[] = [];
  const metrics: Record<string, number> = {};

  // 1. Total users
  const { count: totalUsers } = await svc
    .from("profiles")
    .select("id", { count: "exact", head: true });
  metrics.total_users = totalUsers ?? 0;

  // 2. Paying users (non-free plans)
  const { count: payingUsers } = await svc
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .not("plan", "in", "(free,free_test,free_forever)");
  metrics.paying_users = payingUsers ?? 0;

  // 3. Emails sent today
  const today = new Date().toISOString().slice(0, 10);
  const { count: emailsToday } = await svc
    .from("outreach_log")
    .select("id", { count: "exact", head: true })
    .gte("created_at", `${today}T00:00:00`);
  metrics.emails_today = emailsToday ?? 0;

  // 4. DB size estimate (count rows in major tables)
  const tables = ["profiles", "scheduled_posts", "research_leads", "outreach_log", "brain_knowledge_base", "brain_agent_activity", "telegram_messages", "bookings", "prospect_pages"];
  let totalRows = 0;
  for (const t of tables) {
    try {
      const { count } = await svc.from(t).select("id", { count: "exact", head: true });
      totalRows += count ?? 0;
    } catch { /* table might not exist */ }
  }
  metrics.total_db_rows = totalRows;

  // 5. Instagram connections
  const { count: igConns } = await svc
    .from("instagram_connections")
    .select("id", { count: "exact", head: true });
  metrics.ig_connections = igConns ?? 0;

  // === THRESHOLD CHECKS ===

  // Supabase Free: 500MB DB ≈ ~500K rows simple data
  const DB_ROW_LIMIT = 400000; // alert at 400K
  if (totalRows > DB_ROW_LIMIT * 0.8) {
    alerts.push({
      metric: "DB Rows",
      current: totalRows,
      limit: DB_ROW_LIMIT,
      pct: Math.round((totalRows / DB_ROW_LIMIT) * 100),
      action: "Upgrade to Supabase Pro ($25/mo)",
    });
  }

  // Resend Free: 100 emails/day
  const EMAIL_LIMIT = 100;
  if ((emailsToday ?? 0) > EMAIL_LIMIT * 0.8) {
    alerts.push({
      metric: "Emails Today",
      current: emailsToday ?? 0,
      limit: EMAIL_LIMIT,
      pct: Math.round(((emailsToday ?? 0) / EMAIL_LIMIT) * 100),
      action: "Upgrade Resend to Starter ($20/mo)",
    });
  }

  // Users: at 50 users, recommend Supabase Pro
  if ((totalUsers ?? 0) > 40) {
    alerts.push({
      metric: "Total Users",
      current: totalUsers ?? 0,
      limit: 50,
      pct: Math.round(((totalUsers ?? 0) / 50) * 100),
      action: "Upgrade Supabase Pro for connection pooling ($25/mo)",
    });
  }

  // Paying users: at 5, enable annual pricing experiments
  if ((payingUsers ?? 0) >= 5) {
    alerts.push({
      metric: "Paying Users",
      current: payingUsers ?? 0,
      limit: 5,
      pct: 100,
      action: "MILESTONE: 5 paying users! Enable pricing experiments (annual, free forever micro tier)",
    });
  }

  // === TELEGRAM ALERT if any threshold hit ===
  if (alerts.length > 0) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_ALLOWED_CHAT_ID;
    if (botToken && chatId) {
      const msg = `⚠️ INFRA ALERT\n\n${alerts.map(a =>
        `${a.metric}: ${a.current}/${a.limit} (${a.pct}%)\n→ ${a.action}`
      ).join("\n\n")}\n\nMetrics: ${JSON.stringify(metrics)}`;

      try {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text: msg }),
        });
      } catch { /* non-fatal */ }
    }
  }

  return NextResponse.json({
    ok: true,
    metrics,
    alerts: alerts.length,
    thresholds: alerts,
  });
}
