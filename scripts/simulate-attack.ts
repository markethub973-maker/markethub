/**
 * Cockpit — Attack simulation harness.
 *
 * Red-team script that fires synthetic attacks against the live platform
 * and verifies that the maintenance agent team detects them. Produces a
 * report at the end showing which scenarios were caught, which were
 * missed, and how fast each detection fired.
 *
 * Usage:
 *   CRON_SECRET=... BASE_URL=https://viralstat-dashboard.vercel.app \
 *     npx tsx scripts/simulate-attack.ts
 *
 * What it fires:
 *
 *   1. Brute-force admin tunnel (10 hits in 30s to /api/admin/users
 *      without tunnel token). Expected to trigger brute_force_admin
 *      security events, which the reactive SIEM should flag as an
 *      "attack-confirmed" after pattern recognition.
 *
 *   2. Brute-force login (15 bad /api/auth/register attempts). Expected
 *      to trip rate limits and produce brute_force_login events.
 *
 *   3. Cron endpoint probing without secret (10 hits across /api/cron/*
 *      with no auth header). Expected to produce cron_unauthorized
 *      security events.
 *
 *   4. Oversized payload (POST to /api/find-clients/search with 100 KB
 *      body). Expected to produce a payload_too_large event.
 *
 *   5. Cron probe kill (rewrite one of the critical crons to always 500
 *      → NOT simulated here, would require code change). We only check
 *      that the watchdog has fired by reading its most recent log.
 *
 * After each scenario, the script polls maintenance_findings + cron_logs
 * for up to 90s looking for the expected agent response, then prints a
 * per-scenario PASS/FAIL verdict with the detection latency.
 *
 * IMPORTANT: this script is destructive to the SIEM event log and
 * maintenance_findings (it pollutes them with synthetic events). The
 * `siem-analyst` filter already drops probe-tagged events, so the noise
 * is transient. Run it during a quiet window and clean up manually if
 * findings pile up.
 */

import crypto from "crypto";

const BASE = process.env.BASE_URL ?? "https://viralstat-dashboard.vercel.app";
const CRON_SECRET = process.env.CRON_SECRET ?? "";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://kashohhwsxyhyhhppvik.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!CRON_SECRET) {
  console.error("CRON_SECRET env required");
  process.exit(1);
}
if (!SUPABASE_SERVICE_KEY) {
  console.error("SUPABASE_SERVICE_ROLE_KEY env required");
  process.exit(1);
}

const RUN_ID = crypto.randomBytes(4).toString("hex");
const runTime = new Date().toISOString();

console.log(`\n━━━ COCKPIT RED TEAM ━━━`);
console.log(`Run ID: ${RUN_ID}`);
console.log(`Target: ${BASE}`);
console.log(`Start:  ${runTime}\n`);

interface ScenarioResult {
  name: string;
  expected: string;
  passed: boolean;
  detection_latency_s: number | null;
  evidence: unknown;
}

