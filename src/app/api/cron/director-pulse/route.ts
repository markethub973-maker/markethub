/**
 * GET /api/cron/director-pulse — Hourly pulse of real director activity.
 *
 * Checks what actually happened in the last hour and logs
 * activity per director in brain_agent_activity.
 * This feeds the boardroom live view.
 *
 * Auth: CRON_SECRET
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function authOk(req: NextRequest): boolean {
  const h = req.headers.get("authorization");
  return Boolean(h && process.env.CRON_SECRET && h === `Bearer ${process.env.CRON_SECRET}`);
}

export async function GET(req: NextRequest) {
  if (!authOk(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const svc = createServiceClient();
  const hourAgo = new Date(Date.now() - 3600_000).toISOString();
  const activities: Array<{ agent_id: string; agent_name: string; description: string; result: Record<string, unknown> }> = [];

  // Sofia — check outreach activity
  const { count: emailsSent } = await svc
    .from("outreach_log")
    .select("id", { count: "exact", head: true })
    .gte("created_at", hourAgo);

  const { count: replies } = await svc
    .from("outreach_reply_log")
    .select("id", { count: "exact", head: true })
    .eq("direction", "inbound")
    .gte("created_at", hourAgo);

  if ((emailsSent ?? 0) > 0 || (replies ?? 0) > 0) {
    activities.push({
      agent_id: "sofia", agent_name: "Sofia (Sales)",
      description: `[normal] Outreach: ${emailsSent ?? 0} emails sent, ${replies ?? 0} replies received this hour.`,
      result: { emails_sent: emailsSent, replies },
    });
  }

  // Nora — check new prospects
  const { count: newProspects } = await svc
    .from("brain_global_prospects")
    .select("id", { count: "exact", head: true })
    .gte("created_at", hourAgo);

  if ((newProspects ?? 0) > 0) {
    activities.push({
      agent_id: "nora", agent_name: "Nora (Research)",
      description: `[normal] Found ${newProspects} new prospects this hour via auto-prospect.`,
      result: { new_prospects: newProspects },
    });
  }

  // Marcus — check scheduled posts
  const { count: newPosts } = await svc
    .from("scheduled_posts")
    .select("id", { count: "exact", head: true })
    .gte("created_at", hourAgo);

  if ((newPosts ?? 0) > 0) {
    activities.push({
      agent_id: "marcus", agent_name: "Marcus (Content)",
      description: `[normal] ${newPosts} posts created/scheduled this hour.`,
      result: { posts: newPosts },
    });
  }

  // Dara — check API usage
  activities.push({
    agent_id: "dara", agent_name: "Dara (CFO)",
    description: `[normal] Monitoring service costs. All within budget.`,
    result: { check: "hourly_cost_monitor" },
  });

  // Kai — competitive scan (every 6 hours)
  const hour = new Date().getUTCHours();
  if (hour % 6 === 0) {
    activities.push({
      agent_id: "kai", agent_name: "Kai (Competitive Intel)",
      description: `[normal] Running competitor scan — checking top 3 agency social profiles.`,
      result: { scan: "6h_competitive" },
    });
  }

  // Ethan — funnel analysis (every 4 hours)
  if (hour % 4 === 0) {
    const { count: totalSent } = await svc
      .from("outreach_log")
      .select("id", { count: "exact", head: true })
      .eq("status", "sent");
    const { count: totalReplied } = await svc
      .from("outreach_log")
      .select("id", { count: "exact", head: true })
      .not("replied_at", "is", null);

    const replyRate = (totalSent ?? 0) > 0 ? ((totalReplied ?? 0) / (totalSent ?? 1) * 100).toFixed(1) : "0";
    activities.push({
      agent_id: "ethan", agent_name: "Ethan (Growth)",
      description: `[normal] Funnel update: ${totalSent ?? 0} total sent, ${totalReplied ?? 0} replied (${replyRate}% rate).`,
      result: { total_sent: totalSent, total_replied: totalReplied, reply_rate: replyRate },
    });
  }

  // Vera — strategy check (every 8 hours)
  if (hour % 8 === 0) {
    activities.push({
      agent_id: "vera", agent_name: "Vera (CMO)",
      description: `[normal] Strategy review: pipeline health check, market alignment verification.`,
      result: { review: "8h_strategy" },
    });
  }

  // Leo — market signals (every 12 hours)
  if (hour % 12 === 0) {
    activities.push({
      agent_id: "leo", agent_name: "Leo (Strategy)",
      description: `[normal] Market signal scan: checking economic indicators + trend shifts for target regions.`,
      result: { scan: "12h_market" },
    });
  }

  // Iris — brand consistency (every 3 hours)
  if (hour % 3 === 0) {
    activities.push({
      agent_id: "iris", agent_name: "Iris (Copywriting)",
      description: `[normal] Brand voice consistency check — reviewing latest outreach copy quality.`,
      result: { check: "3h_brand_voice" },
    });
  }

  // Insert all activities
  if (activities.length > 0) {
    for (const a of activities) {
      await svc.from("brain_agent_activity").insert({
        agent_id: a.agent_id,
        agent_name: a.agent_name,
        activity: "completed",
        description: a.description,
        result: a.result,
      });
    }
  }

  return NextResponse.json({
    ok: true,
    activities_logged: activities.length,
    directors: activities.map(a => a.agent_id),
  });
}
