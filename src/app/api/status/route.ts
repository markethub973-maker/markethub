/**
 * Public status API — feeds /status page.
 *
 * Returns aggregate health of every customer-facing subsystem:
 *  - api: app responding
 *  - database: Supabase reachable
 *  - cron_jobs: latest heartbeats per job within their window
 *  - integrations: optional external API ping (Anthropic, Stripe)
 *
 * Public — no auth. Safe data only (status booleans, no internal IDs).
 */

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface SubsystemStatus {
  name: string;
  status: "operational" | "degraded" | "outage";
  message?: string;
  last_check: string;
}

const TRACKED_JOBS = [
  { job: "health-monitor", label: "Health Monitor", max_stale_min: 60 * 24 + 30 },
  { job: "auto-post", label: "Auto-Post Engine", max_stale_min: 60 * 24 + 30 },
  { job: "abuse-scan", label: "Abuse Detection", max_stale_min: 60 * 24 + 30 },
  { job: "security-scan", label: "Security Scan", max_stale_min: 60 * 24 + 30 },
  { job: "cockpit-watchdog", label: "Real-time Watchdog", max_stale_min: 30 },
];

export async function GET() {
  const t0 = Date.now();
  const subsystems: SubsystemStatus[] = [];

  // 1. API self-check
  subsystems.push({
    name: "Web App",
    status: "operational",
    last_check: new Date().toISOString(),
  });

  // 2. Database
  const dbStart = Date.now();
  let dbStatus: SubsystemStatus["status"] = "operational";
  let dbMessage: string | undefined;
  try {
    const service = createServiceClient();
    const { error } = await service
      .from("automation_templates")
      .select("id", { count: "exact", head: true })
      .limit(1);
    if (error) {
      dbStatus = "outage";
      dbMessage = error.message.slice(0, 100);
    } else {
      const dbLatency = Date.now() - dbStart;
      if (dbLatency > 2000) {
        dbStatus = "degraded";
        dbMessage = `Slow response (${dbLatency}ms)`;
      }
    }
  } catch (e) {
    dbStatus = "outage";
    dbMessage = e instanceof Error ? e.message.slice(0, 100) : "unreachable";
  }
  subsystems.push({
    name: "Database",
    status: dbStatus,
    message: dbMessage,
    last_check: new Date().toISOString(),
  });

  // 3. Cron jobs — latest run per tracked job
  try {
    const service = createServiceClient();
    const now = Date.now();
    const { data } = await service
      .from("cron_logs")
      .select("job,ran_at")
      .in("job", TRACKED_JOBS.map((j) => j.job))
      .order("ran_at", { ascending: false })
      .limit(200);

    const latestPerJob = new Map<string, string>();
    for (const r of data ?? []) {
      if (!latestPerJob.has(r.job as string)) {
        latestPerJob.set(r.job as string, r.ran_at as string);
      }
    }
    for (const j of TRACKED_JOBS) {
      const last = latestPerJob.get(j.job);
      let status: SubsystemStatus["status"] = "operational";
      let message: string | undefined;
      if (!last) {
        status = "outage";
        message = "Never ran";
      } else {
        const ageMin = Math.floor((now - new Date(last).getTime()) / 60000);
        if (ageMin > j.max_stale_min) {
          status = ageMin > j.max_stale_min * 2 ? "outage" : "degraded";
          message = `Last ran ${ageMin} min ago`;
        }
      }
      subsystems.push({
        name: j.label,
        status,
        message,
        last_check: last ?? new Date(0).toISOString(),
      });
    }
  } catch {
    // If query fails, surface ONE entry telling so
    subsystems.push({
      name: "Background Jobs",
      status: "degraded",
      message: "Status unknown",
      last_check: new Date().toISOString(),
    });
  }

  // Overall = worst of all
  const outage = subsystems.some((s) => s.status === "outage");
  const degraded = subsystems.some((s) => s.status === "degraded");
  const overall: SubsystemStatus["status"] = outage
    ? "outage"
    : degraded
    ? "degraded"
    : "operational";

  return NextResponse.json(
    {
      overall,
      subsystems,
      generated_at: new Date().toISOString(),
      generated_in_ms: Date.now() - t0,
    },
    {
      headers: {
        "Cache-Control": "public, max-age=30, stale-while-revalidate=60",
      },
    },
  );
}
