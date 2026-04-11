/**
 * Engagement — YouTube comments sync into social_messages.
 *
 * POST /api/engagement/sync/youtube
 *
 * Walks the user's YouTube channel (linked via youtube_channel_id +
 * youtube_access_token on profiles), pulls the latest 10 uploaded videos,
 * fetches commentThreads + replies for each, and upserts into the
 * social_messages table with platform='youtube'.
 *
 * Auth strategy:
 *   - Uses YOUTUBE_API_KEY (server key) for read-only commentThreads,
 *     which doesn't require OAuth — works without per-user youtube_access_token.
 *   - Falls back to per-user OAuth if YOUTUBE_API_KEY isn't set.
 *
 * Auth: requireAuth (Supabase user session).
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/route-helpers";
import { createServiceClient } from "@/lib/supabase/service";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const YT_BASE = "https://www.googleapis.com/youtube/v3";

interface YtVideo {
  id: { videoId: string };
  snippet: {
    title: string;
    publishedAt: string;
    thumbnails?: { default?: { url: string }; high?: { url: string } };
  };
}

interface YtCommentThread {
  id: string;
  snippet: {
    topLevelComment: {
      id: string;
      snippet: {
        videoId: string;
        textDisplay: string;
        authorDisplayName: string;
        authorChannelId?: { value: string };
        authorProfileImageUrl?: string;
        publishedAt: string;
        likeCount: number;
      };
    };
    totalReplyCount?: number;
  };
  replies?: {
    comments: Array<{
      id: string;
      snippet: {
        videoId: string;
        textDisplay: string;
        authorDisplayName: string;
        authorChannelId?: { value: string };
        publishedAt: string;
        parentId: string;
      };
    }>;
  };
}

async function fetchYouTubeChannelId(userId: string): Promise<string | null> {
  const supa = createServiceClient();
  const { data } = await supa
    .from("profiles")
    .select("youtube_channel_id")
    .eq("id", userId)
    .maybeSingle();
  return (data as { youtube_channel_id: string | null } | null)?.youtube_channel_id ?? null;
}

export async function POST(_req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "YOUTUBE_API_KEY not configured" },
      { status: 500 },
    );
  }

  const channelId = await fetchYouTubeChannelId(auth.userId);
  if (!channelId) {
    return NextResponse.json(
      { error: "No YouTube channel connected. Connect via Settings → YouTube." },
      { status: 400 },
    );
  }

  // 1. Fetch latest 10 video IDs from the channel
  const videosRes = await fetch(
    `${YT_BASE}/search?part=snippet&channelId=${channelId}&type=video&order=date&maxResults=10&key=${apiKey}`,
    { signal: AbortSignal.timeout(15_000) },
  );
  const videosJson = (await videosRes.json()) as { items?: YtVideo[]; error?: { message: string } };
  if (!videosRes.ok || videosJson.error) {
    return NextResponse.json(
      { error: `YouTube videos fetch failed: ${videosJson.error?.message ?? videosRes.statusText}` },
      { status: 502 },
    );
  }

  const videos = videosJson.items ?? [];
  const supa = createServiceClient();
  let totalScanned = 0;
  let totalNew = 0;
  const errors: string[] = [];

  for (const v of videos) {
    const videoId = v.id.videoId;
    if (!videoId) continue;

    try {
      const threadsRes = await fetch(
        `${YT_BASE}/commentThreads?part=snippet,replies&videoId=${videoId}&maxResults=50&order=time&key=${apiKey}`,
        { signal: AbortSignal.timeout(15_000) },
      );
      const threadsJson = (await threadsRes.json()) as {
        items?: YtCommentThread[];
        error?: { message: string };
      };
      if (!threadsRes.ok || threadsJson.error) {
        // Comments disabled or other API error — non-fatal, continue
        const errMsg = threadsJson.error?.message ?? threadsRes.statusText;
        if (!errMsg.includes("commentsDisabled")) {
          errors.push(`${videoId}: ${errMsg}`);
        }
        continue;
      }

      const threads = threadsJson.items ?? [];
      const flat: Array<{ comment_id: string; text: string; author: string; author_id: string | null; published: string; parent_id?: string }> = [];

      for (const t of threads) {
        const top = t.snippet.topLevelComment;
        flat.push({
          comment_id: top.id,
          text: top.snippet.textDisplay,
          author: top.snippet.authorDisplayName,
          author_id: top.snippet.authorChannelId?.value ?? null,
          published: top.snippet.publishedAt,
        });
        for (const reply of t.replies?.comments ?? []) {
          flat.push({
            comment_id: reply.id,
            text: reply.snippet.textDisplay,
            author: reply.snippet.authorDisplayName,
            author_id: reply.snippet.authorChannelId?.value ?? null,
            published: reply.snippet.publishedAt,
            parent_id: top.id,
          });
        }
      }

      totalScanned += flat.length;

      const rows = flat.map((c) => ({
        user_id: auth.userId,
        platform: "youtube" as const,
        kind: c.parent_id ? ("reply" as const) : ("comment" as const),
        external_id: c.comment_id,
        thread_id: videoId,
        parent_external_id: c.parent_id ?? null,
        media_external_id: videoId,
        media_permalink: `https://www.youtube.com/watch?v=${videoId}`,
        media_thumbnail_url: v.snippet.thumbnails?.high?.url ?? v.snippet.thumbnails?.default?.url ?? null,
        author_name: c.author,
        author_handle: c.author_id,
        content: c.text,
        media_urls: [],
        external_created_at: c.published,
      }));

      if (rows.length > 0) {
        const { count, error: upErr } = await supa
          .from("social_messages")
          .upsert(rows, {
            onConflict: "user_id,platform,external_id",
            ignoreDuplicates: true,
            count: "exact",
          });
        if (upErr) errors.push(`upsert ${videoId}: ${upErr.message}`);
        else totalNew += count ?? 0;
      }
    } catch (e) {
      errors.push(`${videoId}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return NextResponse.json({
    ok: errors.length === 0,
    platform: "youtube",
    channel_id: channelId,
    videos_scanned: videos.length,
    comments_scanned: totalScanned,
    comments_new: totalNew,
    errors: errors.length > 0 ? errors : undefined,
  });
}
