import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/route-helpers";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * GET /api/theme — Load user's themes (active + all saved slots)
 * Returns: { theme: active_theme | null, slots: [slot1, slot2, slot3] }
 */
export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const supabase = createServiceClient();
  const { data } = await supabase
    .from("user_themes")
    .select("*")
    .eq("user_id", auth.userId)
    .order("created_at", { ascending: true })
    .limit(3);

  const themes = data || [];
  const active = themes.find(t => t.is_active) || themes[0] || null;

  return NextResponse.json({ theme: active, slots: themes });
}

/**
 * POST /api/theme — Save theme to a slot (1, 2 or 3)
 * Body: { slot?: number (1-3), theme_name: string, config: object, set_active?: boolean }
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  let body: { slot?: number; theme_name?: string; config?: Record<string, unknown>; set_active?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { slot = 1, theme_name = "Custom Theme", config, set_active = true } = body;

  if (!config || typeof config !== "object") {
    return NextResponse.json({ error: "config is required" }, { status: 400 });
  }

  if (slot < 1 || slot > 3) {
    return NextResponse.json({ error: "slot must be 1, 2 or 3" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Get existing themes for this user
  const { data: existing } = await supabase
    .from("user_themes")
    .select("id, theme_name")
    .eq("user_id", auth.userId)
    .order("created_at", { ascending: true })
    .limit(3);

  const slots = existing || [];

  // If setting active, deactivate all others first
  if (set_active && slots.length > 0) {
    await supabase
      .from("user_themes")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("user_id", auth.userId);
  }

  // Slot exists → update it
  if (slots[slot - 1]) {
    const { data, error } = await supabase
      .from("user_themes")
      .update({
        theme_name,
        config,
        is_active: set_active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", slots[slot - 1].id)
      .select()
      .single();

    if (error) {
      console.error("[theme/save] update error:", error);
      return NextResponse.json({ error: "Failed to save theme" }, { status: 500 });
    }
    return NextResponse.json({ theme: data, slot });
  }

  // Slot doesn't exist yet → insert
  const { data, error } = await supabase
    .from("user_themes")
    .insert({
      user_id: auth.userId,
      theme_name,
      config,
      is_active: set_active,
    })
    .select()
    .single();

  if (error) {
    console.error("[theme/save] insert error:", error);
    return NextResponse.json({ error: "Failed to save theme" }, { status: 500 });
  }

  return NextResponse.json({ theme: data, slot });
}
