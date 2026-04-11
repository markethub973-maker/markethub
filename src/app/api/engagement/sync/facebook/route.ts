/**
 * Engagement — Facebook Page comments sync.
 *
 * POST /api/engagement/sync/facebook
 *
 * Walks the user's Facebook Page (linked via fb_page_id +
 * fb_page_access_token on profiles), pulls the most recent posts and
 * their top-level comments + replies, and upserts them into the
 * social_messages table with platform='facebook'.
 *
 * Auth: requireAuth.
 *
 * Reuses the same dedup mechanism as Instagram sync —
 * UNIQUE (user_id, platform, external_id) — so re-running is safe.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/route-helpers";
import { createServiceClient } from "@/lib/supabase/service";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

interface FbPost {
  id: string;
  message?: string;
  permalink_url?: string;
  full_picture?: string;
  created_time?: string;
}

interface FbComment {
  id: string;
  message?: string;
  created_time?: string;
  from?: { id: string; name: string };
  parent?: { id: string };
  comments?: { data?: FbComment[] };
}

async function fetchFbPageConfig(userId: string): Promise<
  | { page_id: string; token: string; page_name: string | null }
  | null
> {
  const supa = createServiceClient();
  const { data: profile } = await supa
    .from("profiles")
    .select("fb_page_id, fb_page_name, fb_page_access_token")
    .eq("id", userId)
    .maybeSingle();

  if (!profile) return null;
  const p = profile as {
    fb_page_id: string | null;
    fb_page_name: string | null;
    fb_page_access_token: string | null;
  };
  if (!p.fb_page_id || !p.fb_page_access_token) return null;
  return { page_id: p.fb_page_id, token: p.fb_page_access_token, page_name: p.fb_page_name };
}

export async function POST(_req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const config = await fetchFbPageConfig(auth.userId);
  if (!config) {
    return NextResponse.json(
      { error: "No Facebook Page connected. Connect via Settings → Facebook Page." },
      { status: 400 },
    );
  }

  // 1. Fetch latest 10 posts on the page
  const postsRes = await fetch(
    `https://graph.facebook.com/v22.0/${config.page_id}/posts?fields=id,message,permalink_url,full_picture,created_time&limit=10&access_token=${encodeURIComponent(config.token)}`,
    { signal: AbortSignal.timeout(15_000) },
  );
  const postsJson = (await postsRes.json()) as { data?: FbPost[]; error?: { message: string } };
  if (!postsRes.ok || postsJson.error) {
    return NextResponse.json(
      { error: `FB posts fetch failed: ${postsJson.error?.message ?? postsRes.statusText}` },
      { status: 502 },
    );
  }

  const posts = postsJson.data ?? [];
  const supa = createServiceClient();
  let totalScanned = 0;
  let totalNew = 0;
  const errors: string[] = [];

  for (const post of posts) {
    try {
      // Fetch comments + nested replies
      const commentsRes = await fetch(
        `https://graph.facebook.com/v22.0/${post.id}/comments?fields=id,message,created_time,from,comments{id,message,created_time,from}&limit=50&access_token=${encodeURIComponent(config.token)}`,
        { signal: AbortSignal.timeout(15_000) },
      );
      const commentsJson = (await commentsRes.json()) as { data?: FbComment[]; error?: { message: string } };
      if (!commentsRes.ok || commentsJson.error) {
        errors.push(`${post.id}: ${commentsJson.error?.message ?? commentsRes.statusText}`);
        continue;
      }

      const flat: { c: FbComment; parent_id?: string }[] = [];
      for (const c of commentsJson.data ?? []) {
        flat.push({ c });
        for (const reply of c.comments?.data ?? []) {
          flat.push({ c: reply, parent_id: c.id });
        }
      }
      totalScanned += flat.length;

      const rows = flat
        .map(({ c, parent_id }) => {
          if (!c.message?.trim()) return null; // skip stickers / empty
          return {
            user_id: auth.userId,
            platform: "facebook" as const,
            kind: parent_id ? ("reply" as const) : ("comment" as const),
            external_id: c.id,
            thread_id: post.id,
            parent_external_id: parent_id ?? null,
            media_external_id: post.id,
            media_permalink: post.permalink_url ?? null,
            media_thumbnail_url: post.full_picture ?? null,
            author_name: c.from?.name ?? "facebook_user",
            author_handle: c.from?.id ?? null,
            content: c.message,
            media_urls: [],
            external_created_at: c.created_time ?? null,
          };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null);

      if (rows.length > 0) {
        const { count, error: upErr } = await supa
          .from("social_messages")
          .upsert(rows, {
            onConflict: "user_id,platform,external_id",
            ignoreDuplicates: true,
            count: "exact",
          });
        if (upErr) errors.push(`upsert ${post.id}: ${upErr.message}`);
        else totalNew += count ?? 0;
      }
    } catch (e) {
      errors.push(`${post.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return NextResponse.json({
    ok: errors.length === 0,
    platform: "facebook",
    page: config.page_name,
    posts_scanned: posts.length,
    comments_scanned: totalScanned,
    comments_new: totalNew,
    errors: errors.length > 0 ? errors : undefined,
  });
}
