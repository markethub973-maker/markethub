/**
 * YouTube — direct upload to user's channel.
 *
 * POST /api/youtube/upload  { video_url, title, description?, tags?, category_id?, privacy? }
 *
 * Uses the user's stored `profiles.youtube_access_token` (OAuth already
 * wired via the existing /api/auth/youtube callback). If the token is
 * expired, attempts a refresh via youtube_refresh_token. If that also
 * fails, returns a clear "re-connect YouTube in Settings" error.
 *
 * Flow:
 *   1. Create a youtube_uploads row with status='draft'
 *   2. Call YouTube Data API v3 videos.insert with resumable upload
 *      (multipart with snippet JSON + video binary)
 *   3. On success, set status='processing' and store youtube_video_id
 *      (YouTube processes the video asynchronously — we don't wait for
 *      "published" status, we'll poll it separately via a cron later)
 *   4. On failure, set status='failed' + upload_error
 *
 * Size limit: Vercel Function payload cap is 4.5MB body. For larger
 * videos, the client must upload to Supabase Storage first, then pass
 * the Supabase public URL as video_url so this route streams the bytes
 * from storage (bypasses Vercel's body size limit).
 *
 * Auth: requireAuth. Requires youtube_access_token on profile.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/route-helpers";
import { createServiceClient } from "@/lib/supabase/service";

export const maxDuration = 300;  // Uploads can take minutes for large videos
export const dynamic = "force-dynamic";

interface ProfileRow {
  id: string;
  youtube_access_token: string | null;
  youtube_refresh_token: string | null;
  youtube_channel_id: string | null;
  youtube_token_expires_at: string | null;
}

async function refreshYouTubeToken(refreshToken: string): Promise<{
  access_token: string;
  expires_in: number;
} | null> {
  const clientId = process.env.YOUTUBE_OAUTH_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_OAUTH_CLIENT_SECRET ?? process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) return null;
  return (await res.json()) as { access_token: string; expires_in: number };
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const body = (await req.json().catch(() => null)) as {
    video_url?: string;
    title?: string;
    description?: string;
    tags?: string[];
    category_id?: number;
    privacy?: "public" | "unlisted" | "private";
    scheduled_publish_at?: string;
  } | null;

  if (!body?.video_url || !body.title?.trim()) {
    return NextResponse.json({ error: "video_url and title required" }, { status: 400 });
  }

  const supa = createServiceClient();

  // Load profile + token
  const { data: profile } = await supa
    .from("profiles")
    .select("id, youtube_access_token, youtube_refresh_token, youtube_channel_id, youtube_token_expires_at")
    .eq("id", auth.userId)
    .maybeSingle();

  if (!profile || !(profile as ProfileRow).youtube_access_token) {
    return NextResponse.json(
      { error: "YouTube not connected. Go to Settings → Social Accounts → YouTube." },
      { status: 400 },
    );
  }

  const p = profile as ProfileRow;
  let accessToken = p.youtube_access_token!;

  // Refresh if expired
  if (p.youtube_token_expires_at) {
    const expiresAt = new Date(p.youtube_token_expires_at).getTime();
    if (expiresAt < Date.now() + 60_000) {
      if (!p.youtube_refresh_token) {
        return NextResponse.json(
          { error: "YouTube token expired and no refresh token stored. Re-connect in Settings." },
          { status: 401 },
        );
      }
      const refreshed = await refreshYouTubeToken(p.youtube_refresh_token);
      if (!refreshed) {
        return NextResponse.json(
          { error: "YouTube token refresh failed. Re-connect in Settings." },
          { status: 401 },
        );
      }
      accessToken = refreshed.access_token;
      const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
      await supa
        .from("profiles")
        .update({
          youtube_access_token: accessToken,
          youtube_token_expires_at: newExpiresAt,
        })
        .eq("id", auth.userId);
    }
  }

  // 1. Insert draft row
  const { data: uploadRow, error: insErr } = await supa
    .from("youtube_uploads")
    .insert({
      user_id: auth.userId,
      title: body.title.trim().slice(0, 100),
      description: body.description?.trim() ?? null,
      tags: body.tags ?? [],
      category_id: body.category_id ?? 22, // default: People & Blogs
      privacy: body.privacy ?? "private",
      video_source_url: body.video_url,
      scheduled_publish_at: body.scheduled_publish_at ?? null,
      upload_status: "uploading",
    })
    .select()
    .single();

  if (insErr || !uploadRow) {
    return NextResponse.json({ error: insErr?.message ?? "failed to create upload row" }, { status: 500 });
  }

  const uploadId = (uploadRow as { id: string }).id;

  // 2. Download source video
  let videoBuffer: ArrayBuffer;
  try {
    const res = await fetch(body.video_url, { signal: AbortSignal.timeout(120_000) });
    if (!res.ok) {
      throw new Error(`source HTTP ${res.status}`);
    }
    videoBuffer = await res.arrayBuffer();
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    await supa
      .from("youtube_uploads")
      .update({ upload_status: "failed", upload_error: `source fetch: ${err}` })
      .eq("id", uploadId);
    return NextResponse.json({ error: `Source fetch failed: ${err}` }, { status: 502 });
  }

  // 3. YouTube videos.insert — use multipart/related with snippet + media
  const metadata = {
    snippet: {
      title: body.title.trim().slice(0, 100),
      description: body.description?.trim() ?? "",
      tags: body.tags ?? [],
      categoryId: String(body.category_id ?? 22),
    },
    status: {
      privacyStatus: body.privacy ?? "private",
      selfDeclaredMadeForKids: false,
      publishAt: body.scheduled_publish_at ?? undefined,
    },
  };

  // Build multipart body manually
  const boundary = `mh-${crypto.randomUUID()}`;
  const encoder = new TextEncoder();
  const metaPart = encoder.encode(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`,
  );
  const videoHeader = encoder.encode(
    `--${boundary}\r\nContent-Type: video/*\r\n\r\n`,
  );
  const closingBoundary = encoder.encode(`\r\n--${boundary}--\r\n`);

  const multipartBody = new Uint8Array(
    metaPart.length + videoHeader.length + videoBuffer.byteLength + closingBoundary.length,
  );
  let offset = 0;
  multipartBody.set(metaPart, offset);
  offset += metaPart.length;
  multipartBody.set(videoHeader, offset);
  offset += videoHeader.length;
  multipartBody.set(new Uint8Array(videoBuffer), offset);
  offset += videoBuffer.byteLength;
  multipartBody.set(closingBoundary, offset);

  // POST to YouTube upload endpoint
  const ytRes = await fetch(
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    },
  );

  const ytJson = (await ytRes.json()) as {
    id?: string;
    status?: { uploadStatus?: string };
    error?: { message: string; code: number };
  };

  if (!ytRes.ok || ytJson.error) {
    const err = ytJson.error?.message ?? `HTTP ${ytRes.status}`;
    await supa
      .from("youtube_uploads")
      .update({ upload_status: "failed", upload_error: err })
      .eq("id", uploadId);
    return NextResponse.json(
      { error: `YouTube upload failed: ${err}`, upload_id: uploadId },
      { status: 502 },
    );
  }

  // 4. Success — update row
  await supa
    .from("youtube_uploads")
    .update({
      youtube_video_id: ytJson.id,
      upload_status: "processing",
      upload_error: null,
    })
    .eq("id", uploadId);

  return NextResponse.json({
    ok: true,
    upload_id: uploadId,
    youtube_video_id: ytJson.id,
    video_url: `https://www.youtube.com/watch?v=${ytJson.id}`,
  });
}

export async function GET(_req: NextRequest) {
  // List recent uploads for the user
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const supa = createServiceClient();
  const { data, error } = await supa
    .from("youtube_uploads")
    .select("*")
    .eq("user_id", auth.userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ uploads: data ?? [] });
}
