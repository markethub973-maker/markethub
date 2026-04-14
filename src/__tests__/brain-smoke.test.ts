/**
 * Smoke tests for the Alex CEO stack.
 * Run: `npm test -- brain-smoke`.
 *
 * These hit live infrastructure when the env is configured — they're
 * safe because they use dry-run / cron-secret paths that don't send
 * real emails or charge real cards.
 */

describe("Alex CEO smoke tests", () => {
  const BASE = process.env.SMOKE_BASE_URL ?? "https://markethubpromo.com";
  const CRON = process.env.BRAIN_CRON_SECRET ?? "";

  it("advisor endpoint returns state with cron secret", async () => {
    if (!CRON) return; // skip locally without secret
    const r = await fetch(`${BASE}/api/brain/advisor`, {
      headers: { "x-brain-cron-secret": CRON },
    });
    expect(r.status).toBe(200);
    const d = (await r.json()) as { ok?: boolean; state?: unknown };
    expect(d.ok).toBe(true);
    expect(d.state).toBeDefined();
  });

  it("offer checkout creates a Stripe session (RO)", async () => {
    const r = await fetch(`${BASE}/api/offer/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tier: "ro" }),
    });
    expect(r.status).toBe(200);
    const d = (await r.json()) as { url?: string };
    expect(d.url).toMatch(/^https:\/\/checkout\.stripe\.com/);
  });

  it("offer checkout rejects invalid tier", async () => {
    const r = await fetch(`${BASE}/api/offer/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tier: "nonsense" }),
    });
    expect(r.status).toBe(400);
  });

  it("brain health check returns status report", async () => {
    if (!CRON) return;
    const r = await fetch(`${BASE}/api/cron/brain-health`, {
      headers: { "x-brain-cron-secret": CRON },
    });
    expect([200, 503].includes(r.status)).toBe(true);
    const d = (await r.json()) as { ok: boolean; checks: unknown[] };
    expect(Array.isArray(d.checks)).toBe(true);
  });

  it("landing pages respond 200", async () => {
    for (const path of ["/offer-ro", "/offer-intl"]) {
      const r = await fetch(`${BASE}${path}`);
      expect(r.status).toBe(200);
    }
  });
});
