/**
 * Visuals — auto-crop endpoint.
 *
 * POST /api/visuals/crop { source_url, format, source_type? }
 *
 * For source_type='image' (default if omitted):
 *   1. Check cache: (user_id, source_url, format). Hit → return existing output_url.
 *   2. Download the source from URL.
 *   3. Use sharp to smart-crop + resize to the preset's (width, height) with
 *      cover fit + centered gravity (sharp's default is "attention" but we
 *      use "centre" to keep faces/text predictable for designers).
 *   4. Upload result to Supabase Storage bucket "visual-crops" under
 *      <user_id>/<format>/<sha256-of-source>.jpg
 *   5. Insert/update visual_crops row with output_url.
 *
 * For source_type='video':
 *   Server-side ffmpeg isn't available in Vercel Functions. We insert a
 *   'pending' row with a clear error message pointing to the external
 *   service setup (documented in pending_manual_setups.md → [VIDEO-CROP]).
 *   When the user configures Cloudflare Stream / Bunny / Mux, we extend
 *   this endpoint to queue the job via that service.
 *
 * Auth: requireAuth (user session).
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/route-helpers";
import { createServiceClient } from "@/lib/supabase/service";
import { getPreset, type CropFormat } from "@/lib/cropPresets";
import sharp from "sharp";
import crypto from "crypto";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const BUCKET = "visual-crops";

async function ensureBucket(supa: ReturnType<typeof createServiceClient>): Promise<void> {
  const { error } = await supa.storage.createBucket(BUCKET, {
    public: true, // crops are served publicly from Supabase CDN
    fileSizeLimit: 20 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  });
  if (error && !String(error.message).toLowerCase().includes("already exists")) {
    throw new Error(`createBucket: ${error.message}`);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const body = (await req.json().catch(() => null)) as {
    source_url?: string;
    format?: CropFormat;
    source_type?: "image" | "video";
  } | null;

  if (!body?.source_url || !body.format) {
    return NextResponse.json({ error: "source_url and format required" }, { status: 400 });
  }

  const preset = getPreset(body.format);
  if (!preset) {
    return NextResponse.json({ error: `Unknown format: ${body.format}` }, { status: 400 });
  }

  const sourceType = body.source_type ?? "image";
  const supa = createServiceClient();

  // 1. Cache check
  const { data: existing } = await supa
    .from("visual_crops")
    .select("id, output_url, status, error")
    .eq("user_id", auth.userId)
    .eq("source_url", body.source_url)
    .eq("target_format", body.format)
    .maybeSingle();

  if (existing && (existing as { status: string }).status === "ready" && (existing as { output_url: string }).output_url) {
    return NextResponse.json({
      ok: true,
      cached: true,
      output_url: (existing as { output_url: string }).output_url,
      format: body.format,
      width: preset.width,
      height: preset.height,
    });
  }

  // 2. Video path — not supported in-house yet
  if (sourceType === "video") {
    const row = {
      user_id: auth.userId,
      source_url: body.source_url,
      source_type: "video" as const,
      target_format: body.format,
      target_width: preset.width,
      target_height: preset.height,
      processing_service: "none",
      status: "failed" as const,
      error:
        "Video cropping requires an external service (Cloudflare Stream / Bunny / Mux). See pending_manual_setups.md [VIDEO-CROP].",
    };
    await supa.from("visual_crops").upsert(row, {
      onConflict: "user_id,source_url,target_format",
    });
    return NextResponse.json(
      {
        error: row.error,
        note: "Image crops work out of the box via sharp. Video crops need external service — setup instructions in docs.",
      },
      { status: 501 },
    );
  }

  // 3. Image path — download source
  let sourceBuffer: Buffer;
  try {
    const res = await fetch(body.source_url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Source fetch failed: HTTP ${res.status}` },
        { status: 502 },
      );
    }
    const arr = await res.arrayBuffer();
    sourceBuffer = Buffer.from(arr);
  } catch (e) {
    return NextResponse.json(
      { error: `Source download failed: ${e instanceof Error ? e.message : String(e)}` },
      { status: 502 },
    );
  }

  // 4. Sharp crop
  let outputBuffer: Buffer;
  try {
    outputBuffer = await sharp(sourceBuffer)
      .rotate() // respect EXIF orientation
      .resize(preset.width, preset.height, {
        fit: "cover",
        position: "centre",
      })
      .jpeg({ quality: 88, mozjpeg: true })
      .toBuffer();
  } catch (e) {
    return NextResponse.json(
      { error: `sharp failed: ${e instanceof Error ? e.message : String(e)}` },
      { status: 500 },
    );
  }

  // 5. Upload to Supabase Storage
  try {
    await ensureBucket(supa);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }

  const sha = crypto.createHash("sha256").update(body.source_url).digest("hex").slice(0, 16);
  const path = `${auth.userId}/${body.format}/${sha}.jpg`;

  const { error: upErr } = await supa.storage
    .from(BUCKET)
    .upload(path, new Uint8Array(outputBuffer), {
      contentType: "image/jpeg",
      cacheControl: "31536000",
      upsert: true,
    });

  if (upErr) {
    return NextResponse.json({ error: `upload: ${upErr.message}` }, { status: 500 });
  }

  const { data: pub } = supa.storage.from(BUCKET).getPublicUrl(path);
  const outputUrl = pub.publicUrl;

  // 6. Upsert cache row
  const { error: cacheErr } = await supa.from("visual_crops").upsert(
    {
      user_id: auth.userId,
      source_url: body.source_url,
      source_type: "image",
      target_format: body.format,
      target_width: preset.width,
      target_height: preset.height,
      output_url: outputUrl,
      output_bytes: outputBuffer.length,
      processing_service: "sharp",
      status: "ready",
      error: null,
    },
    { onConflict: "user_id,source_url,target_format" },
  );

  if (cacheErr) {
    return NextResponse.json(
      { ok: true, output_url: outputUrl, warning: `cache write failed: ${cacheErr.message}` },
    );
  }

  return NextResponse.json({
    ok: true,
    cached: false,
    output_url: outputUrl,
    format: body.format,
    width: preset.width,
    height: preset.height,
    bytes: outputBuffer.length,
  });
}

export async function GET(req: NextRequest) {
  // List crops for the current user (for the Studio history view)
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const supa = createServiceClient();
  const { data, error } = await supa
    .from("visual_crops")
    .select("*")
    .eq("user_id", auth.userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ crops: data ?? [] });
}
