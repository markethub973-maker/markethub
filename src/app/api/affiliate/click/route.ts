import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { logSecurityEvent } from "@/lib/siem";

// Public endpoint — increments click counter and redirects to affiliate URL.
// The URL is stored in the DB (written only by authenticated users), but we
// still validate it on the way out to prevent stored-redirect abuse.
function isSafeExternalUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    // Only allow HTTPS — no http, javascript, data, file, etc.
    if (u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase();
    // Block private / loopback addresses (SSRF + open-redirect to internal hosts)
    if (/^(localhost|127\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|::1)/.test(host)) return false;
    return true;
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const supa = createServiceClient();
  const { data } = await supa.from("affiliate_links").select("url, clicks").eq("id", id).single();
  if (!data?.url) return NextResponse.json({ error: "Link not found" }, { status: 404 });

  // Validate destination URL before redirecting
  if (!isSafeExternalUrl(data.url)) {
    void logSecurityEvent({
      event_type: "ssrf_attempt",
      ip: req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? undefined,
      path: "/api/affiliate/click",
      details: { affiliate_id: id, blocked_url: data.url },
    });
    return NextResponse.json({ error: "Invalid redirect URL" }, { status: 400 });
  }

  // Increment clicks (non-blocking)
  supa.from("affiliate_links").update({ clicks: (data.clicks ?? 0) + 1 }).eq("id", id).then(() => {});

  return NextResponse.redirect(data.url);
}
