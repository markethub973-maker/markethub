import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeApify } from "@/lib/serviceGuard";
import { checkAndIncrDailyLimit, limitExceededResponse } from "@/lib/dailyLimits";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("plan").eq("id", user.id).single();
  const userPlan = (profile as any)?.plan ?? "free_test";
  const limitCheck = await checkAndIncrDailyLimit(user.id, userPlan, "research");
  if (!limitCheck.allowed) return NextResponse.json(limitExceededResponse(limitCheck, "research"), { status: 429 });

  if (!process.env.APIFY_TOKEN) return NextResponse.json({ error: "Apify not configured", degraded: true }, { status: 503 });

  const { groupUrl, limit = 20 } = await req.json();
  if (!groupUrl?.trim()) return NextResponse.json({ error: "Facebook group URL required" }, { status: 400 });

  const url = groupUrl.trim();
  if (!/^https?:\/\/(www\.|m\.|web\.)?facebook\.com\/groups\//i.test(url)) {
    return NextResponse.json({ error: "Provide a valid public Facebook group URL (https://www.facebook.com/groups/...)" }, { status: 400 });
  }

  const result = await safeApify<any[]>("apify~facebook-groups-scraper", {
    startUrls: [{ url }],
    resultsLimit: Math.min(Math.max(Number(limit) || 20, 1), 50),
    viewOption: "CHRONOLOGICAL",
  }, { timeoutSec: 180, retries: 1 });

  if (!result.ok) {
    return NextResponse.json({ error: result.error, service: "apify", degraded: true }, { status: 503 });
  }

  try {
    const data = result.data || [];
    const posts = data.map((p: any) => {
      const reactionsTotal =
        (p.likesCount || 0) +
        (p.reactionLoveCount || 0) +
        (p.reactionWowCount || 0) +
        (p.reactionHahaCount || 0) +
        (p.reactionSadCount || 0) +
        (p.reactionAngryCount || 0) +
        (p.reactionCareCount || 0);
      return {
        postId: p.legacyId || p.id,
        url: p.url,
        text: (p.text || "").slice(0, 600),
        time: p.time,
        likes: p.likesCount || 0,
        comments: p.commentsCount || 0,
        shares: p.sharesCount || 0,
        reactionsTotal,
        topReactionsCount: p.topReactionsCount || 0,
        author: p.user?.name || null,
        authorId: p.user?.id || null,
        media: Array.isArray(p.media) ? p.media[0]?.thumbnail || p.media[0]?.url || null : null,
        topComments: Array.isArray(p.topComments)
          ? p.topComments.slice(0, 3).map((c: any) => ({
              author: c.profileName || null,
              text: (c.text || "").slice(0, 200),
              date: c.date,
              likes: Number(c.likesCount) || 0,
              url: c.commentUrl,
            }))
          : [],
      };
    });

    const groupInfo = data[0]
      ? {
          url: data[0].facebookUrl,
          name: (data[0].facebookUrl || "").split("/groups/")[1]?.split("/")[0] || null,
        }
      : { url, name: url.split("/groups/")[1]?.split("/")[0] || null };

    return NextResponse.json({ posts, groupInfo, total: posts.length });
  } catch {
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}
