import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/route-helpers";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const niche = req.nextUrl.searchParams.get("niche");
  const supa = createServiceClient();
  let query = supa.from("influencers").select("*").eq("user_id", auth.userId).order("followers_ig", { ascending: false });
  if (niche) query = query.eq("niche", niche);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ influencers: data });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const body = await req.json();

  // If ig_username provided, try to enrich with real data
  let enriched: Record<string, any> = {};
  if (body.ig_username) {
    try {
      const igRes = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/instagram/competitor?username=${encodeURIComponent(body.ig_username.replace(/^@/, ""))}`,
        { headers: { "Cookie": req.headers.get("cookie") ?? "" } }
      );
      if (igRes.ok) {
        const igData = await igRes.json();
        enriched = {
          followers_ig: igData.profile?.followers ?? 0,
          engagement_ig: igData.engagementRate ?? 0,
        };
      }
    } catch { /* non-fatal */ }
  }

  const supa = createServiceClient();
  const { data, error } = await supa.from("influencers").insert({
    user_id: auth.userId,
    name: body.name,
    ig_username: body.ig_username ?? "",
    tt_username: body.tt_username ?? "",
    youtube_url: body.youtube_url ?? "",
    niche: body.niche ?? "",
    followers_ig: enriched.followers_ig ?? body.followers_ig ?? 0,
    followers_tt: body.followers_tt ?? 0,
    engagement_ig: enriched.engagement_ig ?? body.engagement_ig ?? 0,
    email: body.email ?? "",
    location: body.location ?? "",
    language: body.language ?? "",
    price_post: body.price_post ?? 0,
    status: body.status ?? "prospect",
    tags: body.tags ?? [],
    notes: body.notes ?? "",
    last_checked: enriched.followers_ig ? new Date().toISOString() : null,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ influencer: data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { id, ...rest } = await req.json();
  const supa = createServiceClient();
  const { data, error } = await supa.from("influencers").update({ ...rest, updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", auth.userId).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ influencer: data });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { id } = await req.json();
  const supa = createServiceClient();
  await supa.from("influencers").delete().eq("id", id).eq("user_id", auth.userId);
  return NextResponse.json({ ok: true });
}
