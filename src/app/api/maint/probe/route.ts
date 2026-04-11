/**
 * Maintenance Agent 1 — Synthetic Probe
 *
 * Hits every cron endpoint with the expected Bearer CRON_SECRET plus a set
 * of protected API routes without auth (we expect 401). Compares actual vs
 * expected HTTP status (and optionally JSON shape). Upserts findings for
 * any mismatch into `maintenance_findings` via `reportFinding`, and calls
 * `autoResolveStale` at the end so cleared issues get marked resolved.
 *
 * Auth: Bearer CRON_SECRET (same as all other cron endpoints — verified via
 * `verifyCronSecret` which also fires a SIEM event on unauthorized access).
 *
 * Invoked by the GitHub Actions `maintenance-agents` workflow daily at 03:00
 * UTC. Can also be triggered manually with:
 *   curl -H "Authorization: Bearer $CRON_SECRET" \
 *     https://viralstat-dashboard.vercel.app/api/maint/probe
 */
import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cronAuth";
import { reportFinding, autoResolveStale } from "@/lib/maintenanceAgent";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const AGENT_NAME = "probe";

interface CronProbe {
  path: string;
  expectHTTP: number;
  expectKeys?: string[]; // optional JSON keys we expect to see in the 2xx body
}

interface UnauthProbe {
  path: string;
  expectHTTP: number;
  method?: "GET" | "POST";
}

const CRON_PROBES: CronProbe[] = [
  { path: "/api/cron/auto-post", expectHTTP: 200 },
  { path: "/api/cron/abuse-scan", expectHTTP: 200 },
  { path: "/api/cron/security-scan", expectHTTP: 200 },
  { path: "/api/cron/trending-scan", expectHTTP: 200 },
  { path: "/api/cron/social-listening", expectHTTP: 200 },
  { path: "/api/cron/health-monitor", expectHTTP: 200, expectKeys: ["ok", "checks"] },
  { path: "/api/cron/weekly-digest", expectHTTP: 200 },
  { path: "/api/cron/onboarding", expectHTTP: 200 },
  { path: "/api/cron/engagement-alerts", expectHTTP: 200 },
  { path: "/api/cron/monthly-report", expectHTTP: 200 },
  { path: "/api/cron/refresh-tokens", expectHTTP: 200 },
  { path: "/api/subscription/check-trial", expectHTTP: 200 },
];

// For these routes we EXPECT a failure (401/404/405) when hit without auth.
// If we get 200, that's a critical finding — means the route leaks data.
//
// Notes on expected statuses:
//   - /api/stripe/checkout → 401: middleware auth guard fires before the
//     method check, so unauthenticated GET returns 401, not 405.
//   - /api/stripe/webhook → 405: in PUBLIC_PATHS (webhook receivers verify
//     their own HMAC signature), so middleware passes through and Next.js
//     returns 405 for GET on a POST-only handler.
//   - /api/admin/* → 404: admin tunnel middleware returns 404 (not 401) for
//     requests without the `?t=` token or `admin_session_token` cookie. This
//     is intentional — it hides the existence of the admin API entirely.
const UNAUTH_API_PROBES: UnauthProbe[] = [
  { path: "/api/instagram", expectHTTP: 401 },
  { path: "/api/linkedin", expectHTTP: 401 },
  { path: "/api/calendar", expectHTTP: 401 },
  { path: "/api/stripe/checkout", expectHTTP: 401, method: "GET" },
  { path: "/api/stripe/webhook", expectHTTP: 405, method: "GET" },
  { path: "/api/admin/pricing", expectHTTP: 404 },
  { path: "/api/admin/users", expectHTTP: 404 },
  { path: "/api/billing", expectHTTP: 401 },
  { path: "/api/assets", expectHTTP: 401 },
  { path: "/api/clients", expectHTTP: 401 },
];

function getBaseURL(): string {
  // Always hit the direct Vercel hostname, not the primary alias:
  //   - VERCEL_URL resolves to a *preview* deployment URL that has Vercel
  //     Deploy Protection and returns 401 to any unauthenticated fetch.
  //   - VERCEL_PROJECT_PRODUCTION_URL resolves to `markethubpromo.com` which
  //     goes through Cloudflare Bot Fight Mode, blocking non-browser clients
  //     with 403.
  //   - `viralstat-dashboard.vercel.app` bypasses both — it's the stable
  //     production alias, CRON_SECRET still authenticates us server-side.
  // The same workaround is used by the auto-post / health-monitor GitHub
  // Actions workflows (see .github/workflows/cron-*.yml).
  if (process.env.MAINT_PROBE_BASE_URL) return process.env.MAINT_PROBE_BASE_URL;
  return "https://viralstat-dashboard.vercel.app";
}

interface ProbeResult {
  path: string;
  ok: boolean;
  expected: number;
  actual: number | null;
  error?: string;
  missingKeys?: string[];
}

