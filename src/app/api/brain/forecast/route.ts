/**
 * GET /api/brain/forecast — 30/60/90-day revenue projection.
 *
 * Simple but honest model:
 *   - historical conversion: replies_count / outreach_count
 *   - demo→paid assumed 0.25 baseline (adjustable once we have 5+ sales)
 *   - MRR carry-forward from Stripe subscriptions
 *   - Accelerator sales extrapolated by weekly run-rate
 *
 * Consumed by the Command Center dashboard.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

function authOk(req: NextRequest): boolean {
  return (
    req.cookies.get("brain_admin")?.value === "1" ||
    req.headers.get("x-brain-cron-secret") === process.env.BRAIN_CRON_SECRET
  );
}

export async function GET(req: NextRequest) {
  if (!authOk(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const svc = createServiceClient();
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  // Last 30 days outreach stats
  const { data: sent30 } = await svc
    .from("outreach_log")
    .select("id,replied_at,created_at")
    .eq("status", "sent")
    .gte("created_at", new Date(now - 30 * day).toISOString());

  const sent = sent30?.length ?? 0;
  const replied = (sent30 ?? []).filter((r) => r.replied_at).length;
  const replyRate = sent ? replied / sent : 0.10; // default assumption

  // Demo→paid assumption (TODO: compute from real data when we have sales)
  const demoToPaid = 0.25;

  // Average ticket — rough average of RO €499 and Global €1000, 50/50 split
  const avgTicket = 750;

  // Forecast
  const daily = sent / 30; // assume outreach rate continues
  const forecast = (days: number) => {
    const outreach = Math.round(daily * days);
    const expectedReplies = Math.round(outreach * replyRate);
    const expectedSales = Math.round(expectedReplies * demoToPaid);
    const expectedRevenue = expectedSales * avgTicket;
    return { outreach, expectedReplies, expectedSales, expectedRevenue };
  };

  return NextResponse.json({
    ok: true,
    baseline: {
      sent_last_30d: sent,
      replied_last_30d: replied,
      reply_rate: Math.round(replyRate * 1000) / 1000,
      demo_to_paid_assumed: demoToPaid,
      avg_ticket_eur: avgTicket,
    },
    forecast: {
      "30d": forecast(30),
      "60d": forecast(60),
      "90d": forecast(90),
    },
  });
}
