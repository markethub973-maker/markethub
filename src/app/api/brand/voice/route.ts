/**
 * GET    /api/brand/voice?client_id=xxx — voice profile (client-specific or global)
 * PUT    /api/brand/voice — save/update profile (supports client_id)
 * DELETE /api/brand/voice?client_id=xxx — clear profile
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

export async function GET(req: NextRequest) {
  const user = await authedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clientId = req.nextUrl.searchParams.get("client_id");
  const service = createServiceClient();

  if (clientId) {
    // Try client-specific voice first
    const { data: clientVoice } = await service
      .from("user_brand_voice")
      .select("*")
      .eq("user_id", user.id)
      .eq("client_id", clientId)
      .maybeSingle();
    if (clientVoice) {
      return NextResponse.json({ ok: true, voice: clientVoice, scope: "client" });
    }
  }

  // Global voice (client_id IS NULL)
  const { data } = await service
    .from("user_brand_voice")
    .select("*")
    .eq("user_id", user.id)
    .is("client_id", null)
    .maybeSingle();
  return NextResponse.json({ ok: true, voice: data ?? null, scope: "global" });
}

export async function PUT(req: NextRequest) {
  const user = await authedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    client_id?: string;
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
  const row: Record<string, unknown> = {
    user_id: user.id,
    client_id: body.client_id || null,
    tone: body.tone?.slice(0, 500) ?? null,
    vocabulary: body.vocabulary?.slice(0, 1000) ?? null,
    style_guide: body.style_guide?.slice(0, 3000) ?? null,
    dos: (body.dos ?? []).slice(0, 20).map((s) => s.slice(0, 200)),
    donts: (body.donts ?? []).slice(0, 20).map((s) => s.slice(0, 200)),
    sample_posts: (body.sample_posts ?? []).slice(0, 10).map((s) => s.slice(0, 4000)),
    ai_summary: body.ai_summary?.slice(0, 3000) ?? null,
  };

  // Upsert: unique on (user_id, client_id)
  const { error } = await service
    .from("user_brand_voice")
    .upsert(row, { onConflict: "user_id,client_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, scope: body.client_id ? "client" : "global" });
}

export async function DELETE(req: NextRequest) {
  const user = await authedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clientId = req.nextUrl.searchParams.get("client_id");
  const service = createServiceClient();

  let query = service
    .from("user_brand_voice")
    .delete()
    .eq("user_id", user.id);

  if (clientId) {
    query = query.eq("client_id", clientId);
  } else {
    query = query.is("client_id", null);
  }

  const { error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
