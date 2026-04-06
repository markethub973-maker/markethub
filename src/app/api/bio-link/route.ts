import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

// GET — fetch user's bio link page
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("bio_links")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ bio: data || null });
}

// POST — create or update bio link page
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { slug, title, description, avatar_url, bg_color, accent_color, links } = body as {
    slug?: string; title?: string; description?: string; avatar_url?: string;
    bg_color?: string; accent_color?: string; links?: unknown[];
  };

  // Check slug uniqueness (exclude own)
  if (slug) {
    const svc = createServiceClient();
    const { data: existing } = await svc
      .from("bio_links")
      .select("user_id")
      .eq("slug", slug)
      .single();
    if (existing && existing.user_id !== user.id) {
      return NextResponse.json({ error: "This URL is already taken. Choose another." }, { status: 409 });
    }
  }

  const payload: Record<string, unknown> = {
    user_id: user.id,
    updated_at: new Date().toISOString(),
  };
  if (slug !== undefined) payload.slug = slug?.toLowerCase().replace(/[^a-z0-9_-]/g, "") || null;
  if (title !== undefined) payload.title = title;
  if (description !== undefined) payload.description = description;
  if (avatar_url !== undefined) payload.avatar_url = avatar_url;
  if (bg_color !== undefined) payload.bg_color = bg_color;
  if (accent_color !== undefined) payload.accent_color = accent_color;
  if (links !== undefined) payload.links = links;

  const { data, error } = await supabase
    .from("bio_links")
    .upsert(payload, { onConflict: "user_id" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ bio: data });
}

// PATCH — increment click count for a specific link
export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { slug, link_id } = body as { slug: string; link_id: string };
  if (!slug || !link_id) return NextResponse.json({ ok: false });

  const svc = createServiceClient();
  const { data } = await svc.from("bio_links").select("links").eq("slug", slug).single();
  if (!data) return NextResponse.json({ ok: false });

  const links = (data.links as any[]) || [];
  const updated = links.map((l: any) =>
    l.id === link_id ? { ...l, clicks: (l.clicks || 0) + 1 } : l
  );
  await svc.from("bio_links").update({ links: updated }).eq("slug", slug);
  return NextResponse.json({ ok: true });
}