// Custom header the middleware + SIEM loggers look for so they can skip
// recording our synthetic probe hits as security events. Without this the
// probe generates a few dozen false-positive brute_force_admin / unusual
// activity events per run, which then confuse the SIEM analyst agent.
const PROBE_HEADER_NAME = "x-maint-probe";
const PROBE_HEADER_VALUE = "viralstat-probe/1";

async function runCronProbe(base: string, probe: CronProbe, secret: string): Promise<ProbeResult> {
  try {
    const res = await fetch(`${base}${probe.path}`, {
      headers: {
        Authorization: `Bearer ${secret}`,
        [PROBE_HEADER_NAME]: PROBE_HEADER_VALUE,
      },
      // Avoid keeping CDN-cached responses — we want live status
      cache: "no-store",
    });
    const statusOk = res.status === probe.expectHTTP;
    let missingKeys: string[] | undefined;

    if (statusOk && probe.expectKeys && probe.expectKeys.length > 0) {
      try {
        const body = await res.json();
        const missing = probe.expectKeys.filter((k) => !(k in (body as Record<string, unknown>)));
        if (missing.length > 0) missingKeys = missing;
      } catch {
        missingKeys = probe.expectKeys; // couldn't parse JSON at all
      }
    }

    return {
      path: probe.path,
      ok: statusOk && !missingKeys,
      expected: probe.expectHTTP,
      actual: res.status,
      missingKeys,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { path: probe.path, ok: false, expected: probe.expectHTTP, actual: null, error: msg };
  }
}

async function runUnauthProbe(base: string, probe: UnauthProbe): Promise<ProbeResult> {
  try {
    const res = await fetch(`${base}${probe.path}`, {
      method: probe.method ?? "GET",
      headers: { [PROBE_HEADER_NAME]: PROBE_HEADER_VALUE },
      cache: "no-store",
    });
    return {
      path: probe.path,
      ok: res.status === probe.expectHTTP,
      expected: probe.expectHTTP,
      actual: res.status,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { path: probe.path, ok: false, expected: probe.expectHTTP, actual: null, error: msg };
  }
}

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req, "/api/maint/probe")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const base = getBaseURL();
  const secret = process.env.CRON_SECRET ?? "";

  // Run cron probes sequentially to avoid hammering Vercel with parallel cold
  // starts (some of these take several seconds). Unauth probes can run in
  // parallel since they're just edge-level checks.
  const cronResults: ProbeResult[] = [];
  for (const p of CRON_PROBES) {
    cronResults.push(await runCronProbe(base, p, secret));
  }

  const unauthResults = await Promise.all(
    UNAUTH_API_PROBES.map((p) => runUnauthProbe(base, p)),
  );

  const activeFingerprints = new Set<string>();
  let failures = 0;

  for (const r of cronResults) {
    if (r.ok) continue;
    failures++;
    const fp = `probe:${r.path}`;
    activeFingerprints.add(fp);
    const reason = r.error
      ? `fetch error: ${r.error}`
      : r.missingKeys
        ? `missing keys [${r.missingKeys.join(", ")}]`
        : `HTTP ${r.actual} expected ${r.expected}`;
    await reportFinding({
      agent: AGENT_NAME,
      severity: "critical", // broken cron = critical
      fingerprint: fp,
      title: `Cron probe failed: ${r.path} — ${reason}`,
      details: { ...r, kind: "cron" },
      fix_suggestion: `Check Vercel logs for ${r.path}. Re-run manually with Bearer CRON_SECRET to reproduce.`,
    });
  }

  for (const r of unauthResults) {
    if (r.ok) continue;
    failures++;
    const fp = `probe:${r.path}[unauth]`;
    activeFingerprints.add(fp);
    // If a protected route returns 200 unauthenticated, that's a data leak.
    const dataLeak = r.actual === 200;
    const reason = r.error
      ? `fetch error: ${r.error}`
      : `HTTP ${r.actual} expected ${r.expected}${dataLeak ? " (POSSIBLE DATA LEAK)" : ""}`;
    await reportFinding({
      agent: AGENT_NAME,
      severity: dataLeak ? "critical" : "medium",
      fingerprint: fp,
      title: `Unauth probe failed: ${r.path} — ${reason}`,
      details: { ...r, kind: "unauth" },
      fix_suggestion: dataLeak
        ? `Route ${r.path} returned 200 without auth. Ensure auth guard is in place.`
        : `Route ${r.path} returned ${r.actual} instead of ${r.expected}. Verify the handler still exists and the auth guard is correct.`,
    });
  }

  await autoResolveStale(AGENT_NAME, activeFingerprints);

  return NextResponse.json({
    ok: failures === 0,
    base,
    cronProbes: cronResults.length,
    unauthProbes: unauthResults.length,
    failures,
    results: { cron: cronResults, unauth: unauthResults },
  });
}
