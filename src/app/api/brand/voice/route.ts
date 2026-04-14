/**
 * GET    /api/brand/voice — current user's voice profile
 * PUT    /api/brand/voice — save/update profile (used after user edits
 *                          the Haiku-generated suggestion)
 * DELETE /api/brand/voice — clear profile
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

async function authedUser() {
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  return user;
}

export async function GET() {
  const user = await authedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const service = createServiceClient();
  const { data } = await service
    .from("user_brand_voice")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  return NextResponse.json({ ok: true, voice: data ?? null });
}

export async function PUT(req: NextRequest) {
  const user = await authedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    tone?: string;
    vocabulary?: string;
    style_guide?: string;
    dos?: string[];
    donts?: string[];
    sample_posts?: string[];
    ai_summary?: string;
  } | null;
  if (!body) return NextResponse.json({ error: "body required" }, { status: 400 });

  const service = createServiceClient();
  const { error } = await service
    .from("user_brand_voice")
    .upsert({
      user_id: user.id,
      tone: body.tone?.slice(0, 500) ?? null,
      vocabulary: body.vocabulary?.slice(0, 1000) ?? null,
      style_guide: body.style_guide?.slice(0, 3000) ?? null,
      dos: (body.dos ?? []).slice(0, 20).map((s) => s.slice(0, 200)),
      donts: (body.donts ?? []).slice(0, 20).map((s) => s.slice(0, 200)),
      sample_posts: (body.sample_posts ?? []).slice(0, 10).map((s) => s.slice(0, 4000)),
      ai_summary: body.ai_summary?.slice(0, 3000) ?? null,
    });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const user = await authedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const service = createServiceClient();
  const { error } = await service
    .from("user_brand_voice")
    .delete()
    .eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
