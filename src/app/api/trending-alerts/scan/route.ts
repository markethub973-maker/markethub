import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/route-helpers";

// Authenticated trigger for the trending-scan cron. Same pattern as
// /api/social-listening/scan — the page used to POST to /api/cron/trending-scan
// directly with an empty header which always failed. Route through an
// authenticated server endpoint that forwards the real CRON_SECRET internally.
export async function POST() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://markethubpromo.com";
  const res = await fetch(`${appUrl}/api/cron/trending-scan`, {
    method: "GET",
    headers: { authorization: `Bearer ${cronSecret}` },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return NextResponse.json({ error: "Scan failed", upstream: text.slice(0, 200) }, { status: 502 });
  }

  const data = await res.json().catch(() => ({ ok: true }));
  return NextResponse.json(data);
}
