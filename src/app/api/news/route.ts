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
  // Americas
  us: { name: "United States", flag: "🇺🇸", hl: "en", gl: "US", ceid: "US:en" },
  ca: { name: "Canada", flag: "🇨🇦", hl: "en", gl: "CA", ceid: "CA:en" },
  mx: { name: "México", flag: "🇲🇽", hl: "es-419", gl: "MX", ceid: "MX:es-419" },
  br: { name: "Brasil", flag: "🇧🇷", hl: "pt-BR", gl: "BR", ceid: "BR:pt-419" },
  ar: { name: "Argentina", flag: "🇦🇷", hl: "es-419", gl: "AR", ceid: "AR:es-419" },
  co: { name: "Colombia", flag: "🇨🇴", hl: "es-419", gl: "CO", ceid: "CO:es-419" },
  cl: { name: "Chile", flag: "🇨🇱", hl: "es-419", gl: "CL", ceid: "CL:es-419" },
  pe: { name: "Perú", flag: "🇵🇪", hl: "es-419", gl: "PE", ceid: "PE:es-419" },
  ve: { name: "Venezuela", flag: "🇻🇪", hl: "es-419", gl: "VE", ceid: "VE:es-419" },
  cu: { name: "Cuba", flag: "🇨🇺", hl: "es-419", gl: "CU", ceid: "CU:es-419" },
  // Europe
  uk: { name: "United Kingdom", flag: "🇬🇧", hl: "en", gl: "GB", ceid: "GB:en" },
  de: { name: "Deutschland", flag: "🇩🇪", hl: "de", gl: "DE", ceid: "DE:de" },
  fr: { name: "France", flag: "🇫🇷", hl: "fr", gl: "FR", ceid: "FR:fr" },
  es: { name: "España", flag: "🇪🇸", hl: "es", gl: "ES", ceid: "ES:es" },
  it: { name: "Italia", flag: "🇮🇹", hl: "it", gl: "IT", ceid: "IT:it" },
  ro: { name: "România", flag: "🇷🇴", hl: "ro", gl: "RO", ceid: "RO:ro" },
  pl: { name: "Polska", flag: "🇵🇱", hl: "pl", gl: "PL", ceid: "PL:pl" },
  nl: { name: "Nederland", flag: "🇳🇱", hl: "nl", gl: "NL", ceid: "NL:nl" },
  be: { name: "Belgique", flag: "🇧🇪", hl: "fr", gl: "BE", ceid: "BE:fr" },
  se: { name: "Sverige", flag: "🇸🇪", hl: "sv", gl: "SE", ceid: "SE:sv" },
  no: { name: "Norge", flag: "🇳🇴", hl: "no", gl: "NO", ceid: "NO:no" },
  dk: { name: "Danmark", flag: "🇩🇰", hl: "da", gl: "DK", ceid: "DK:da" },
  fi: { name: "Suomi", flag: "🇫🇮", hl: "fi", gl: "FI", ceid: "FI:fi" },
  ch: { name: "Schweiz", flag: "🇨🇭", hl: "de", gl: "CH", ceid: "CH:de" },
  at: { name: "Österreich", flag: "🇦🇹", hl: "de", gl: "AT", ceid: "AT:de" },
  pt: { name: "Portugal", flag: "🇵🇹", hl: "pt-PT", gl: "PT", ceid: "PT:pt-150" },
  gr: { name: "Ελλάδα", flag: "🇬🇷", hl: "el", gl: "GR", ceid: "GR:el" },
  cz: { name: "Česko", flag: "🇨🇿", hl: "cs", gl: "CZ", ceid: "CZ:cs" },
  hu: { name: "Magyarország", flag: "🇭🇺", hl: "hu", gl: "HU", ceid: "HU:hu" },
  sk: { name: "Slovensko", flag: "🇸🇰", hl: "sk", gl: "SK", ceid: "SK:sk" },
  bg: { name: "България", flag: "🇧🇬", hl: "bg", gl: "BG", ceid: "BG:bg" },
  rs: { name: "Srbija", flag: "🇷🇸", hl: "sr", gl: "RS", ceid: "RS:sr" },
  hr: { name: "Hrvatska", flag: "🇭🇷", hl: "hr", gl: "HR", ceid: "HR:hr" },
  si: { name: "Slovenija", flag: "🇸🇮", hl: "sl", gl: "SI", ceid: "SI:sl" },
  lt: { name: "Lietuva", flag: "🇱🇹", hl: "lt", gl: "LT", ceid: "LT:lt" },
  lv: { name: "Latvija", flag: "🇱🇻", hl: "lv", gl: "LV", ceid: "LV:lv" },
  ee: { name: "Eesti", flag: "🇪🇪", hl: "et", gl: "EE", ceid: "EE:et" },
  ru: { name: "Россия", flag: "🇷🇺", hl: "ru", gl: "RU", ceid: "RU:ru" },
  ua: { name: "Україна", flag: "🇺🇦", hl: "uk", gl: "UA", ceid: "UA:uk" },
  // Middle East & Africa
  tr: { name: "Türkiye", flag: "🇹🇷", hl: "tr", gl: "TR", ceid: "TR:tr" },
  il: { name: "ישראל", flag: "🇮🇱", hl: "iw", gl: "IL", ceid: "IL:iw" },
  sa: { name: "السعودية", flag: "🇸🇦", hl: "ar", gl: "SA", ceid: "SA:ar" },
  ae: { name: "الإمارات", flag: "🇦🇪", hl: "ar", gl: "AE", ceid: "AE:ar" },
  eg: { name: "مصر", flag: "🇪🇬", hl: "ar", gl: "EG", ceid: "EG:ar" },
  lb: { name: "لبنان", flag: "🇱🇧", hl: "ar", gl: "LB", ceid: "LB:ar" },
  ma: { name: "المغرب", flag: "🇲🇦", hl: "ar", gl: "MA", ceid: "MA:ar" },
  ng: { name: "Nigeria", flag: "🇳🇬", hl: "en", gl: "NG", ceid: "NG:en" },
  za: { name: "South Africa", flag: "🇿🇦", hl: "en", gl: "ZA", ceid: "ZA:en" },
  ke: { name: "Kenya", flag: "🇰🇪", hl: "en", gl: "KE", ceid: "KE:en" },
  gh: { name: "Ghana", flag: "🇬🇭", hl: "en", gl: "GH", ceid: "GH:en" },
  tz: { name: "Tanzania", flag: "🇹🇿", hl: "en", gl: "TZ", ceid: "TZ:en" },
  et: { name: "Ethiopia", flag: "🇪🇹", hl: "en", gl: "ET", ceid: "ET:en" },
  // Asia & Oceania
  in: { name: "India", flag: "🇮🇳", hl: "en", gl: "IN", ceid: "IN:en" },
  jp: { name: "日本", flag: "🇯🇵", hl: "ja", gl: "JP", ceid: "JP:ja" },
  cn: { name: "中国", flag: "🇨🇳", hl: "zh-CN", gl: "CN", ceid: "CN:zh-Hans" },
  kr: { name: "한국", flag: "🇰🇷", hl: "ko", gl: "KR", ceid: "KR:ko" },
  tw: { name: "台灣", flag: "🇹🇼", hl: "zh-TW", gl: "TW", ceid: "TW:zh-Hant" },
  hk: { name: "香港", flag: "🇭🇰", hl: "zh-HK", gl: "HK", ceid: "HK:zh-Hant" },
  sg: { name: "Singapore", flag: "🇸🇬", hl: "en", gl: "SG", ceid: "SG:en" },
  my: { name: "Malaysia", flag: "🇲🇾", hl: "en", gl: "MY", ceid: "MY:en" },
  ph: { name: "Philippines", flag: "🇵🇭", hl: "en", gl: "PH", ceid: "PH:en" },
  id: { name: "Indonesia", flag: "🇮🇩", hl: "id", gl: "ID", ceid: "ID:id" },
  th: { name: "ประเทศไทย", flag: "🇹🇭", hl: "th", gl: "TH", ceid: "TH:th" },
  vn: { name: "Việt Nam", flag: "🇻🇳", hl: "vi", gl: "VN", ceid: "VN:vi" },
  bd: { name: "Bangladesh", flag: "🇧🇩", hl: "bn", gl: "BD", ceid: "BD:bn" },
  pk: { name: "پاکستان", flag: "🇵🇰", hl: "ur", gl: "PK", ceid: "PK:ur" },
  lk: { name: "Sri Lanka", flag: "🇱🇰", hl: "en", gl: "LK", ceid: "LK:en" },
  np: { name: "Nepal", flag: "🇳🇵", hl: "en", gl: "NP", ceid: "NP:en" },
  kz: { name: "Қазақстан", flag: "🇰🇿", hl: "ru", gl: "KZ", ceid: "KZ:ru" },
  au: { name: "Australia", flag: "🇦🇺", hl: "en", gl: "AU", ceid: "AU:en" },
  nz: { name: "New Zealand", flag: "🇳🇿", hl: "en", gl: "NZ", ceid: "NZ:en" },
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
