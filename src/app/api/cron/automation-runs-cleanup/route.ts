/**
 * Automation runs — stuck detection + cleanup.
 *
 * Problem: if n8n workflow crashes (container dies, network drops) or
 * the callback to /api/n8n/callback never lands, the run row stays in
 * status="running" forever. User sees a stuck spinner in
 * /dashboard/automations.
 *
 * This cron runs every 15 min:
 *   1. Find automation_runs with status in ('queued','running') and
 *      started_at > 10 minutes ago (well beyond any reasonable run)
 *   2. Mark them status="failed" with error="Timeout — no callback
 *      received within 10 minutes"
 *   3. Log a cron_logs heartbeat + optional maintenance finding if
 *      the failure count spikes above threshold (could indicate n8n
 *      is down)
 *
 * Auth: Bearer CRON_SECRET via existing verifyCronSecret.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cronAuth";
import { reportFinding } from "@/lib/maintenanceAgent";
import { createServiceClient } from "@/lib/supabase/service";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

const STUCK_THRESHOLD_MIN = 10;
const FAILURE_SPIKE_THRESHOLD = 5; // >=5 stuck runs in a single sweep → alert

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req, "/api/cron/automation-runs-cleanup")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = createServiceClient();
  const cutoff = new Date(
    Date.now() - STUCK_THRESHOLD_MIN * 60 * 1000,
  ).toISOString();

  // Find stuck runs
  const { data: stuck, error: findErr } = await service
    .from("automation_runs")
    .select("id,template_slug,started_at,user_id")
    .in("status", ["queued", "running"])
    .lt("started_at", cutoff);

  if (findErr) {
    return NextResponse.json({ error: findErr.message }, { status: 500 });
  }

  const ids = (stuck ?? []).map((r) => r.id as string);
  let markedCount = 0;

  if (ids.length > 0) {
    const { error: updateErr } = await service
      .from("automation_runs")
      .update({
        status: "failed",
        error: `Timeout — no callback received within ${STUCK_THRESHOLD_MIN} min`,
        finished_at: new Date().toISOString(),
      })
      .in("id", ids);
    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }
    markedCount = ids.length;

    // If a spike, report — n8n host might be down or badly configured
    if (markedCount >= FAILURE_SPIKE_THRESHOLD) {
      await reportFinding({
        agent: "automation-cleanup",
        severity: "high",
        fingerprint: "automation-cleanup:stuck-spike",
        title: `Automation stuck spike: ${markedCount} runs timed out in last ${STUCK_THRESHOLD_MIN}min`,
        details: {
          count: markedCount,
          threshold_min: STUCK_THRESHOLD_MIN,
          sample_templates: Array.from(
            new Set(
              (stuck ?? [])
                .slice(0, 5)
                .map((r) => r.template_slug as string),
            ),
          ),
        },
        fix_suggestion:
          "Check the n8n host at automations.markethubpromo.com — likely container crash, disk full, or network issue. SSH and run `docker compose ps`.",
      });
    }
  }

  // Heartbeat
  await service.from("cron_logs").insert({
    job: "automation-cleanup",
    result: { stuck_count: markedCount, threshold_min: STUCK_THRESHOLD_MIN },
  });

  return NextResponse.json({
    ok: true,
    marked_failed: markedCount,
    cutoff,
  });
}
