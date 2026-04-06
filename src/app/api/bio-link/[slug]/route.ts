import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

// Public GET — no auth, fetch bio page by slug + increment view
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!slug) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const svc = createServiceClient();
  const { data, error } = await svc
    .from("bio_links")
    .select("id, slug, title, description, avatar_url, bg_color, accent_color, links, views")
    .eq("slug", slug)
    .single();

  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Increment view count (fire-and-forget)
  svc.from("bio_links").update({ views: (data.views || 0) + 1 }).eq("slug", slug).then(() => {});

  return NextResponse.json({ bio: data });
}
