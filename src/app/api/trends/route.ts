import { NextRequest, NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const googleTrends = require("google-trends-api");

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });

// ── Daily Trends via public RSS (reliable, no auth needed) ──────────────────
async function getDailyTrends(geo: string) {
  const HL_MAP: Record<string, string> = { RO: "ro", FR: "fr", DE: "de", ES: "es", IT: "it", PT: "pt", PL: "pl", NL: "nl", TR: "tr", JP: "ja", KR: "ko", AR: "ar" };
  const hl = HL_MAP[geo] || "en";
  const res = await fetch(`https://trends.google.com/trending/rss?geo=${geo}&hl=${hl}`, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; GoogleTrendsBot/1.0)" },
    cache: "no-store",
  });
  const xml = await res.text();
  const parsed = parser.parse(xml);
  const items: any[] = parsed?.rss?.channel?.item || [];

  return (Array.isArray(items) ? items : [items]).map((item: any) => {
    const newsItems = item["ht:news_item"]
      ? Array.isArray(item["ht:news_item"]) ? item["ht:news_item"] : [item["ht:news_item"]]
      : [];
    return {
      title: item.title || "",
      traffic: item["ht:approx_traffic"] || "",
      picture: item["ht:picture"] || "",
      articles: newsItems.slice(0, 2).map((n: any) => ({
        title: n["ht:news_item_title"] || "",
        source: n["ht:news_item_source"] || "",
        url: n["ht:news_item_url"] || "",
        thumbnail: n["ht:news_item_picture"] || "",
      })),
    };
  });
}

// ── Interest Over Time via google-trends-api ────────────────────────────────
async function getInterestOverTime(keywords: string[], geo: string) {
  const result = await googleTrends.interestOverTime({
    keyword: keywords,
    startTime: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    geo,
  });
  const text = typeof result === "string" ? result : JSON.stringify(result);
  // Google sometimes prepends ")]}'" — strip it
  const clean = text.replace(/^\)\]\}'/, "").trim();
  const data = JSON.parse(clean);
  const timeline = data.default?.timelineData || [];
  return {
    keywords,
    timeline: timeline.map((point: any) => ({
      date: point.formattedTime,
      values: point.value as number[],
    })),
  };
}

// ── Related Queries via google-trends-api ───────────────────────────────────
async function getRelatedQueries(keyword: string, geo: string) {
  const result = await googleTrends.relatedQueries({ keyword, geo });
  const text = typeof result === "string" ? result : JSON.stringify(result);
  const clean = text.replace(/^\)\]\}'/, "").trim();
  const data = JSON.parse(clean);
  const rankedList = data.default?.rankedList || [];
  return {
    keyword,
    top: (rankedList[0]?.rankedKeyword || []).slice(0, 10).map((k: any) => ({
      query: k.query,
      value: k.value,
    })),
    rising: (rankedList[1]?.rankedKeyword || []).slice(0, 10).map((k: any) => ({
      query: k.query,
      formattedValue: k.formattedValue,
    })),
  };
}

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type") || "daily";
  const geo = req.nextUrl.searchParams.get("geo") || "US";
  const keyword = req.nextUrl.searchParams.get("keyword") || "";
  const keywords = req.nextUrl.searchParams.get("keywords") || "";

  try {
    if (type === "daily") {
      const trends = await getDailyTrends(geo);
      return NextResponse.json({ trends });
    }

    if (type === "interest") {
      const kwList = keywords.split(",").map(k => k.trim()).filter(Boolean).slice(0, 5);
      if (!kwList.length) return NextResponse.json({ error: "No keywords" }, { status: 400 });
      const data = await getInterestOverTime(kwList, geo);
      return NextResponse.json(data);
    }

    if (type === "related") {
      if (!keyword.trim()) return NextResponse.json({ error: "No keyword" }, { status: 400 });
      const data = await getRelatedQueries(keyword.trim(), geo);
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
