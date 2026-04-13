/**
 * Learning DB — weekly digest (M5 Sprint 1)
 *
 * Runs Monday 09:00 UTC. Sends to Telegram + email:
 *  - New resolutions added in the last 7 days (count by category)
 *  - Top 5 most-reused solutions (by usage_count)
 *  - Unresolved escalated tickets count (if any)
 *
 * Writes a cron_logs heartbeat at the end.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyCronSecret } from "@/lib/cronAuth";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req, "/api/cron/learning-digest")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = createServiceClient();
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

  // 1. Weekly new resolutions by category
  const { data: recent } = await service
    .from("resolved_issues")
    .select("category")
    .gte("created_at", since);
  const byCategory: Record<string, number> = {};
  for (const r of recent ?? []) {
    const c = (r.category as string) ?? "other";
    byCategory[c] = (byCategory[c] ?? 0) + 1;
  }

  // 2. Top 5 most-reused solutions (all time)
  const { data: topUsed } = await service
    .from("resolved_issues")
    .select("id,category,symptom,usage_count")
    .gt("usage_count", 0)
    .order("usage_count", { ascending: false })
    .limit(5);

  // 3. Unresolved escalated tickets older than 24h
  const dayAgo = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { count: stuckEscalated } = await service
    .from("support_tickets")
    .select("id", { count: "exact", head: true })
    .eq("status", "escalated")
    .lt("created_at", dayAgo);

  const totalNew = recent?.length ?? 0;
  const catLines = Object.entries(byCategory)
    .sort(([, a], [, b]) => b - a)
    .map(([c, n]) => `  • ${c}: ${n}`)
    .join("\n") || "  (none)";
  const topLines = (topUsed ?? [])
    .map(
      (t, i) =>
        `  ${i + 1}. [${t.category}] ${(t.symptom as string).slice(0, 80)} — reused ${t.usage_count}×`,
    )
    .join("\n") || "  (none yet)";

  const text = `🧠 <b>Learning DB — Weekly Digest</b>
Week of ${since.slice(0, 10)} → ${new Date().toISOString().slice(0, 10)}

<b>New resolutions:</b> ${totalNew}
${catLines}

<b>Top 5 reused solutions:</b>
${topLines}

<b>Stuck escalated tickets (>24h):</b> ${stuckEscalated ?? 0}

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
          from: "MarketHub Learning <learning@markethubpromo.com>",
          to: [adminEmail],
          subject: `[Learning] Weekly digest — ${totalNew} new resolutions`,
          text: text.replace(/<[^>]+>/g, ""),
        }),
      });
    } catch {
      /* silent */
    }
  }

  await service.from("cron_logs").insert({
    job: "learning-digest",
    result: { new_resolutions: totalNew, stuck_escalated: stuckEscalated ?? 0 },
  });

  return NextResponse.json({
    ok: true,
    new_resolutions: totalNew,
    by_category: byCategory,
    top_used_count: topUsed?.length ?? 0,
    stuck_escalated: stuckEscalated ?? 0,
  });
}
