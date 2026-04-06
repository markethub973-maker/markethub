import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

// GET — public endpoint, no auth required. Fetches portal data by token UUID.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!token || !/^[0-9a-f-]{36}$/i.test(token)) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  const svc = createServiceClient();
  const { data: link, error } = await svc
    .from("client_portal_links")
    .select("id, token, client_name, ig_username, tt_username, data, view_count, expires_at, updated_at")
    .eq("token", token)
    .single();

  if (error || !link) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 });
  }

  // Check expiry
  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    return NextResponse.json({ error: "Link expired" }, { status: 410 });
  }

  // Increment view count (non-fatal)
  svc
    .from("client_portal_links")
    .update({ view_count: (link.view_count || 0) + 1, updated_at: new Date().toISOString() })
    .eq("id", link.id)
    .then(() => {});

  return NextResponse.json({ link });
}
