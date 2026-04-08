import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

// GET — list connected TikTok accounts
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("tiktok_connections" as any)
    .select("id, tiktok_open_id, display_name, username, avatar_url, follower_count, following_count, likes_count, video_count, is_primary, connected_at")
    .eq("user_id", user.id)
    .order("is_primary", { ascending: false })
    .order("connected_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ accounts: data ?? [] });
}

// POST — set_primary | disconnect
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tiktok_open_id, action } = await req.json();
  const svc = createServiceClient();

  if (action === "set_primary") {
    await svc.from("tiktok_connections" as any).update({ is_primary: false }).eq("user_id", user.id);
    await svc.from("tiktok_connections" as any).update({ is_primary: true }).eq("user_id", user.id).eq("tiktok_open_id", tiktok_open_id);
    return NextResponse.json({ ok: true });
  }

  if (action === "disconnect") {
    await svc.from("tiktok_connections" as any).delete().eq("user_id", user.id).eq("tiktok_open_id", tiktok_open_id);
    // Promote next as primary if needed
    const { data: remaining } = await svc
      .from("tiktok_connections" as any)
      .select("tiktok_open_id")
      .eq("user_id", user.id)
      .order("connected_at", { ascending: true })
      .limit(1);
    if (remaining?.[0]) {
      await svc.from("tiktok_connections" as any).update({ is_primary: true }).eq("user_id", user.id).eq("tiktok_open_id", (remaining[0] as any).tiktok_open_id);
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
