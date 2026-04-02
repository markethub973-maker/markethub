import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = process.env.APIFY_TOKEN;
  if (!token) return NextResponse.json({ error: "Apify not configured" }, { status: 500 });

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

  try {
    const res = await fetch(
      `https://api.apify.com/v2/acts/trudax~reddit-scraper-lite/run-sync-get-dataset-items?token=${token}&timeout=90&memory=256`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startUrls,
          maxPostCount: Math.min(limit, 30),
          maxComments: 5,
          scrollTimeout: 20,
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `Apify error: ${res.status}`, detail: err }, { status: 502 });
    }

    const data = await res.json();
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
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
