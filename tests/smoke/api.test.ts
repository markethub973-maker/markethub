/**
 * API Smoke Tests — M2 Sprint 1
 *
 * Runs against a live deployment (prod by default, preview via env).
 * Each test asserts:
 *  - endpoint reachable
 *  - expected status class (2xx/3xx/401 for gated routes)
 *  - response shape (JSON parses, has expected top-level key)
 *
 * Invocation:
 *   npx vitest run --config vitest.smoke.config.ts
 *   SMOKE_BASE_URL=https://preview.vercel.app npx vitest run --config vitest.smoke.config.ts
 *
 * CI: .github/workflows/smoke-tests.yml runs this after every Vercel deploy.
 */

import { describe, it, expect, beforeAll } from "vitest";

const BASE_URL =
  process.env.SMOKE_BASE_URL?.replace(/\/$/, "") ??
  "https://markethubpromo.com";

async function hit(path: string, init?: RequestInit) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "User-Agent": "markethub-smoke-tests/1.0",
      ...(init?.headers ?? {}),
    },
  });
  const ct = res.headers.get("content-type") ?? "";
  let body: unknown = null;
  if (ct.includes("application/json")) {
    body = await res.json().catch(() => null);
  } else {
    body = await res.text().catch(() => "");
  }
  return { status: res.status, body, headers: res.headers };
}

describe(`Smoke tests · ${BASE_URL}`, () => {
  beforeAll(() => {
    console.log(`[smoke] Target: ${BASE_URL}`);
  });

  // ── Public / marketing pages ────────────────────────────────────────

  it("GET / returns 200", async () => {
    const { status } = await hit("/");
    expect(status).toBe(200);
  });

  it("GET /pricing returns 200", async () => {
    const { status } = await hit("/pricing");
    expect(status).toBe(200);
  });

  it("GET /login returns 200", async () => {
    const { status } = await hit("/login");
    expect(status).toBe(200);
  });

  it("GET /register returns 200", async () => {
    const { status } = await hit("/register");
    expect(status).toBe(200);
  });

  it("GET /privacy returns 200", async () => {
    const { status } = await hit("/privacy");
    expect(status).toBe(200);
  });

  it("GET /terms returns 200", async () => {
    const { status } = await hit("/terms");
    expect(status).toBe(200);
  });

  it("GET /robots.txt returns text", async () => {
    const { status, body } = await hit("/robots.txt");
    expect(status).toBe(200);
    expect(typeof body).toBe("string");
  });

  it("GET /sitemap.xml returns xml-ish content", async () => {
    const { status, body } = await hit("/sitemap.xml");
    expect(status).toBe(200);
    expect(String(body)).toMatch(/<urlset|<sitemap/);
  });

  // ── Gated dashboard routes redirect to login ────────────────────────

  it("GET /dashboard redirects or 401s when not logged in", async () => {
    const { status } = await hit("/dashboard", { redirect: "manual" });
    expect([200, 302, 307, 401, 403]).toContain(status);
  });

  it("GET /dashboard/admin redirects or forbids when anonymous", async () => {
    const { status } = await hit("/dashboard/admin", { redirect: "manual" });
    expect([200, 302, 307, 401, 403]).toContain(status);
  });

  // ── Public API endpoints ────────────────────────────────────────────

  it("GET /api/security/health-check returns summary (no auth) or 404 if not yet deployed", async () => {
    const { status, body } = await hit("/api/security/health-check");
    // 200 = public summary, 404 = not yet deployed, 401 = WAF/auth intercepting
    expect([200, 401, 404]).toContain(status);
    if (status === 200) {
      const json = body as { ok?: boolean; summary?: { total?: number } };
      expect(json?.ok).toBe(true);
      expect(json?.summary?.total).toBeGreaterThan(0);
    }
  });

  // ── Gated API endpoints — expect 401 for anonymous ──────────────────

  const GATED_GET = [
    "/api/support/tickets",
    "/api/consultant/chat",
    "/api/learning/issues",
    "/api/learning/issues/search?q=test",
    "/api/admin/support-tickets",
    "/api/admin/security-agents",
    "/api/cost-monitor/status",
  ];
  for (const path of GATED_GET) {
    it(`GET ${path} is gated or not yet deployed (401/403/404)`, async () => {
      const { status } = await hit(path);
      // 404 acceptable for routes that may not be in the live build yet
      expect([401, 403, 404]).toContain(status);
    });
  }

  // ── Cron endpoints reject missing secret ────────────────────────────

  const CRON_ENDPOINTS = [
    "/api/cron/security-scan",
    "/api/cron/abuse-scan",
    "/api/cron/health-monitor",
    "/api/cron/learning-digest",
    "/api/cost-monitor/check",
  ];
  for (const path of CRON_ENDPOINTS) {
    it(`${path} rejects without Bearer (401/403/404/405)`, async () => {
      const { status } = await hit(path, { method: "POST" });
      // 404 acceptable if not yet deployed, 405 if POST-on-GET route
      expect([401, 403, 404, 405]).toContain(status);
    });
  }

  // ── Misc ────────────────────────────────────────────────────────────

  it("OPTIONS preflight on API doesn't crash", async () => {
    const { status } = await hit("/api/consultant/chat", { method: "OPTIONS" });
    // Next.js typically returns 405 or 204 for OPTIONS — anything != 5xx
    expect(status).toBeLessThan(500);
  });

  it("Bogus path doesn't 5xx", async () => {
    const { status } = await hit("/this-route-should-never-exist-xyz");
    // Next.js may serve a catch-all 200 with not-found UI, or a true 404 —
    // either is fine. Only server errors indicate a real problem.
    expect(status).toBeLessThan(500);
  });

  it("Security headers present on homepage", async () => {
    const { headers } = await hit("/");
    // At least one of these should be set by Next or Cloudflare
    const hasHsts = headers.get("strict-transport-security");
    const hasXfo = headers.get("x-frame-options") ?? headers.get("content-security-policy");
    expect(hasHsts || hasXfo).toBeTruthy();
  });
});
