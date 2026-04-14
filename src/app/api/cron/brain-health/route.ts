/**
 * GET /api/cron/brain-health — daily self-check for the Alex CEO stack.
 *
 * Runs daily via n8n. Verifies:
 *   - Brain advisor returns state (Supabase reachable, Claude reachable)
 *   - Offer checkout endpoint returns a Stripe URL (Stripe reachable)
 *   - outreach_log table accessible
 *   - Resend send endpoint responds (with a no-op verification ping)
 *
 * If any check fails → emails alert to office@.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface CheckResult {
  name: string;
  ok: boolean;
  latency_ms: number;
  note?: string;
}

async function timed<T>(fn: () => Promise<T>): Promise<{ result: T | null; ms: number; error?: string }> {
  const t = Date.now();
  try {
    const result = await fn();
    return { result, ms: Date.now() - t };
  } catch (e) {
    return { result: null, ms: Date.now() - t, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-brain-cron-secret");
  if (!secret || secret !== process.env.BRAIN_CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const checks: CheckResult[] = [];

  // 1. Advisor endpoint (full stack: DB + Claude + env)
  const advisor = await timed(() =>
    fetch("https://markethubpromo.com/api/brain/advisor", {
      headers: { "x-brain-cron-secret": secret },
    }).then((r) => r.json()),
  );
  checks.push({
    name: "brain_advisor",
    ok: (advisor.result as { ok?: boolean })?.ok === true,
    latency_ms: advisor.ms,
    note: advisor.error,
  });

  // 2. Offer checkout (Stripe reachable)
  const offer = await timed(() =>
    fetch("https://markethubpromo.com/api/offer/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tier: "ro" }),
    }).then((r) => r.json()),
  );
  checks.push({
    name: "offer_checkout",
    ok: Boolean((offer.result as { url?: string })?.url),
    latency_ms: offer.ms,
    note: offer.error,
  });

  // 3. Supabase outreach_log read
  const svc = createServiceClient();
  const logCheck = await timed(async () => {
    const r = await svc.from("outreach_log").select("id", { count: "exact", head: true });
    return r;
  });
  const count = (logCheck.result as { count?: number | null } | null)?.count ?? null;
  checks.push({
    name: "outreach_log_table",
    ok: logCheck.error === undefined && logCheck.result !== null,
    latency_ms: logCheck.ms,
    note: `${count ?? "?"} rows`,
  });

  // 4. Resend API reachable
  const resend = await timed(() =>
    fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY ?? ""}` },
    }).then((r) => ({ status: r.status })),
  );
  checks.push({
    name: "resend_api",
    ok: (resend.result as { status?: number })?.status === 200,
    latency_ms: resend.ms,
    note: resend.error,
  });

  const failing = checks.filter((c) => !c.ok);
  const allOk = failing.length === 0;

  // Alert on failures
  if (!allOk && process.env.RESEND_API_KEY) {
    const rows = failing
      .map((c) => `<li><b>${c.name}</b> — ${c.latency_ms}ms — ${c.note ?? "failed"}</li>`)
      .join("");
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Alex <alex@markethubpromo.com>",
        to: ["markethub973@gmail.com"],
        subject: `⚠️ Brain health check — ${failing.length} check(s) failing`,
        html: `<p>The Alex CEO stack has ${failing.length} failing check(s) as of ${new Date().toISOString()}:</p><ul>${rows}</ul><p>Full result: <pre>${JSON.stringify(checks, null, 2)}</pre></p>`,
      }),
    });
  }

  return NextResponse.json({ ok: allOk, checks });
}
