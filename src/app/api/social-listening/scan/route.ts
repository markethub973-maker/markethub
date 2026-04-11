import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/route-helpers";

// Authenticated trigger for the social-listening cron. The page used to call
// /api/cron/social-listening directly from the browser with an env var that
// would either be undefined (current state — silently broken) or get exposed
// to every visitor in the client bundle (security trap). Route it through an
// authenticated server endpoint that forwards the real CRON_SECRET internally.
export async function POST() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://markethubpromo.com";
  const res = await fetch(`${appUrl}/api/cron/social-listening`, {
    method: "POST",
    headers: { authorization: `Bearer ${cronSecret}` },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return NextResponse.json({ error: "Scan failed", upstream: text.slice(0, 200) }, { status: 502 });
  }

  const data = await res.json().catch(() => ({ ok: true }));
  return NextResponse.json(data);
}
