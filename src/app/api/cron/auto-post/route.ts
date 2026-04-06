import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { Resend } from "resend";
import { isAdminAuthorized } from "@/lib/adminAuth";

const CRON_SECRET = process.env.CRON_SECRET!;
const FROM = "MarketHub Pro <noreply@markethubpromo.com>";

interface ScheduledPost {
  id: string;
  user_id: string;
  title: string;
  caption: string;
  platform: string;
  status: string;
  date: string;
  time: string;
  image_url: string | null;
  client: string;
  hashtags: string;
}

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  full_name: string | null;
  instagram_access_token: string | null;
  instagram_user_id: string | null;
}

async function postToInstagram(
  imageUrl: string,
  caption: string,
  accessToken: string,
  igUserId: string
): Promise<{ success: boolean; post_id?: string; error?: string }> {
  // Step 1: Create media container
  const createRes = await fetch(
    `https://graph.facebook.com/v20.0/${igUserId}/media`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_url: imageUrl,
        caption,
        access_token: accessToken,
      }),
    }
  );
  const createData = await createRes.json();
  if (!createData.id) {
    return { success: false, error: createData.error?.message || "Failed to create media container" };
  }

  // Wait 2 seconds for media to process
  await new Promise(r => setTimeout(r, 2000));

  // Step 2: Publish media
  const publishRes = await fetch(
    `https://graph.facebook.com/v20.0/${igUserId}/media_publish`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creation_id: createData.id,
        access_token: accessToken,
      }),
    }
  );
  const publishData = await publishRes.json();
  if (!publishData.id) {
    return { success: false, error: publishData.error?.message || "Failed to publish media" };
  }
  return { success: true, post_id: publishData.id };
}

async function sendPostReminder(
  email: string,
  userName: string | null,
  post: ScheduledPost
): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return;

  const resend = new Resend(resendKey);
  const platformEmoji = post.platform === "instagram" ? "📸" : post.platform === "tiktok" ? "🎵" : "📘";

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `⏰ Time to post: ${post.title}`,
    html: `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;background:#FFFCF7;border-radius:16px;overflow:hidden;border:1px solid rgba(245,215,160,0.4);">
  <div style="background:linear-gradient(135deg,#292524,#3D2E1E);padding:24px 28px;">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
      <div style="width:32px;height:32px;border-radius:8px;background:rgba(245,159,11,0.9);display:flex;align-items:center;justify-content:center;font-weight:bold;color:#1C1814;font-size:16px;">M</div>
      <span style="color:rgba(255,255,255,0.7);font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">MarketHub Pro</span>
    </div>
    <h1 style="color:white;margin:0 0 4px;font-size:20px;font-weight:800;">⏰ Scheduled Post Reminder</h1>
    <p style="color:rgba(255,255,255,0.7);margin:0;font-size:13px;">It's time to publish your scheduled content</p>
  </div>
  <div style="padding:24px 28px;">
    <div style="background:#FFF8ED;border-left:3px solid #F59E0B;border-radius:0 8px 8px 0;padding:14px 16px;margin-bottom:20px;">
      <p style="margin:0 0 4px;color:#A8967E;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">${platformEmoji} ${post.platform.toUpperCase()} · ${post.date} at ${post.time}</p>
      <p style="margin:0 0 4px;color:#292524;font-size:17px;font-weight:800;">${post.title}</p>
      ${post.client ? `<p style="margin:0;color:#78614E;font-size:13px;">Client: ${post.client}</p>` : ""}
    </div>
    ${post.caption ? `
    <div style="background:#FFFCF7;border:1px solid rgba(245,215,160,0.4);border-radius:8px;padding:12px 16px;margin-bottom:16px;">
      <p style="margin:0 0 4px;color:#A8967E;font-size:11px;text-transform:uppercase;font-weight:600;">Caption</p>
      <p style="margin:0;color:#292524;font-size:13px;line-height:1.6;">${post.caption}</p>
      ${post.hashtags ? `<p style="margin:4px 0 0;color:#3B82F6;font-size:12px;">${post.hashtags}</p>` : ""}
    </div>` : ""}
    ${post.image_url ? `
    <div style="margin-bottom:16px;">
      <p style="margin:0 0 6px;color:#A8967E;font-size:11px;text-transform:uppercase;font-weight:600;">Media</p>
      <img src="${post.image_url}" style="width:100%;border-radius:8px;border:1px solid rgba(245,215,160,0.4);" />
    </div>` : ""}
    <div style="text-align:center;margin-bottom:16px;">
      <a href="https://markethubpromo.com/calendar" style="display:inline-block;background:#F59E0B;color:#1C1814;font-weight:700;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;">Open Calendar →</a>
    </div>
  </div>
  <div style="padding:12px 28px;border-top:1px solid rgba(245,215,160,0.3);text-align:center;">
    <p style="color:#C4AA8A;font-size:11px;margin:0;">© 2026 MarketHub Pro · <a href="https://markethubpromo.com" style="color:#F59E0B;text-decoration:none;">markethubpromo.com</a></p>
  </div>
</div>`.trim(),
  });
}

