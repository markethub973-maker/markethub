import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const url = req.nextUrl.searchParams.get("url");
  if (!url) return new NextResponse("Missing url", { status: 400 });

  // Only allow exact Instagram CDN hostnames — use Set + exact match to prevent
  // subdomain bypass attacks (e.g. evil.instagram.com.attacker.com)
  const ALLOWED_HOSTS = new Set([
    "instagram.com", "www.instagram.com",
    "cdninstagram.com",
    "scontent.cdninstagram.com",
    "scontent-ams4-1.cdninstagram.com",
    "fbcdn.net",
    "scontent.fbcdn.net",
  ]);
  let parsed: URL;
  try {
    parsed = new URL(url);
    // Block non-HTTPS and private/internal addresses
    if (parsed.protocol !== "https:") {
      return new NextResponse("Only HTTPS allowed", { status: 403 });
    }
    const host = parsed.hostname.toLowerCase();
    // Block private IP ranges (SSRF protection)
    if (/^(localhost|127\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|::1)/.test(host)) {
      return new NextResponse("Domain not allowed", { status: 403 });
    }
    // Exact hostname match OR ends with .cdninstagram.com / .fbcdn.net (CDN subdomains)
    const allowed = ALLOWED_HOSTS.has(host)
      || host.endsWith(".cdninstagram.com")
      || host.endsWith(".fbcdn.net");
    if (!allowed) {
      return new NextResponse("Domain not allowed", { status: 403 });
    }
  } catch {
    return new NextResponse("Invalid URL", { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://www.instagram.com/",
      },
    });

    if (!res.ok) {
      return new NextResponse("Failed to fetch image", { status: res.status });
    }

    const contentType = res.headers.get("content-type") || "image/jpeg";
    const buffer = await res.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new NextResponse("Proxy error", { status: 500 });
  }
}