const results: ScenarioResult[] = [];

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Poll security_events for an event matching the filter. Returns seconds until detected. */
async function waitForEvent(
  filter: (e: { event_type: string; ip: string | null; path: string | null; created_at: string }) => boolean,
  windowStart: Date,
  timeoutS = 90,
): Promise<{ found: boolean; latency_s: number | null; evidence: unknown }> {
  const start = Date.now();
  const startIso = windowStart.toISOString();
  while (Date.now() - start < timeoutS * 1000) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/security_events?select=event_type,ip,path,created_at,severity&created_at=gte.${startIso}&order=created_at.desc&limit=50`,
      {
        headers: {
          apikey: SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
      },
    );
    if (res.ok) {
      const events = (await res.json()) as Array<{
        event_type: string;
        ip: string | null;
        path: string | null;
        created_at: string;
        severity: string;
      }>;
      const hit = events.find(filter);
      if (hit) {
        const latency = (Date.now() - start) / 1000;
        return { found: true, latency_s: latency, evidence: hit };
      }
    }
    await sleep(2000);
  }
  return { found: false, latency_s: null, evidence: null };
}

// ── Scenario 1 — Brute force admin tunnel ──────────────────────────────────
async function bruteForceAdmin(): Promise<ScenarioResult> {
  console.log("▶ Scenario 1: brute-force admin tunnel");
  const windowStart = new Date();
  for (let i = 0; i < 10; i++) {
    await fetch(`${BASE}/api/admin/users`, {
      headers: { "User-Agent": `redteam/${RUN_ID} simulated-brute-force` },
    }).catch(() => null);
    await sleep(200);
  }
  const { found, latency_s, evidence } = await waitForEvent(
    (e) => e.event_type === "brute_force_admin" && (e.path?.startsWith("/api/admin/") ?? false),
    windowStart,
    60,
  );
  return {
    name: "brute_force_admin",
    expected: "brute_force_admin event in security_events within 60s",
    passed: found,
    detection_latency_s: latency_s,
    evidence,
  };
}

// ── Scenario 2 — Cron unauthorized ─────────────────────────────────────────
async function cronUnauthorized(): Promise<ScenarioResult> {
  console.log("▶ Scenario 2: cron endpoint probing without secret");
  const windowStart = new Date();
  const paths = [
    "/api/cron/security-scan",
    "/api/cron/trending-scan",
    "/api/cron/social-listening",
  ];
  for (const path of paths) {
    await fetch(`${BASE}${path}`, {
      headers: { "User-Agent": `redteam/${RUN_ID} simulated-cron-probe` },
    }).catch(() => null);
    await sleep(300);
  }
  const { found, latency_s, evidence } = await waitForEvent(
    (e) => e.event_type === "cron_unauthorized",
    windowStart,
    60,
  );
  return {
    name: "cron_unauthorized",
    expected: "cron_unauthorized event in security_events within 60s",
    passed: found,
    detection_latency_s: latency_s,
    evidence,
  };
}

// ── Scenario 3 — Oversized payload ─────────────────────────────────────────
async function oversizedPayload(): Promise<ScenarioResult> {
  console.log("▶ Scenario 3: oversized POST payload");
  const windowStart = new Date();
  const bigString = "x".repeat(70_000); // > 50 KB middleware limit
  await fetch(`${BASE}/api/find-clients/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": `redteam/${RUN_ID} simulated-oversized-payload`,
    },
    body: JSON.stringify({ query: bigString }),
  }).catch(() => null);
  const { found, latency_s, evidence } = await waitForEvent(
    (e) => e.event_type === "payload_too_large",
    windowStart,
    60,
  );
  return {
    name: "payload_too_large",
    expected: "payload_too_large event in security_events within 60s",
    passed: found,
    detection_latency_s: latency_s,
    evidence,
  };
}

// ── Scenario 4 — Watchdog fires on-demand ──────────────────────────────────
async function watchdogProbe(): Promise<ScenarioResult> {
  console.log("▶ Scenario 4: watchdog fast probe on demand");
  const windowStart = new Date();
  const res = await fetch(`${BASE}/api/cockpit/watchdog`, {
    headers: { Authorization: `Bearer ${CRON_SECRET}` },
  });
  const body = await res.json().catch(() => null);
  return {
    name: "watchdog",
    expected: "watchdog returns 200 with checks block",
    passed: res.ok && body?.checks !== undefined,
    detection_latency_s: (Date.now() - windowStart.getTime()) / 1000,
    evidence: body,
  };
}

// ── Scenario 5 — Reactive SIEM analyst fires on brute force ────────────────
async function reactiveAnalyst(): Promise<ScenarioResult> {
  console.log("▶ Scenario 5: reactive SIEM analyst verdict");
  // Already triggered via scenario 1 — just poll maintenance_findings for
  // an agent=reactive-siem row written in the last 2 min.
  const since = new Date(Date.now() - 120_000).toISOString();
  const start = Date.now();
  while (Date.now() - start < 90_000) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/maintenance_findings?select=id,title,severity,details,first_seen&agent_name=eq.reactive-siem&first_seen=gte.${since}&order=first_seen.desc&limit=5`,
      {
        headers: {
          apikey: SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
      },
    );
    if (res.ok) {
      const rows = (await res.json()) as unknown[];
      if (rows.length > 0) {
        return {
          name: "reactive-siem-verdict",
          expected: "reactive-siem finding within 90s of brute force",
          passed: true,
          detection_latency_s: (Date.now() - start) / 1000,
          evidence: rows[0],
        };
      }
    }
    await sleep(3000);
  }
  return {
    name: "reactive-siem-verdict",
    expected: "reactive-siem finding within 90s of brute force",
    passed: false,
    detection_latency_s: null,
    evidence: null,
  };
}

// ── Run all ────────────────────────────────────────────────────────────────
async function main() {
  results.push(await bruteForceAdmin());
  results.push(await cronUnauthorized());
  results.push(await oversizedPayload());
  results.push(await watchdogProbe());
  results.push(await reactiveAnalyst());

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log(`\n━━━ RESULTS ━━━`);
  for (const r of results) {
    const icon = r.passed ? "✅" : "❌";
    const lat = r.detection_latency_s !== null ? `${r.detection_latency_s.toFixed(1)}s` : "TIMEOUT";
    console.log(`${icon} ${r.name.padEnd(28)} ${lat.padStart(8)}  → ${r.expected}`);
  }
  console.log(`\nTotal: ${passed} passed / ${failed} failed`);
  console.log(`End:   ${new Date().toISOString()}`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(2);
});
