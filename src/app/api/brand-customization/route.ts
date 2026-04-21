import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/route-helpers";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/brand-customization — Load user's brand customization row.
 */
export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("brand_customization")
    .select("*")
    .eq("user_id", auth.userId)
    .single();

  if (error && error.code !== "PGRST116") {
    // PGRST116 = no rows found, which is fine for new users
    console.error("[brand-customization/GET] error:", error);
    return NextResponse.json({ error: "Failed to load brand customization" }, { status: 500 });
  }

  return NextResponse.json({ brand: data || null });
}

/**
 * POST /api/brand-customization — Upsert brand customization.
 * Body: { logo_url, brand_name, primary_color, accent_color, custom_domain, email_sender, custom_footer }
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

  const {
    logo_url,
    brand_name,
    primary_color,
    accent_color,
    custom_domain,
    email_sender,
    custom_footer,
  } = body as {
    logo_url?: string;
    brand_name?: string;
    primary_color?: string;
    accent_color?: string;
    custom_domain?: string;
    email_sender?: string;
    custom_footer?: string;
  };

  const supabase = await createClient();

  // Check if row exists
  const { data: existing } = await supabase
    .from("brand_customization")
    .select("id")
    .eq("user_id", auth.userId)
    .single();

  const payload = {
    logo_url: logo_url ?? "",
    brand_name: brand_name ?? "",
    primary_color: primary_color ?? "#F59E0B",
    accent_color: accent_color ?? "#D97706",
    custom_domain: custom_domain ?? "",
    email_sender: email_sender ?? "",
    custom_footer: custom_footer ?? "",
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    // Update
    const { data, error } = await supabase
      .from("brand_customization")
      .update(payload)
      .eq("user_id", auth.userId)
      .select()
      .single();

    if (error) {
      console.error("[brand-customization/POST] update error:", error);
      return NextResponse.json({ error: "Failed to save brand customization" }, { status: 500 });
    }
    return NextResponse.json({ brand: data });
  }

  // Insert
  const { data, error } = await supabase
    .from("brand_customization")
    .insert({ user_id: auth.userId, ...payload })
    .select()
    .single();

  if (error) {
    console.error("[brand-customization/POST] insert error:", error);
    return NextResponse.json({ error: "Failed to save brand customization" }, { status: 500 });
  }

  return NextResponse.json({ brand: data });
}
