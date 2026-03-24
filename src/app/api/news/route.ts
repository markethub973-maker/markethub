import { NextRequest, NextResponse } from "next/server";

interface NewsItem {
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: string;
  thumbnail: string | null;
}

const COUNTRIES: Record<string, { name: string; flag: string; hl: string; gl: string; ceid: string }> = {
  ro: { name: "România", flag: "🇷🇴", hl: "ro", gl: "RO", ceid: "RO:ro" },
  us: { name: "United States", flag: "🇺🇸", hl: "en", gl: "US", ceid: "US:en" },
  uk: { name: "United Kingdom", flag: "🇬🇧", hl: "en", gl: "GB", ceid: "GB:en" },
  de: { name: "Deutschland", flag: "🇩🇪", hl: "de", gl: "DE", ceid: "DE:de" },
  fr: { name: "France", flag: "🇫🇷", hl: "fr", gl: "FR", ceid: "FR:fr" },
  es: { name: "España", flag: "🇪🇸", hl: "es", gl: "ES", ceid: "ES:es" },
  it: { name: "Italia", flag: "🇮🇹", hl: "it", gl: "IT", ceid: "IT:it" },
  br: { name: "Brasil", flag: "🇧🇷", hl: "pt-BR", gl: "BR", ceid: "BR:pt-419" },
  jp: { name: "日本", flag: "🇯🇵", hl: "ja", gl: "JP", ceid: "JP:ja" },
  in: { name: "India", flag: "🇮🇳", hl: "en", gl: "IN", ceid: "IN:en" },
};

function parseRSSItems(xml: string, maxItems: number): NewsItem[] {
  const items: NewsItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null && items.length < maxItems) {
    const block = match[1];
    const title = block.match(/<title><!\[CDATA\[(.*?)\]\]>|<title>(.*?)<\/title>/)?.[1] || block.match(/<title>(.*?)<\/title>/)?.[1] || "";
    const link = block.match(/<link>(.*?)<\/link>/)?.[1] || "";
    const pubDate = block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || "";
    const source = block.match(/<source[^>]*>(.*?)<\/source>/)?.[1] || "";
    const description = block.match(/<description><!\[CDATA\[(.*?)\]\]>|<description>(.*?)<\/description>/)?.[1] || "";

    if (title && !title.includes("[Removed]")) {
      items.push({
        title: decodeHTMLEntities(title),
        description: decodeHTMLEntities(stripHTML(description)).slice(0, 200),
        url: link,
        source: decodeHTMLEntities(source),
        publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        thumbnail: null,
      });
    }
  }

  return items;
}

function stripHTML(str: string): string {
  return str.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
}

function decodeHTMLEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}

async function fetchGoogleNews(country: string, maxItems = 8): Promise<NewsItem[]> {
  const config = COUNTRIES[country];
  if (!config) return [];

  const url = `https://news.google.com/rss?hl=${config.hl}&gl=${config.gl}&ceid=${config.ceid}`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 600 },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRSSItems(xml, maxItems);
  } catch {
    return [];
  }
}

async function fetchCreatorEconomyNews(maxItems = 8): Promise<NewsItem[]> {
  const url = `https://news.google.com/rss/search?q=youtube+OR+tiktok+OR+instagram+OR+creator+economy+OR+social+media+marketing&hl=en&gl=US&ceid=US:en`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 600 },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRSSItems(xml, maxItems);
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  const country = req.nextUrl.searchParams.get("country") || "ro";

  try {
    const [countryNews, socialNews] = await Promise.all([
      fetchGoogleNews(country, 9),
      fetchCreatorEconomyNews(8),
    ]);

    const config = COUNTRIES[country] || COUNTRIES.ro;

    return NextResponse.json({
      country: {
        code: country,
        name: config.name,
        flag: config.flag,
      },
      countries: Object.entries(COUNTRIES).map(([code, c]) => ({
        code,
        name: c.name,
        flag: c.flag,
      })),
      headlines: countryNews,
      social: socialNews,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
