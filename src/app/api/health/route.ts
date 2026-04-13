/**
 * Public health endpoint for external uptime monitors.
 *
 * Compatible with Pingdom, UptimeRobot, BetterStack, etc.
 * Hit by uptime probes every 1-5 minutes.
 *
 * Returns 200 + JSON when:
 *  - App is responding
 *  - Database read succeeds (1 row from a small table)
 *
 * Returns 503 + JSON describing the failed dependency otherwise.
 *
 * No auth required. Safe to expose publicly — only exposes "up/down"
 * state, not internal config.
 *
 * Cache: no-store to ensure each probe gets a fresh result.
 */

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VERSION = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) ?? "dev";
const REGION = process.env.VERCEL_REGION ?? "local";

interface CheckResult {
  ok: boolean;
  latency_ms: number;
  error?: string;
}

async function checkDatabase(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const service = createServiceClient();
    // Tiny query — just confirm we can read from any table.
    // resource_usage is small + frequently written, good signal.
    const { error } = await service
      .from("automation_templates")
      .select("id", { head: true, count: "exact" })
      .limit(1);
    const latency_ms = Date.now() - start;
    if (error) return { ok: false, latency_ms, error: error.message };
    return { ok: true, latency_ms };
  } catch (e) {
    return {
      ok: false,
      latency_ms: Date.now() - start,
      error: e instanceof Error ? e.message : "unknown",
    };
  }
}

export async function GET() {
  const t0 = Date.now();
  const db = await checkDatabase();
  const total_ms = Date.now() - t0;

  const status = db.ok ? "ok" : "degraded";
  const httpStatus = db.ok ? 200 : 503;

  return NextResponse.json(
    {
      status,
      version: VERSION,
      region: REGION,
      uptime_check: true,
      total_ms,
      checks: {
        database: db,
      },
      timestamp: new Date().toISOString(),
    },
    {
      status: httpStatus,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "Content-Type": "application/json",
      },
    },
  );
}

export async function HEAD() {
  // Some uptime monitors prefer HEAD to save bandwidth.
  const db = await checkDatabase();
  return new Response(null, {
    status: db.ok ? 200 : 503,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    },
  });
}
