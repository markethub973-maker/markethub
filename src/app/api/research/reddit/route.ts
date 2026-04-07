import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeApify } from "@/lib/serviceGuard";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  
  if (!process.env.APIFY_TOKEN) return NextResponse.json({ error: "Apify not configured", degraded: true }, { status: 503 });

  const { query, subreddit, limit = 20, sort = "relevance" } = await req.json();
  if (!query && !subreddit) return NextResponse.json({ error: "query or subreddit required" }, { status: 400 });

  const startUrls: { url: string }[] = [];

  if (subreddit) {
    const sub = subreddit.replace(/^r\//, "");
    startUrls.push({ url: `https://www.reddit.com/r/${sub}/` });
  }
  if (query) {
    const encoded = encodeURIComponent(query);
    startUrls.push({ url: `https://www.reddit.com/search/?q=${encoded}&sort=${sort}&type=link` });
    if (subreddit) {
      const sub = subreddit.replace(/^r\//, "");
      startUrls.push({ url: `https://www.reddit.com/r/${sub}/search/?q=${encoded}&restrict_sr=1&sort=${sort}` });
    }
  }

  const result = await safeApify<any[]>("trudax~reddit-scraper-lite", {
    startUrls,
    maxPostCount: Math.min(limit, 30),
    maxComments: 5,
    scrollTimeout: 20,
  }, { timeoutSec: 90, retries: 1 });

  if (!result.ok) {
    return NextResponse.json({ error: result.error, service: "apify", degraded: true }, { status: 503 });
  }

  try {
    const data = result.data || [];
    const posts = (data || []).map((p: any) => ({
      id: p.id,
      title: p.title,
      url: p.url,
      permalink: p.permalink ? `https://www.reddit.com${p.permalink}` : p.url,
      subreddit: p.subreddit,
      author: p.author,
      score: p.score || p.ups || 0,
      upvoteRatio: p.upvoteRatio,
      numComments: p.numComments || p.num_comments || 0,
      text: (p.selftext || p.body || "").slice(0, 500),
      createdAt: p.createdAt || p.created_utc,
      flair: p.linkFlairText || p.flair,
      topComments: (p.comments || []).slice(0, 3).map((c: any) => ({
        author: c.author,
        text: (c.body || "").slice(0, 200),
        score: c.score || 0,
      })),
    }));

    return NextResponse.json({ posts, total: posts.length, query, subreddit });
  } catch (err: any) {
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}
