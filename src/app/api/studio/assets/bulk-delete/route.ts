/**
 * POST /api/studio/assets/bulk-delete — delete multiple AI generations
 * at once. Caller passes { ids: [...] } with composite "type:id" strings
 * so we know which table to hit.
 *
 * Format per id: "image:uuid" | "video:uuid" | "audio:uuid"
 *
 * Ownership check: deletes only rows belonging to the authenticated user
 * (RLS handles this since we use the user's session client, not service).
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const TABLE_BY_TYPE: Record<string, string> = {
  image: "ai_image_generations",
  video: "ai_video_generations",
  audio: "ai_audio_generations",
};

export async function POST(req: NextRequest) {
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { ids?: string[] } | null;
  const ids = (body?.ids ?? []).filter((s) => typeof s === "string" && s.includes(":"));
  if (ids.length === 0) {
    return NextResponse.json({ error: "ids required (format: 'type:uuid')" }, { status: 400 });
  }
  if (ids.length > 200) {
    return NextResponse.json({ error: "Cannot delete more than 200 in one request" }, { status: 400 });
  }

  // Group by table
  const byTable: Record<string, string[]> = {};
  for (const composite of ids) {
    const [type, id] = composite.split(":", 2);
    const table = TABLE_BY_TYPE[type];
    if (!table) continue;
    (byTable[table] = byTable[table] ?? []).push(id);
  }

  let deleted = 0;
  for (const [table, idList] of Object.entries(byTable)) {
    // RLS scopes to current user; service role NOT used here on purpose
    const { error, count } = await supa
      .from(table)
      .delete({ count: "exact" })
      .in("id", idList)
      .eq("user_id", user.id);
    if (!error && typeof count === "number") deleted += count;
  }

  return NextResponse.json({ ok: true, deleted });
}
