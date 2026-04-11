/**
 * Engagement — Instagram comment sync endpoint.
 *
 * POST /api/engagement/sync
 *
 * Pulls the latest 12 media from the authenticated user's Instagram
 * Business account, then fetches comments for each and upserts them into
 * social_messages. Dedup is handled by the
 * (user_id, platform='instagram', external_id=comment_id) unique index —
 * re-running the endpoint is safe + fast.
 *
 * Platform scope for this iteration: Instagram only (DMs require separate
 * webhook setup + different permissions). Facebook and YouTube will be
 * added in Wave 2.b.
 *
 * Auth: user session (requireAuth). The IG access token is resolved from
 * instagram_connections (preferred) or profiles.instagram_access_token
 * (legacy). Page access token is fetched via resolveIGToken when needed.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/route-helpers";
import { createServiceClient } from "@/lib/supabase/service";
import { resolveIGToken } from "@/lib/igToken";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

interface IgMedia {
  id: string;
  caption?: string;
  media_type?: string;
  thumbnail_url?: string;
  media_url?: string;
  permalink?: string;
  timestamp?: string;
  comments_count?: number;
}

interface IgComment {
  id: string;
  text: string;
  timestamp: string;
  username?: string;
  user?: { id: string; username: string };
  like_count?: number;
  replies?: { data?: IgComment[] };
}

interface IgMediaResponse {
  data?: IgMedia[];
  error?: { message: string };
}

interface IgCommentsResponse {
  data?: IgComment[];
  error?: { message: string };
}

async function fetchUserIgConfig(userId: string): Promise<
  | { ig_id: string; token: string; username: string | null }
  | null
> {
  const supa = createServiceClient();

  // Prefer instagram_connections (per-page token, multi-account)
  const { data: conns } = await supa
    .from("instagram_connections")
    .select("instagram_id, instagram_username, page_access_token")
    .eq("user_id", userId)
    .not("page_access_token", "is", null)
    .order("is_primary", { ascending: false })
    .limit(1);

  if (conns && conns.length > 0) {
    const c = conns[0] as { instagram_id: string; instagram_username: string | null; page_access_token: string };
    if (c.instagram_id && c.page_access_token) {
      return { ig_id: c.instagram_id, token: c.page_access_token, username: c.instagram_username };
    }
  }

  // Legacy fallback: token on profiles
  const { data: profile } = await supa
    .from("profiles")
    .select("instagram_user_id, instagram_username, instagram_access_token, enc_instagram_access_token")
    .eq("id", userId)
    .maybeSingle();

  if (!profile) return null;
  const p = profile as {
    instagram_user_id: string | null;
    instagram_username: string | null;
    instagram_access_token: string | null;
    enc_instagram_access_token: string | null;
  };
  if (!p.instagram_user_id) return null;

  let token = p.instagram_access_token;
  if (!token && p.enc_instagram_access_token?.startsWith("enc:v1:")) {
    try {
      const { decryptField } = await import("@/lib/fieldCrypto");
      const dec = decryptField(p.enc_instagram_access_token);
      if (dec) token = dec;
    } catch {
      /* ignore */
    }
  }
  if (!token) return null;

  return { ig_id: p.instagram_user_id, token, username: p.instagram_username };
}

export async function POST(_req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const config = await fetchUserIgConfig(auth.userId);
  if (!config) {
    return NextResponse.json(
      { error: "No Instagram Business account connected. Go to Settings → Instagram to connect." },
      { status: 400 },
    );
  }

  // Make sure the token actually works for the IG Business API (may need
  // Page Access Token upgrade).
  let token: string;
  try {
    token = await resolveIGToken(config.token, config.ig_id);
  } catch (e) {
    return NextResponse.json(
      { error: `Could not resolve Instagram token: ${e instanceof Error ? e.message : String(e)}` },
      { status: 400 },
    );
  }

  // 1. Fetch latest 12 media
  const mediaRes = await fetch(
    `https://graph.facebook.com/v22.0/${config.ig_id}/media?fields=id,caption,media_type,thumbnail_url,media_url,permalink,timestamp,comments_count&limit=12&access_token=${encodeURIComponent(token)}`,
    { signal: AbortSignal.timeout(15000) },
  );
  const mediaJson = (await mediaRes.json()) as IgMediaResponse;
  if (!mediaRes.ok || mediaJson.error) {
    return NextResponse.json(
      { error: `Instagram media fetch failed: ${mediaJson.error?.message ?? mediaRes.statusText}` },
      { status: 502 },
    );
  }

  const media = mediaJson.data ?? [];
  const supa = createServiceClient();

  let totalFetched = 0;
  let totalNew = 0;
  const errors: string[] = [];

  // 2. For each media, fetch comments + upsert
  for (const m of media) {
    if (!m.comments_count || m.comments_count === 0) continue;

    try {
      const commentsRes = await fetch(
        `https://graph.facebook.com/v22.0/${m.id}/comments?fields=id,text,timestamp,username,user,like_count,replies{id,text,timestamp,username,user,like_count}&limit=50&access_token=${encodeURIComponent(token)}`,
        { signal: AbortSignal.timeout(15000) },
      );
      const commentsJson = (await commentsRes.json()) as IgCommentsResponse;
      if (!commentsRes.ok || commentsJson.error) {
        errors.push(`${m.id}: ${commentsJson.error?.message ?? commentsRes.statusText}`);
        continue;
      }

      // Flatten comments + replies into one list
      const flat: { comment: IgComment; parent_id?: string }[] = [];
      for (const c of commentsJson.data ?? []) {
        flat.push({ comment: c });
        for (const reply of c.replies?.data ?? []) {
          flat.push({ comment: reply, parent_id: c.id });
        }
      }

      totalFetched += flat.length;

      // Upsert all at once
      const rows = flat.map(({ comment, parent_id }) => ({
        user_id: auth.userId,
        platform: "instagram" as const,
        kind: parent_id ? ("reply" as const) : ("comment" as const),
        external_id: comment.id,
        thread_id: m.id, // comments on the same media share a thread
        parent_external_id: parent_id ?? null,
        media_external_id: m.id,
        media_permalink: m.permalink ?? null,
        media_thumbnail_url: m.thumbnail_url ?? m.media_url ?? null,
        author_name: comment.user?.username ?? comment.username ?? "instagram_user",
        author_handle: comment.user?.username ?? comment.username ?? null,
        author_avatar_url: null,
        content: comment.text ?? "",
        media_urls: [],
        external_created_at: comment.timestamp ?? null,
      }));

      if (rows.length > 0) {
        const { error: upErr, count } = await supa
          .from("social_messages")
          .upsert(rows, {
            onConflict: "user_id,platform,external_id",
            ignoreDuplicates: true,
            count: "exact",
          });
        if (upErr) {
          errors.push(`upsert ${m.id}: ${upErr.message}`);
        } else {
          totalNew += count ?? 0;
        }
      }
    } catch (e) {
      errors.push(`${m.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return NextResponse.json({
    ok: errors.length === 0,
    media_scanned: media.length,
    comments_fetched: totalFetched,
    comments_new: totalNew,
    errors: errors.length > 0 ? errors : undefined,
    platform: "instagram",
    account: config.username,
  });
}
