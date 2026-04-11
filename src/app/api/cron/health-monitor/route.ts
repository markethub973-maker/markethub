/**
 * /api/cron/health-monitor
 *
 * Runs every 5 minutes via Vercel cron.
 * Checks critical services: Supabase, Anthropic, Apify, Resend.
 * If 3 consecutive failures → triggers an auto-redeploy via Vercel API.
 *
 * Add to vercel.json crons:
 *   { "path": "/api/cron/health-monitor", "schedule": "* /5 * * * *" }
 *   (remove the space between * and /5 — it's there to avoid JSDoc glob issues)
 */
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isAdminAuthorized } from "@/lib/adminAuth";

export const maxDuration = 30;

const CRON_SECRET = process.env.CRON_SECRET!;
const VERCEL_TOKEN = process.env.VERCEL_API_TOKEN!;
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID ?? "prj_HHkmEIEiIRuoyCFT22KAobqzUwaH";
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID ?? "team_rbNwqamitZzxEBwrd9UMDlxk";

// How many consecutive failures before auto-redeploy
const FAILURE_THRESHOLD = 3;

interface CheckResult {
  service: string;
  ok: boolean;
  latency: number;
  error?: string;
}

async function checkSupabase(): Promise<CheckResult> {
  const t = Date.now();
  try {
    const supabase = createServiceClient();
    const { error } = await supabase.from("profiles").select("id").limit(1);
    return { service: "supabase", ok: !error, latency: Date.now() - t, error: error?.message };
  } catch (e: any) {
    return { service: "supabase", ok: false, latency: Date.now() - t, error: e.message };
  }
}

async function checkAnthropic(): Promise<CheckResult> {
  const t = Date.now();
  try {
    const res = await fetch("https://api.anthropic.com/v1/models", {
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
    });
    return { service: "anthropic", ok: res.ok, latency: Date.now() - t,
      error: res.ok ? undefined : `HTTP ${res.status}` };
  } catch (e: any) {
    return { service: "anthropic", ok: false, latency: Date.now() - t, error: e.message };
  }
}

async function checkApify(): Promise<CheckResult> {
  const t = Date.now();
  try {
    const res = await fetch("https://api.apify.com/v2/users/me", {
      headers: { Authorization: `Bearer ${process.env.APIFY_TOKEN}` },
    });
    return { service: "apify", ok: res.ok, latency: Date.now() - t,
      error: res.ok ? undefined : `HTTP ${res.status}` };
  } catch (e: any) {
    return { service: "apify", ok: false, latency: Date.now() - t, error: e.message };
  }
}

async function checkResend(): Promise<CheckResult> {
  const t = Date.now();
  try {
    const res = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    });
    return { service: "resend", ok: res.ok, latency: Date.now() - t,
      error: res.ok ? undefined : `HTTP ${res.status}` };
  } catch (e: any) {
    return { service: "resend", ok: false, latency: Date.now() - t, error: e.message };
  }
}

async function triggerVercelRedeploy(): Promise<{ triggered: boolean; deploymentId?: string; error?: string }> {
  try {
    // Get latest deployment
    const listRes = await fetch(
      `https://api.vercel.com/v6/deployments?projectId=${VERCEL_PROJECT_ID}&teamId=${VERCEL_TEAM_ID}&limit=1&state=READY`,
      { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` } }
    );
    if (!listRes.ok) return { triggered: false, error: `List deployments HTTP ${listRes.status}` };
    const { deployments } = await listRes.json();
    if (!deployments?.length) return { triggered: false, error: "No ready deployments found" };

    const lastDeploymentId: string = deployments[0].uid;

    // Trigger redeploy of last successful deployment
    const redeployRes = await fetch(
      `https://api.vercel.com/v13/deployments?teamId=${VERCEL_TEAM_ID}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${VERCEL_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          deploymentId: lastDeploymentId,
          name: "viralstat-dashboard",
          target: "production",
        }),
      }
    );
    if (!redeployRes.ok) {
      const err = await redeployRes.text();
      return { triggered: false, error: `Redeploy HTTP ${redeployRes.status}: ${err.slice(0, 200)}` };
    }
    const { id } = await redeployRes.json();
    return { triggered: true, deploymentId: id };
  } catch (e: any) {
    return { triggered: false, error: e.message };
  }
}

export async function GET(req: NextRequest) {
  // Accept either:
  //  - x-cron-secret header (legacy convention kept for backwards compat)
  //  - Authorization: Bearer <CRON_SECRET> (what Vercel cron actually sends)
  //  - admin session cookie (manual trigger from admin dashboard UI)
  const authHeader = req.headers.get("authorization") ?? "";
  const bearerSecret = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const legacyHeader = req.headers.get("x-cron-secret") ?? "";
  const fromCron =
    (bearerSecret && bearerSecret === CRON_SECRET) ||
    (legacyHeader && legacyHeader === CRON_SECRET);
  const fromAdmin = isAdminAuthorized(req);
  if (!fromCron && !fromAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const now = new Date().toISOString();

  // Run all checks in parallel
  const [supabaseCheck, anthropicCheck, apifyCheck, resendCheck] = await Promise.all([
    checkSupabase(),
    checkAnthropic(),
    checkApify(),
    checkResend(),
  ]);

  const checks = [supabaseCheck, anthropicCheck, apifyCheck, resendCheck];
  const allOk = checks.every((c) => c.ok);
  const failedServices = checks.filter((c) => !c.ok).map((c) => c.service);

  // Persist health check result
  try {
    await supabase.from("health_checks").insert({
      checked_at: now,
      all_ok: allOk,
      failed_services: failedServices,
      results: checks,
    });
  } catch {}

  let autoRedeployTriggered = false;
  let redeployInfo: Record<string, unknown> = {};

  if (!allOk && VERCEL_TOKEN) {
    // Count recent consecutive failures (last 3 checks)
    const { data: recentChecks } = await supabase
      .from("health_checks")
      .select("all_ok")
      .order("checked_at", { ascending: false })
      .limit(FAILURE_THRESHOLD - 1);

    const previousFailures = recentChecks?.filter((c) => !c.all_ok).length ?? 0;
    const consecutiveFailures = previousFailures + 1; // +1 for the current one

    if (consecutiveFailures >= FAILURE_THRESHOLD) {
      const redeploy = await triggerVercelRedeploy();
      autoRedeployTriggered = redeploy.triggered;
      redeployInfo = redeploy;

      // Log auto-redeploy event
      try {
        await supabase.from("health_checks").insert({
          checked_at: new Date().toISOString(),
          all_ok: false,
          failed_services: failedServices,
          results: checks,
          auto_redeploy: true,
          redeploy_deployment_id: redeploy.deploymentId ?? null,
          redeploy_error: redeploy.error ?? null,
        });
      } catch {}
    }
  }

  return NextResponse.json({
    ok: allOk,
    timestamp: now,
    checks,
    failedServices,
    autoRedeployTriggered,
    ...(autoRedeployTriggered ? { redeployInfo } : {}),
  });
}
