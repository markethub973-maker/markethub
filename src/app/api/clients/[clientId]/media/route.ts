/**
 * GET /api/clients/[clientId]/media — List client's media library
 *
 * Returns all images for a specific client, separated and isolated.
 * No cross-contamination between clients.
 *
 * Query params:
 *   ?source=instagram_import|upload|ai_generated (optional filter)
 *   ?limit=50 (default)
 *   ?offset=0
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const svc = createServiceClient();
  const source = req.nextUrl.searchParams.get("source");
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "50"), 200);
  const offset = parseInt(req.nextUrl.searchParams.get("offset") || "0");

  // Verify client belongs to user
  const { data: client } = await svc
    .from("client_accounts")
    .select("id, client_name")
    .eq("id", clientId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  // Query media — STRICTLY filtered by client_id
  let query = svc
    .from("client_media_library")
    .select("id, source, image_url, stored_url, thumbnail_url, caption, tags, metadata, used_count, created_at")
    .eq("client_id", clientId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (source) {
    query = query.eq("source", source);
  }

  const { data, error, count } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Count total
  const { count: total } = await svc
    .from("client_media_library")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId)
    .eq("user_id", user.id);

  return NextResponse.json({
    ok: true,
    client_id: clientId,
    client_name: client.client_name,
    media: data || [],
    total: total || 0,
    limit,
    offset,
  });
}
