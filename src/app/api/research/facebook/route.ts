import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = process.env.APIFY_TOKEN;
  if (!token) return NextResponse.json({ error: "Apify not configured" }, { status: 500 });

  const { page, limit = 10 } = await req.json();
  if (!page?.trim()) return NextResponse.json({ error: "Facebook page name or URL required" }, { status: 400 });

  const pageUrl = page.startsWith("http")
    ? page
    : `https://www.facebook.com/${page.replace(/^@/, "")}`;

  try {
    const res = await fetch(
      `https://api.apify.com/v2/acts/apify~facebook-posts-scraper/run-sync-get-dataset-items?token=${token}&timeout=90&memory=256`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startUrls: [{ url: pageUrl }],
          maxPosts: Math.min(limit, 20),
          maxPostComments: 0,
          maxReviews: 0,
          scrapeAbout: true,
          scrapeReviews: false,
          scrapeServices: false,
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `Apify error: ${res.status}`, detail: err }, { status: 502 });
    }

    const data = await res.json();
    const posts = (data || []).map((p: any) => ({
      postId: p.postId,
      url: p.url,
      text: p.text?.slice(0, 300),
      time: p.time,
      likes: p.likes || 0,
      comments: p.comments || 0,
      shares: p.shares || 0,
      reactions: p.reactions,
      media: p.media?.[0]?.thumbnail || p.media?.[0]?.url,
      pageName: p.pageName,
      pageUrl: p.pageUrl,
      pageFollowers: p.pageFollowers,
      pageCategory: p.pageCategory,
    }));

    const pageInfo = posts[0] ? {
      name: posts[0].pageName,
      url: posts[0].pageUrl,
      followers: posts[0].pageFollowers,
      category: posts[0].pageCategory,
    } : null;

    return NextResponse.json({ posts, pageInfo, total: posts.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
