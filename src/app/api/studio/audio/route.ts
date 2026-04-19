/**
 * POST /api/studio/audio (session) — generate TTS / music / SFX
 * GET                              — gallery of recent generations
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { generateAudio } from "@/lib/aiAudio";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    mode?: "tts" | "music" | "sfx" | "clone";
    prompt?: string;
    voice?: string;
    duration_sec?: number;
    ref_audio_url?: string;
    ref_text?: string;
  } | null;

  if (!body?.mode || !["tts", "music", "sfx", "clone"].includes(body.mode)) {
    return NextResponse.json({ error: "mode required (tts|music|sfx|clone)" }, { status: 400 });
  }
  if (!body.prompt || body.prompt.trim().length < 2) {
    return NextResponse.json({ error: "prompt required" }, { status: 400 });
  }
  if (body.prompt.length > 2000) {
    return NextResponse.json({ error: "prompt too long (max 2000)" }, { status: 400 });
  }
  if (body.mode === "clone") {
    if (!body.ref_audio_url || !body.ref_text) {
      return NextResponse.json({ error: "ref_audio_url and ref_text required for voice cloning" }, { status: 400 });
    }
    try { new URL(body.ref_audio_url); } catch {
      return NextResponse.json({ error: "invalid ref_audio_url" }, { status: 400 });
    }
    if (body.ref_text.length > 1000) {
      return NextResponse.json({ error: "ref_text too long (max 1000)" }, { status: 400 });
    }
  }

  // Plan gate — admin bypass + agency
  const service = createServiceClient();
  const { data: profile } = await service
    .from("profiles")
    .select("plan,subscription_plan,is_admin")
    .eq("id", user.id)
    .maybeSingle();
  const plan = (profile?.plan as string | null) ?? (profile?.subscription_plan as string | null) ?? "starter";
  const isAdmin = Boolean(profile?.is_admin);
  if (!isAdmin && !["pro", "studio", "agency", "business", "agency"].includes(plan)) {
    return NextResponse.json(
      { error: "AI audio requires Pro plan or higher", upgrade_required: true },
      { status: 403 },
    );
  }

  const result = await generateAudio({
    userId: user.id,
    mode: body.mode,
    prompt: body.prompt.trim(),
    voice: body.voice,
    duration_sec: body.duration_sec,
    ref_audio_url: body.ref_audio_url,
    ref_text: body.ref_text?.trim(),
    source_context: "studio",
  });
  return NextResponse.json(result, { status: result.ok ? 202 : 500 });
}

export async function GET(req: NextRequest) {
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = Math.min(Math.max(parseInt(req.nextUrl.searchParams.get("limit") ?? "24"), 1), 100);
  const { data, error } = await supa
    .from("ai_audio_generations")
    .select("id,provider,model,mode,prompt,voice,duration_sec,audio_url,status,cost_usd,duration_ms,created_at,finished_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, generations: data ?? [] });
}
