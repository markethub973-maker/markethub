import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const url = req.nextUrl.searchParams.get("url");
  if (!url) return new NextResponse("Missing url", { status: 400 });

  // Only allow Instagram CDN URLs
  try {
    const parsed = new URL(url);
    const allowed = ["instagram.com", "cdninstagram.com", "fbcdn.net"];
    if (!allowed.some(d => parsed.hostname.endsWith(d))) {
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
