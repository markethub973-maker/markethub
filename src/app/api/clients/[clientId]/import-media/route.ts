/**
 * POST /api/clients/[clientId]/import-media — Import images from client's Instagram
 *
 * Fetches all media from the client's Instagram account via Graph API,
 * stores each image in Supabase storage under client-specific folder,
 * and creates entries in client_media_library.
 *
 * Each image is tagged with the client_id — no cross-contamination possible.
 *
 * Query params:
 *   ?source=instagram (default) | facebook | website
 *   ?limit=50 (max images to import)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
export const maxDuration = 55;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const svc = createServiceClient();
  const source = req.nextUrl.searchParams.get("source") || "instagram_import";
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "50"), 100);

  // Verify client belongs to this user
  const { data: client } = await svc
    .from("client_accounts")
    .select("id, client_name, instagram_user_id, instagram_access_token")
    .eq("id", clientId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  if (source === "instagram_import") {
    return importFromInstagram(svc, user.id, clientId, client, limit);
  }

  return NextResponse.json({ error: "Source not supported yet. Use ?source=instagram_import" }, { status: 400 });
}

async function importFromInstagram(
  svc: ReturnType<typeof createServiceClient>,
  userId: string,
  clientId: string,
  client: { id: string; client_name: string; instagram_user_id: string | null; instagram_access_token: string | null },
  limit: number
) {
  const igId = client.instagram_user_id;
  const token = client.instagram_access_token;

  if (!igId || !token) {
    return NextResponse.json({
      error: "Client has no Instagram connected. Connect Instagram first.",
    }, { status: 400 });
  }

  // Fetch media from Instagram Graph API
  let allMedia: Array<{
    id: string;
    media_url?: string;
    thumbnail_url?: string;
    caption?: string;
    media_type?: string;
    timestamp?: string;
    like_count?: number;
    permalink?: string;
  }> = [];

  let url = `https://graph.facebook.com/v22.0/${igId}/media?fields=id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,permalink&limit=${Math.min(limit, 50)}&access_token=${token}`;

  while (url && allMedia.length < limit) {
    const res = await fetch(url);
    if (!res.ok) break;
    const data = await res.json();
    allMedia.push(...(data.data || []));
    url = data.paging?.next || "";
  }

  allMedia = allMedia.slice(0, limit);

  // Check which media we already imported (prevent duplicates)
  const { data: existing } = await svc
    .from("client_media_library")
    .select("metadata")
    .eq("client_id", clientId)
    .eq("source", "instagram_import");

  const existingIds = new Set(
    (existing || []).map((e) => (e.metadata as Record<string, unknown>)?.ig_media_id as string).filter(Boolean)
  );

  let imported = 0;
  let skipped = 0;
  const results: Array<{ ig_id: string; status: string; stored_url?: string }> = [];

  for (const media of allMedia) {
    // Skip already imported
    if (existingIds.has(media.id)) {
      skipped++;
      results.push({ ig_id: media.id, status: "already_imported" });
      continue;
    }

    // Skip videos for now (only images and carousels)
    const mediaUrl = media.media_url || media.thumbnail_url;
    if (!mediaUrl) {
      skipped++;
      results.push({ ig_id: media.id, status: "no_url" });
      continue;
    }

    // Download image and store in Supabase under client-specific folder
    try {
      const imgRes = await fetch(mediaUrl);
      if (!imgRes.ok) {
        results.push({ ig_id: media.id, status: "download_failed" });
        continue;
      }
      const imgBuf = await imgRes.arrayBuffer();
      const ext = media.media_type === "VIDEO" ? "jpg" : "jpg"; // thumbnail for video
      const storagePath = `client-media/${clientId}/${media.id}.${ext}`;

      const { error: upErr } = await svc.storage
        .from("public-assets")
        .upload(storagePath, new Uint8Array(imgBuf), {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (upErr) {
        results.push({ ig_id: media.id, status: `upload_error: ${upErr.message}` });
        continue;
      }

      const { data: urlData } = svc.storage.from("public-assets").getPublicUrl(storagePath);

      // Insert into client_media_library
      await svc.from("client_media_library").insert({
        user_id: userId,
        client_id: clientId,
        source: "instagram_import",
        image_url: mediaUrl,
        stored_url: urlData.publicUrl,
        thumbnail_url: media.thumbnail_url || null,
        caption: media.caption?.slice(0, 2000) || null,
        tags: extractTags(media.caption || ""),
        metadata: {
          ig_media_id: media.id,
          media_type: media.media_type,
          like_count: media.like_count || 0,
          timestamp: media.timestamp,
          permalink: media.permalink,
        },
      });

      imported++;
      results.push({ ig_id: media.id, status: "imported", stored_url: urlData.publicUrl });
    } catch (err) {
      results.push({ ig_id: media.id, status: `error: ${String(err).slice(0, 100)}` });
    }
  }

  return NextResponse.json({
    ok: true,
    client_id: clientId,
    client_name: client.client_name,
    total_found: allMedia.length,
    imported,
    skipped,
    results: results.slice(0, 20), // limit response size
  });
}

function extractTags(caption: string): string[] {
  const hashtags = caption.match(/#\w+/g) || [];
  return hashtags.map((h) => h.replace("#", "").toLowerCase()).slice(0, 20);
}
