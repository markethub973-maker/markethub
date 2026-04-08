import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

const FULL_FIELDS =
  "id, token, client_name, ig_username, tt_username, data, view_count, expires_at, updated_at, agency_name, agency_logo_url, accent_color";
const LEGACY_FIELDS =
  "id, token, client_name, ig_username, tt_username, data, view_count, expires_at, updated_at";

function isSchemaCacheError(err: { message?: string } | null): boolean {
  if (!err) return false;
  const msg = err.message ?? "";
  return (
    msg.includes("does not exist") ||
    msg.includes("schema cache") ||
    msg.includes("Could not find the") ||
    msg.includes("column")
  );
}

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
  const first = await svc
    .from("client_portal_links")
    .select(FULL_FIELDS)
    .eq("token", token)
    .single();
  let link: any = first.data;
  let error = first.error;

  if (error && isSchemaCacheError(error)) {
    const retry = await svc
      .from("client_portal_links")
      .select(LEGACY_FIELDS)
      .eq("token", token)
      .single();
    link = retry.data;
    error = retry.error;
  }

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
