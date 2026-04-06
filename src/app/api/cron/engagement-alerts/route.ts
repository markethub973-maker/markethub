import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendEngagementAlertEmail } from "@/lib/resend";
import { resolveIGToken } from "@/lib/igToken";

const CRON_SECRET = process.env.CRON_SECRET!;
const DEFAULT_THRESHOLD = 2.0; // alert if ER drops below 2%
const ALERT_COOLDOWN_DAYS = 7; // don't alert more than once per week per user

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const fromCron = CRON_SECRET && authHeader === `Bearer ${CRON_SECRET}`;
  if (!fromCron) {
    let fromAdmin = false;
    try {
      const crypto = (await import("crypto")).default;
      const { generateAdminToken } = await import("@/lib/adminAuth");
      const expected = generateAdminToken();
      const cookieHeader = req.headers.get("cookie") ?? "";
      const match = cookieHeader.match(/admin_session_token=([^;]+)/);
      const token = match?.[1] ?? "";
      fromAdmin = token.length === expected.length &&
        crypto.timingSafeEqual(Buffer.from(token, "hex"), Buffer.from(expected, "hex"));
    } catch {}
    if (!fromAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const supabase = createServiceClient();

  // Fetch paid users with Instagram connected
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, instagram_access_token, instagram_user_id, instagram_username, subscription_plan, engagement_alert_threshold")
    .not("instagram_access_token", "is", null)
    .not("instagram_user_id", "is", null)
    .not("subscription_plan", "in", '("free","free_test")')
    .not("email", "is", null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const summary = { checked: 0, alerted: 0, skipped_cooldown: 0, errors: 0 };

  // Load last alert times from cron_logs
  const { data: logs } = await supabase
    .from("cron_logs")
    .select("job, ran_at")
    .like("job", "engagement-alert-%");

  const lastAlerted: Record<string, Date> = {};
  for (const log of logs ?? []) {
    lastAlerted[log.job] = new Date(log.ran_at);
  }

  for (const profile of profiles ?? []) {
    summary.checked++;
    const logKey = `engagement-alert-${profile.id}`;
    const threshold = profile.engagement_alert_threshold ?? DEFAULT_THRESHOLD;

    // Check cooldown — skip if alerted within ALERT_COOLDOWN_DAYS
    if (lastAlerted[logKey]) {
      const daysSince = (Date.now() - lastAlerted[logKey].getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < ALERT_COOLDOWN_DAYS) {
        summary.skipped_cooldown++;
        continue;
      }
    }

    try {
      const token = await resolveIGToken(profile.instagram_access_token, profile.instagram_user_id);

      // Fetch last 10 posts for ER calculation
      const mediaRes = await fetch(
        `https://graph.facebook.com/v22.0/${profile.instagram_user_id}/media?fields=caption,like_count,comments_count,media_type,timestamp&limit=10&access_token=${token}`
      );
      const mediaData = await mediaRes.json();
      if (mediaData.error || !mediaData.data?.length) continue;

      // Fetch followers
      const igRes = await fetch(
        `https://graph.facebook.com/v22.0/${profile.instagram_user_id}?fields=followers_count&access_token=${token}`
      );
      const igData = await igRes.json();
      const followers = igData.followers_count || 0;
      if (followers === 0) continue;

      const posts: Array<{ caption?: string; engRate: number }> = mediaData.data.map((p: {
        caption?: string; like_count?: number; comments_count?: number;
      }) => ({
        caption: p.caption,
        engRate: (((p.like_count || 0) + (p.comments_count || 0)) / followers) * 100,
      }));

      const avgER = posts.reduce((s, p) => s + p.engRate, 0) / posts.length;

      if (avgER < threshold) {
        const topPost = [...posts].sort((a, b) => b.engRate - a.engRate)[0] ?? null;
        await sendEngagementAlertEmail(
          profile.email,
          profile.full_name || "there",
          profile.instagram_username || profile.instagram_user_id,
          avgER,
          threshold,
          topPost,
        );
        summary.alerted++;

        // Record alert time
        await supabase.from("cron_logs").upsert(
          { job: logKey, ran_at: new Date().toISOString(), result: { avgER, threshold } },
          { onConflict: "job" }
        );
      }
    } catch {
      summary.errors++;
    }
  }

  return NextResponse.json({ success: true, summary });
}
