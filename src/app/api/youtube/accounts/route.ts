import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

// GET — list all connected YouTube channels
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("youtube_connections" as any)
    .select("id, channel_id, channel_name, channel_handle, thumbnail_url, subscriber_count, account_label, is_primary, connected_at")
    .eq("user_id", user.id)
    .order("is_primary", { ascending: false })
    .order("connected_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ accounts: data ?? [] });
}

// POST — set_primary | disconnect | rename
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { channel_id, action, label } = await req.json();
  const svc = createServiceClient();

  if (action === "set_primary") {
    await svc.from("youtube_connections" as any).update({ is_primary: false }).eq("user_id", user.id);
    await svc.from("youtube_connections" as any).update({ is_primary: true }).eq("user_id", user.id).eq("channel_id", channel_id);
    return NextResponse.json({ ok: true });
  }

  if (action === "disconnect") {
    await svc.from("youtube_connections" as any).delete().eq("user_id", user.id).eq("channel_id", channel_id);
    // If deleted was primary, set next one as primary
    const { data: remaining } = await svc
      .from("youtube_connections" as any)
      .select("channel_id")
      .eq("user_id", user.id)
      .order("connected_at", { ascending: true })
      .limit(1);
    if (remaining?.[0]) {
      await svc.from("youtube_connections" as any).update({ is_primary: true }).eq("user_id", user.id).eq("channel_id", remaining[0].channel_id);
    }
    return NextResponse.json({ ok: true });
  }

  if (action === "rename" && label) {
    await svc.from("youtube_connections" as any).update({ account_label: label }).eq("user_id", user.id).eq("channel_id", channel_id);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
