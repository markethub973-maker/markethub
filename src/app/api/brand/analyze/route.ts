/**
 * POST /api/brand/analyze — accept 3-5 sample posts, return an analyzed
 * voice profile (tone, vocab, rules, dos/donts, summary).
 *
 * Does NOT persist — the UI lets the user review + edit before saving
 * via PUT /api/brand/voice.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { analyzeBrandVoice } from "@/lib/brandVoice";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { samples?: string[] } | null;
  const samples = (body?.samples ?? []).filter((s) => s && s.trim().length >= 20);
  if (samples.length < 2) {
    return NextResponse.json(
      { error: "Provide at least 2 samples of 20+ chars each" },
      { status: 400 },
    );
  }
  if (samples.length > 10) samples.length = 10;

  const voice = await analyzeBrandVoice(samples);
  if (!voice) {
    return NextResponse.json(
      { error: "Analysis failed — try again in a moment" },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true, voice, samples });
}