export async function GET(req: NextRequest) {
  // Auth: cron secret or admin session
  const authHeader = req.headers.get("authorization");
  const fromCron = CRON_SECRET && authHeader === `Bearer ${CRON_SECRET}`;
  if (!fromCron && !isAdminAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const svc = createServiceClient();
  const now = new Date();

  // Build datetime threshold: posts where date < today OR (date = today AND time <= now)
  const todayStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
  const nowTime = now.toTimeString().slice(0, 5); // HH:MM

  const { data: duePosts, error } = await svc
    .from("scheduled_posts")
    .select("id, user_id, title, caption, platform, status, date, time, image_url, client, hashtags")
    .eq("status", "scheduled")
    .or(`date.lt.${todayStr},and(date.eq.${todayStr},time.lte.${nowTime})`);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!duePosts || duePosts.length === 0) {
    return NextResponse.json({ processed: 0, message: "No due posts" });
  }

  // Fetch user profiles for all affected users
  const userIds = [...new Set(duePosts.map((p: ScheduledPost) => p.user_id))];
  const { data: profiles } = await svc
    .from("profiles")
    .select("id, email, name, full_name, instagram_access_token, instagram_user_id")
    .in("id", userIds);

  const profileMap = new Map<string, UserProfile>(
    (profiles || []).map((p: UserProfile) => [p.id, p])
  );

  let published = 0;
  let reminded = 0;
  let failed = 0;

  for (const post of duePosts as ScheduledPost[]) {
    const profile = profileMap.get(post.user_id);
    let newStatus = "failed";
    let postResult: Record<string, unknown> = {};

    try {
      if (
        post.platform === "instagram" &&
        post.image_url &&
        profile?.instagram_access_token &&
        profile?.instagram_user_id
      ) {
        // Auto-post to Instagram
        const result = await postToInstagram(
          post.image_url,
          [post.caption, post.hashtags].filter(Boolean).join("\n\n"),
          profile.instagram_access_token,
          profile.instagram_user_id
        );

        if (result.success) {
          newStatus = "published";
          postResult = { ig_post_id: result.post_id, auto_posted: true };
          published++;
        } else {
          newStatus = "failed";
          postResult = { error: result.error, auto_posted: false };
          failed++;
          // Send reminder as fallback
          if (profile?.email) {
            await sendPostReminder(profile.email, profile.full_name || profile.name, post);
            reminded++;
          }
        }
      } else {
        // Can't auto-post — send email reminder instead
        if (profile?.email) {
          await sendPostReminder(profile.email, profile.full_name || profile.name, post);
          reminded++;
        }
        newStatus = "published"; // Mark as handled (reminder sent)
        postResult = { reminder_sent: true, auto_posted: false };
      }
    } catch (err: unknown) {
      newStatus = "failed";
      postResult = { error: err instanceof Error ? err.message : String(err) };
      failed++;
    }

    // Update post status
    await svc
      .from("scheduled_posts")
      .update({
        status: newStatus,
        published_at: new Date().toISOString(),
        post_result: postResult,
      })
      .eq("id", post.id);
  }

  return NextResponse.json({
    success: true,
    total: duePosts.length,
    published,
    reminded,
    failed,
  });
}
