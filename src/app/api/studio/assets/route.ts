/**
 * GET /api/studio/assets — unified gallery of every AI asset the user
 * has generated (image + video + audio). Ordered newest first, paginated.
 *
 * Query params:
 *   ?type=image|video|audio (filter)
 *   ?q=...                  (search prompts)
 *   ?limit=24               (1-100)
 *   ?offset=0
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface Asset {
  id: string;
  type: "image" | "video" | "audio";
  url: string | null;
  prompt: string;
  aspect_ratio: string | null;
  duration_sec: number | null;
  status: string;
  cost_usd: number | null;
  source_context: string | null;
  created_at: string;
}

export async function GET(req: NextRequest) {
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const p = req.nextUrl.searchParams;
  const type = p.get("type"); // image | video | audio | null
  const q = p.get("q")?.trim().toLowerCase() ?? "";
  const limit = Math.min(Math.max(parseInt(p.get("limit") ?? "24"), 1), 100);
  const offset = Math.max(parseInt(p.get("offset") ?? "0"), 0);

  // Pull from up to 3 tables in parallel; merge + sort client-side.
  // Each query is bounded — for large libraries we'd add proper UNION
  // ALL via an RPC, but at MVP scale this is plenty fast.
  const fetchImg = type && type !== "image"
    ? Promise.resolve({ data: [] })
    : supa.from("ai_image_generations")
        .select("id,prompt,aspect_ratio,image_url,status,cost_usd,source_context,created_at")
        .eq("user_id", user.id)
        .eq("status", "succeeded")
        .order("created_at", { ascending: false })
        .limit(200);
  const fetchVid = type && type !== "video"
    ? Promise.resolve({ data: [] })
    : supa.from("ai_video_generations")
        .select("id,prompt,aspect_ratio,video_url,duration_sec,status,cost_usd,source_context,created_at")
        .eq("user_id", user.id)
        .eq("status", "succeeded")
        .order("created_at", { ascending: false })
        .limit(200);
  const fetchAud = type && type !== "audio"
    ? Promise.resolve({ data: [] })
    : supa.from("ai_audio_generations")
        .select("id,prompt,duration_sec,audio_url,status,cost_usd,source_context,created_at")
        .eq("user_id", user.id)
        .eq("status", "succeeded")
        .order("created_at", { ascending: false })
        .limit(200);

  const [imgs, vids, auds] = await Promise.all([fetchImg, fetchVid, fetchAud]);

  const imgRows: Asset[] = (imgs.data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    type: "image",
    url: (r.image_url as string | null) ?? null,
    prompt: (r.prompt as string) ?? "",
    aspect_ratio: (r.aspect_ratio as string | null) ?? null,
    duration_sec: null,
    status: r.status as string,
    cost_usd: r.cost_usd as number | null,
    source_context: (r.source_context as string | null) ?? null,
    created_at: r.created_at as string,
  }));
  const vidRows: Asset[] = (vids.data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    type: "video",
    url: (r.video_url as string | null) ?? null,
    prompt: (r.prompt as string) ?? "",
    aspect_ratio: (r.aspect_ratio as string | null) ?? null,
    duration_sec: r.duration_sec as number | null,
    status: r.status as string,
    cost_usd: r.cost_usd as number | null,
    source_context: (r.source_context as string | null) ?? null,
    created_at: r.created_at as string,
  }));
  const audRows: Asset[] = (auds.data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    type: "audio",
    url: (r.audio_url as string | null) ?? null,
    prompt: (r.prompt as string) ?? "",
    aspect_ratio: null,
    duration_sec: r.duration_sec as number | null,
    status: r.status as string,
    cost_usd: r.cost_usd as number | null,
    source_context: (r.source_context as string | null) ?? null,
    created_at: r.created_at as string,
  }));

  // Merge + sort + paginate
  let all = [...imgRows, ...vidRows, ...audRows].sort(
    (a, b) => (b.created_at > a.created_at ? 1 : b.created_at < a.created_at ? -1 : 0),
  );

  if (q) {
    all = all.filter((a) => a.prompt.toLowerCase().includes(q));
  }

  const total = all.length;
  const page = all.slice(offset, offset + limit);

  return NextResponse.json({
    ok: true,
    assets: page,
    total,
    limit,
    offset,
    has_more: offset + limit < total,
  });
}
