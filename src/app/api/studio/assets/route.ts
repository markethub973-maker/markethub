/**
 * GET /api/studio/assets — unified asset gallery from the "assets" table.
 *
 * Query params:
 *   ?type=image|video|audio  (maps to mime_type LIKE 'image/%' etc.)
 *   ?q=...                   (searches name, notes, tags)
 *   ?limit=60                (1-100, default 60)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/route-helpers";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const p = req.nextUrl.searchParams;
  const type = p.get("type"); // image | video | audio | null
  const q = p.get("q")?.trim().toLowerCase() ?? "";
  const limit = Math.min(Math.max(parseInt(p.get("limit") ?? "60"), 1), 100);

  const supa = createServiceClient();

  let query = supa
    .from("assets")
    .select("id, name, category, file_url, external_url, mime_type, notes, tags, created_at")
    .eq("user_id", auth.userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  // Filter by mime_type based on type param
  if (type === "image") {
    query = query.like("mime_type", "image/%");
  } else if (type === "video") {
    query = query.like("mime_type", "video/%");
  } else if (type === "audio") {
    query = query.like("mime_type", "audio/%");
  }

  // Search filter — uses ilike on name and notes, or overlap on tags
  if (q) {
    query = query.or(`name.ilike.%${q}%,notes.ilike.%${q}%,tags.cs.{${q}}`);
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const assets = (data ?? []).map((row) => ({
    id: row.id,
    type: row.category ?? (row.mime_type?.split("/")[0] || "image"),
    url: row.file_url || row.external_url || null,
    prompt: row.notes || row.name || "",
    aspect_ratio: null,
    created_at: row.created_at,
  }));

  return NextResponse.json({ assets });
}
