import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

// POST — create a live portal link for a client
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { client_name, ig_username, tt_username, data, expires_days } = body as {
    client_name: string;
    ig_username?: string;
    tt_username?: string;
    data?: Record<string, unknown>;
    expires_days?: number;
  };

  if (!client_name?.trim()) {
    return NextResponse.json({ error: "client_name is required" }, { status: 400 });
  }

  const expires_at = expires_days
    ? new Date(Date.now() + expires_days * 86400000).toISOString()
    : null;

  const svc = createServiceClient();
  const { data: link, error } = await svc
    .from("client_portal_links")
    .insert({
      user_id: user.id,
      client_name: client_name.trim(),
      ig_username: ig_username?.trim() || "",
      tt_username: tt_username?.trim() || "",
      data: data || {},
      expires_at,
    })
    .select("id, token, client_name, ig_username, tt_username, expires_at, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ link });
}

// GET — list all portal links for the authenticated user
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const svc = createServiceClient();
  const { data: links, error } = await svc
    .from("client_portal_links")
    .select("id, token, client_name, ig_username, tt_username, view_count, expires_at, created_at, updated_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ links: links || [] });
}

// DELETE — remove a portal link
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const svc = createServiceClient();
  const { error } = await svc
    .from("client_portal_links")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
