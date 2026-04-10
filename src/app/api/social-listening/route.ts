import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/route-helpers";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(_req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const supa = createServiceClient();
  const [mentionsRes, configRes] = await Promise.all([
    supa.from("social_mentions").select("*").eq("user_id", auth.userId).order("detected_at", { ascending: false }).limit(100),
    supa.from("listening_config").select("*").eq("user_id", auth.userId).maybeSingle(),
  ]);
  return NextResponse.json({ mentions: mentionsRes.data ?? [], config: configRes.data });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const body = await req.json();
  const supa = createServiceClient();
  const { error } = await supa.from("listening_config").upsert({
    user_id: auth.userId,
    keywords: body.keywords ?? [],
    platforms: body.platforms ?? ["tiktok", "instagram", "reddit", "news"],
    email: body.email ?? "",
    active: body.active ?? true,
    notify_email: body.notify_email ?? true,
    updated_at: new Date().toISOString(),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { id } = await req.json();
  const supa = createServiceClient();
  await supa.from("social_mentions").delete().eq("id", id).eq("user_id", auth.userId);
  return NextResponse.json({ ok: true });
}
