import { NextResponse } from "next/server";

const BASE = "https://newsapi.org/v2";

export async function GET() {
  const key = process.env.NEWS_API_KEY;
  if (!key) return NextResponse.json({ error: "NEWS_API_KEY not configured" }, { status: 500 });

  try {
    const [roRes, socialRes] = await Promise.all([
      fetch(`${BASE}/top-headlines?country=ro&pageSize=6&apiKey=${key}`, { next: { revalidate: 1800 } }),
      fetch(`${BASE}/everything?q=youtube+tiktok+instagram+creator&language=en&sortBy=publishedAt&pageSize=8&apiKey=${key}`, { next: { revalidate: 1800 } }),
    ]);

    const [roData, socialData] = await Promise.all([roRes.json(), socialRes.json()]);

    const mapArticle = (a: any) => ({
      title: a.title,
      description: a.description,
      url: a.url,
      thumbnail: a.urlToImage,
      source: a.source?.name,
      publishedAt: a.publishedAt,
      author: a.author,
    });

    const ro = (roData.articles || []).filter((a: any) => a.title && a.title !== "[Removed]").map(mapArticle);
    const social = (socialData.articles || []).filter((a: any) => a.title && a.title !== "[Removed]").map(mapArticle);

    return NextResponse.json({ ro, social });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
