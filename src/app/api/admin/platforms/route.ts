import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isAdminAuthorized } from "@/lib/adminAuth";

// ── GET — fetch all saved admin platform tokens ────────────────────────────
export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("admin_platform_config")
    .select("platform, token, extra_data, updated_at")
    .order("platform");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, platforms: data || [] });
}

// ── POST — save / update a platform token ─────────────────────────────────
export async function POST(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { platform, token, extra_data } = body;

  if (!platform) {
    return NextResponse.json({ error: "platform required" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { error } = await supabase
    .from("admin_platform_config")
    .upsert(
      { platform, token: token || null, extra_data: extra_data || {}, updated_at: new Date().toISOString() },
      { onConflict: "platform" }
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// ── DELETE — clear a platform token ───────────────────────────────────────
export async function DELETE(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { platform } = await req.json();
  if (!platform) return NextResponse.json({ error: "platform required" }, { status: 400 });

  const supabase = createServiceClient();
  await supabase.from("admin_platform_config").delete().eq("platform", platform);

  return NextResponse.json({ success: true });
}
