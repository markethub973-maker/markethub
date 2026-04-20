import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/route-helpers";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/theme — Load the user's active theme configuration
 */
export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_themes")
    .select("*")
    .eq("user_id", auth.userId)
    .eq("is_active", true)
    .single();

  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: "Failed to load theme" }, { status: 500 });
  }

  return NextResponse.json({ theme: data ?? null });
}

/**
 * POST /api/theme — Save (upsert) user theme configuration
 * Body: { theme_name: string, config: Record<string, any> }
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  let body: { theme_name?: string; config?: Record<string, any> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { theme_name = "Custom Theme", config } = body;

  if (!config || typeof config !== "object") {
    return NextResponse.json({ error: "config is required and must be an object" }, { status: 400 });
  }

  const supabase = await createClient();

  // Deactivate any existing active themes for this user
  await supabase
    .from("user_themes")
    .update({ is_active: false })
    .eq("user_id", auth.userId)
    .eq("is_active", true);

  // Insert the new active theme
  const { data, error } = await supabase
    .from("user_themes")
    .insert({
      user_id: auth.userId,
      theme_name,
      config,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error("[theme/save]", error);
    return NextResponse.json({ error: "Failed to save theme" }, { status: 500 });
  }

  return NextResponse.json({ theme: data });
}
