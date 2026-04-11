import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { Resend } from "resend";
import { isAdminAuthorized } from "@/lib/adminAuth";
import { timingSafeEqual } from "crypto";
import {
  publishToLinkedIn,
  publishToFacebook,
  publishToInstagram,
  type ScheduledPostRow,
  type PublishResult,
} from "@/lib/publishers";

const CRON_SECRET = process.env.CRON_SECRET ?? "";
const FROM = "MarketHub Pro <noreply@markethubpromo.com>";

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  full_name: string | null;
  instagram_access_token: string | null;
  instagram_user_id: string | null;
  linkedin_access_token: string | null;
  fb_page_id: string | null;
  fb_page_access_token: string | null;
}

async function sendPostReminder(
  email: string,
  userName: string | null,
  post: ScheduledPostRow,
  reason: string
): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return;

  const resend = new Resend(resendKey);
  const platformEmoji =
    post.platform === "instagram" ? "📸" :
    post.platform === "tiktok" ? "🎵" :
    post.platform === "linkedin" ? "💼" :
    post.platform === "facebook" ? "📘" : "📝";

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `⚠️ Auto-post failed: ${post.title}`,
    html: `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;background:#FFFCF7;border-radius:16px;overflow:hidden;border:1px solid rgba(245,215,160,0.4);">
  <div style="background:linear-gradient(135deg,#292524,#3D2E1E);padding:24px 28px;">
    <h1 style="color:white;margin:0 0 4px;font-size:20px;font-weight:800;">⚠️ Auto-publish Failed</h1>
    <p style="color:rgba(255,255,255,0.7);margin:0;font-size:13px;">Scheduled post couldn't be published automatically</p>
  </div>
  <div style="padding:24px 28px;">
    <div style="background:#FFF8ED;border-left:3px solid #EF4444;border-radius:0 8px 8px 0;padding:14px 16px;margin-bottom:20px;">
      <p style="margin:0 0 4px;color:#A8967E;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">${platformEmoji} ${post.platform.toUpperCase()} · ${post.date} at ${post.time}</p>
      <p style="margin:0 0 4px;color:#292524;font-size:17px;font-weight:800;">${post.title}</p>
      <p style="margin:8px 0 0;color:#EF4444;font-size:13px;"><strong>Reason:</strong> ${reason}</p>
    </div>
    ${post.caption ? `
    <div style="background:#FFFCF7;border:1px solid rgba(245,215,160,0.4);border-radius:8px;padding:12px 16px;margin-bottom:16px;">
      <p style="margin:0 0 4px;color:#A8967E;font-size:11px;text-transform:uppercase;font-weight:600;">Caption</p>
      <p style="margin:0;color:#292524;font-size:13px;line-height:1.6;">${post.caption}</p>
    </div>` : ""}
    <div style="text-align:center;margin-bottom:16px;">
      <a href="https://markethubpromo.com/calendar" style="display:inline-block;background:#F59E0B;color:#1C1814;font-weight:700;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;">Open Calendar →</a>
    </div>
  </div>
</div>`.trim(),
  });
}

export async function GET(req: NextRequest) {
  // Auth: cron secret (constant-time compare) or admin session
  const authHeader = req.headers.get("authorization") ?? "";
  const provided = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  let fromCron = false;
  if (CRON_SECRET && provided && provided.length === CRON_SECRET.length) {
    try {
      fromCron = timingSafeEqual(Buffer.from(provided), Buffer.from(CRON_SECRET));
    } catch { /* mismatched length */ }
  }
  if (!fromCron && !isAdminAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const svc = createServiceClient();
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const nowTime = now.toTimeString().slice(0, 5);

  const { data: duePosts, error } = await svc
    .from("scheduled_posts")
    .select("id, user_id, title, caption, platform, status, date, time, image_url, client, hashtags, first_comment")
    .eq("status", "scheduled")
    .or(`date.lt.${todayStr},and(date.eq.${todayStr},time.lte.${nowTime})`);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!duePosts || duePosts.length === 0) {
    return NextResponse.json({ processed: 0, message: "No due posts" });
  }

  const userIds = [...new Set(duePosts.map((p: ScheduledPostRow) => p.user_id))];
  const { data: profiles } = await svc
    .from("profiles")
    .select("id, email, name, full_name, instagram_access_token, instagram_user_id, linkedin_access_token, fb_page_id, fb_page_access_token")
    .in("id", userIds);

  const profileMap = new Map<string, UserProfile>(
    (profiles || []).map((p: UserProfile) => [p.id, p])
  );

  // Primary Instagram account per user (post-refactor source of truth for
  // both ig_user_id and page_access_token — the legacy profiles columns are
  // a fallback for rows that existed before page_access_token was added).
  const { data: igConnections } = await svc
    .from("instagram_connections")
    .select("user_id, instagram_id, page_access_token, is_primary")
    .in("user_id", userIds)
    .order("is_primary", { ascending: false });

  const igPrimaryByUser = new Map<string, { igId: string; token: string | null }>();
  for (const c of igConnections ?? []) {
    if (!igPrimaryByUser.has(c.user_id)) {
      igPrimaryByUser.set(c.user_id, {
        igId: c.instagram_id,
        token: (c.page_access_token as string | null) ?? null,
      });
    }
  }

  let published = 0;
  let reminded = 0;
  let failed = 0;

  for (const post of duePosts as ScheduledPostRow[]) {
    const profile = profileMap.get(post.user_id);
    const platform = post.platform?.toLowerCase() ?? "";
    let result: PublishResult = { ok: false, error: "Platform not supported" };

    try {
      if (platform === "linkedin") {
        result = await publishToLinkedIn(post, profile?.linkedin_access_token ?? "");
      } else if (platform === "facebook") {
        result = await publishToFacebook(post, profile?.fb_page_id ?? null, profile?.fb_page_access_token ?? null);
      } else if (platform === "instagram") {
        // Prefer per-row instagram_connections token, fall back to legacy
        // profiles columns for users whose connections predate the multi-
        // account schema refactor.
        const igPrimary = igPrimaryByUser.get(post.user_id);
        const igUserId = igPrimary?.igId ?? profile?.instagram_user_id ?? null;
        const igToken = igPrimary?.token ?? profile?.instagram_access_token ?? null;
        result = await publishToInstagram(post, igUserId, igToken);
      }
    } catch (err) {
      result = { ok: false, error: err instanceof Error ? err.message : String(err) };
    }

    // Log every attempt
    await svc.from("publish_log").insert({
      post_id: post.id,
      platform,
      status: result.ok ? "success" : "failed",
      external_id: result.external_id ?? null,
      error_msg: result.error ?? null,
    });

    if (result.ok) {
      await svc
        .from("scheduled_posts")
        .update({
          status: "published",
          published_at: new Date().toISOString(),
          post_result: { ...result, auto_posted: true },
        })
        .eq("id", post.id);
      published++;
    } else {
      await svc
        .from("scheduled_posts")
        .update({
          status: "failed",
          post_result: { ...result, auto_posted: false },
        })
        .eq("id", post.id);
      failed++;

      // Send email so the user knows the auto-post failed
      if (profile?.email) {
        await sendPostReminder(
          profile.email,
          profile.full_name || profile.name,
          post,
          result.error ?? "Unknown error"
        );
        reminded++;
      }
    }
  }

  // Log cron run
  await svc.from("cron_logs").upsert({
    job: "auto-post",
    ran_at: new Date().toISOString(),
    result: { total: duePosts.length, published, failed, reminded },
  });

  return NextResponse.json({
    success: true,
    total: duePosts.length,
    published,
    reminded,
    failed,
  });
}
