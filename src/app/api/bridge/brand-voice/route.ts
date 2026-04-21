import { NextRequest, NextResponse } from "next/server";
import { bridgeAuth } from "@/lib/bridgeAuth";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * GET /api/bridge/brand-voice — Get brand voice profiles
 * Query params: ?user_id=xxx (optional, returns all if omitted)
 */
export async function GET(req: NextRequest) {
  const auth = bridgeAuth(req);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("user_id");

  const supa = createServiceClient();

  let query = supa
    .from("brand_voice_profiles")
    .select("id, user_id, client_name, tone, vocabulary, style_notes, examples, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;

  if (error) {
    // Table might not exist yet — return empty
    return NextResponse.json({ profiles: [], error: error.message });
  }

  return NextResponse.json({ profiles: data ?? [] });
}
