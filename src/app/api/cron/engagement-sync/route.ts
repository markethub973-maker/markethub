/**
 * Cron — engagement sync (runs hourly).
 *
 * Walks every user with an active Instagram connection and pulls their
 * latest comments via the same logic as /api/engagement/sync. Rate-limited
 * to 1 user per 1.5s (well under Instagram Graph API limits) with a hard
 * cap on total runtime.
 *
 * Logs to cron_logs so the Cockpit watchdog counts it as a heartbeat.
 * Failures (per user) are accumulated but non-fatal — one broken user
 * token doesn't stop the cron from serving the rest.
 *
 * Auth: Bearer CRON_SECRET. Invoked by GitHub Actions workflow
 * .github/workflows/cron-engagement-sync.yml (or via the cockpit
 * assistant's run_agent tool for on-demand runs).
 */
import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cronAuth";
import { createServiceClient } from "@/lib/supabase/service";
import { resolveIGToken } from "@/lib/igToken";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

interface IgMedia {
  id: string;
  permalink?: string;
  media_url?: string;
  thumbnail_url?: string;
  comments_count?: number;
}

interface IgComment {
  id: string;
  text: string;
  timestamp: string;
  username?: string;
  user?: { id: string; username: string };
  replies?: { data?: IgComment[] };
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function syncOneUser(userId: string, igId: string, rawToken: string): Promise<{ ok: boolean; new: number; error?: string }> {
  let token: string;
  try {
    token = await resolveIGToken(rawToken, igId);
  } catch (e) {
    return { ok: false, new: 0, error: `token resolve: ${e instanceof Error ? e.message : String(e)}` };
  }

  // 1. Fetch latest 6 media (smaller than the manual sync's 12 — cron runs
  // hourly so we don't need deep history every time)
  const mediaRes = await fetch(
    `https://graph.facebook.com/v22.0/${igId}/media?fields=id,permalink,media_url,thumbnail_url,comments_count&limit=6&access_token=${encodeURIComponent(token)}`,
    { signal: AbortSignal.timeout(10_000) },
  );
  const mediaJson = (await mediaRes.json()) as { data?: IgMedia[]; error?: { message: string } };
  if (!mediaRes.ok || mediaJson.error) {
    return { ok: false, new: 0, error: `media: ${mediaJson.error?.message ?? mediaRes.statusText}` };
  }

  const media = mediaJson.data ?? [];
  const supa = createServiceClient();
  let totalNew = 0;

  for (const m of media) {
    if (!m.comments_count || m.comments_count === 0) continue;
    try {
      const commentsRes = await fetch(
        `https://graph.facebook.com/v22.0/${m.id}/comments?fields=id,text,timestamp,username,user,replies{id,text,timestamp,username,user}&limit=25&access_token=${encodeURIComponent(token)}`,
        { signal: AbortSignal.timeout(10_000) },
      );
      const commentsJson = (await commentsRes.json()) as { data?: IgComment[]; error?: { message: string } };
      if (!commentsRes.ok || commentsJson.error) continue;

      const flat: { comment: IgComment; parent_id?: string }[] = [];
      for (const c of commentsJson.data ?? []) {
        flat.push({ comment: c });
        for (const reply of c.replies?.data ?? []) flat.push({ comment: reply, parent_id: c.id });
      }

      const rows = flat.map(({ comment, parent_id }) => ({
        user_id: userId,
        platform: "instagram" as const,
        kind: parent_id ? ("reply" as const) : ("comment" as const),
        external_id: comment.id,
        thread_id: m.id,
        parent_external_id: parent_id ?? null,
        media_external_id: m.id,
        media_permalink: m.permalink ?? null,
        media_thumbnail_url: m.thumbnail_url ?? m.media_url ?? null,
        author_name: comment.user?.username ?? comment.username ?? "instagram_user",
        author_handle: comment.user?.username ?? comment.username ?? null,
        content: comment.text ?? "",
        media_urls: [],
        external_created_at: comment.timestamp ?? null,
      }));

      if (rows.length > 0) {
        const { count, error: upErr } = await supa
          .from("social_messages")
          .upsert(rows, {
            onConflict: "user_id,platform,external_id",
            ignoreDuplicates: true,
            count: "exact",
          });
        if (!upErr) totalNew += count ?? 0;
      }
    } catch {
      // continue with next media
    }
  }

  return { ok: true, new: totalNew };
}

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req, "/api/cron/engagement-sync")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supa = createServiceClient();
  const startAt = Date.now();
  const budgetMs = 50_000; // leave ~10s headroom before maxDuration

  // Pull active IG connections
  const { data: conns } = await supa
    .from("instagram_connections")
    .select("user_id, instagram_id, page_access_token")
    .not("page_access_token", "is", null)
    .limit(50);

  const work = (conns ?? []) as { user_id: string; instagram_id: string; page_access_token: string }[];

  const results: Array<{ user_id: string; ok: boolean; new: number; error?: string }> = [];
  let processed = 0;
  let newComments = 0;

  for (const w of work) {
    if (Date.now() - startAt > budgetMs) break;
    const r = await syncOneUser(w.user_id, w.instagram_id, w.page_access_token);
    results.push({ user_id: w.user_id, ...r });
    processed++;
    newComments += r.new;
    await sleep(1500); // rate-limit nicely
  }

  // Log to cron_logs for watchdog heartbeat
  try {
    await supa.from("cron_logs").insert({
      job: "engagement-sync",
      ran_at: new Date().toISOString(),
      result: {
        total_users: work.length,
        processed,
        new_comments: newComments,
        truncated: processed < work.length,
      },
    });
  } catch { /* ignore */ }

  return NextResponse.json({
    ok: true,
    total_users: work.length,
    processed,
    new_comments: newComments,
    truncated: processed < work.length,
    results,
  });
}
