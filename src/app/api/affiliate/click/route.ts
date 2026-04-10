import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

// Public endpoint — increments click counter and redirects
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const supa = createServiceClient();
  const { data } = await supa.from("affiliate_links").select("url, clicks").eq("id", id).single();
  if (!data?.url) return NextResponse.json({ error: "Link not found" }, { status: 404 });

  // Increment clicks (non-blocking)
  supa.from("affiliate_links").update({ clicks: (data.clicks ?? 0) + 1 }).eq("id", id).then(() => {});

  return NextResponse.redirect(data.url);
}
