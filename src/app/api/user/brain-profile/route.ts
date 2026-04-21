import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/route-helpers";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/user/brain-profile — Load user's brain profile.
 */
export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_brain_profiles")
    .select("*")
    .eq("user_id", auth.userId)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("[brain-profile/GET] error:", error);
    return NextResponse.json({ error: "Failed to load brain profile" }, { status: 500 });
  }

  return NextResponse.json({ profile: data || null });
}

/**
 * POST /api/user/brain-profile — Update brain profile preferences (overrides).
 * Body: { niche?, preferred_tone?, preferred_format?, preferred_platforms?, reset?: boolean }
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const supabase = await createClient();

  // Handle reset
  if (body.reset === true) {
    const resetPayload = {
      niche_detected: null,
      detected_niche: null,
      preferred_tone: "professional",
      preferred_format: "carousel",
      preferred_platforms: [],
      best_posting_times: {},
      learning_confidence: 0,
      total_campaigns: 0,
      success_ratio: 0,
      custom_prefs: {},
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("user_brain_profiles")
      .update(resetPayload)
      .eq("user_id", auth.userId);

    if (error) {
      console.error("[brain-profile/POST] reset error:", error);
      return NextResponse.json({ error: "Failed to reset brain profile" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: "Brain profile reset" });
  }

  // Build update payload from allowed fields
  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (body.niche !== undefined) {
    updatePayload.niche_detected = body.niche;
    updatePayload.detected_niche = body.niche; // support both column names
  }
  if (body.preferred_tone !== undefined) {
    updatePayload.preferred_tone = body.preferred_tone;
  }
  if (body.preferred_format !== undefined) {
    updatePayload.preferred_format = body.preferred_format;
  }
  if (body.preferred_platforms !== undefined) {
    updatePayload.preferred_platforms = body.preferred_platforms;
  }

  // Check if profile exists
  const { data: existing } = await supabase
    .from("user_brain_profiles")
    .select("id")
    .eq("user_id", auth.userId)
    .single();

  if (existing) {
    const { data, error } = await supabase
      .from("user_brain_profiles")
      .update(updatePayload)
      .eq("user_id", auth.userId)
      .select()
      .single();

    if (error) {
      console.error("[brain-profile/POST] update error:", error);
      return NextResponse.json({ error: "Failed to update brain profile" }, { status: 500 });
    }
    return NextResponse.json({ profile: data });
  }

  // Insert new profile
  const { data, error } = await supabase
    .from("user_brain_profiles")
    .insert({
      user_id: auth.userId,
      ...updatePayload,
    })
    .select()
    .single();

  if (error) {
    console.error("[brain-profile/POST] insert error:", error);
    return NextResponse.json({ error: "Failed to create brain profile" }, { status: 500 });
  }

  return NextResponse.json({ profile: data });
}
