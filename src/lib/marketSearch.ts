/**
 * Market Intelligence — Live web search + YouTube transcript extraction for MAX agent.
 *
 * Sources:
 *   1. NewsAPI — recent articles about the topic
 *   2. YouTube Data API — search for relevant marketing videos
 *   3. YouTube timedtext API — extract transcripts from found videos
 *
 * All calls are wrapped in try/catch and have a hard timeout — if any source fails,
 * we degrade gracefully and the agent still works with static context.
 */

const SEARCH_TIMEOUT_MS = 6000; // 6s max total per source

// ── Language detection from location string ───────────────────────────────────

const LOCATION_LANG_MAP: { keywords: string[]; lang: string; yt_lang: string }[] = [
  { keywords: ["romania", "bucuresti", "cluj", "timisoara", "iasi", "brasov", "constanta", "craiova"],  lang: "ro", yt_lang: "ro" },
  { keywords: ["france", "paris", "marseille", "lyon", "france", "français"],                           lang: "fr", yt_lang: "fr" },
  { keywords: ["germany", "deutschland", "berlin", "munich", "hamburg", "köln", "frankfurt"],           lang: "de", yt_lang: "de" },
  { keywords: ["spain", "españa", "madrid", "barcelona", "seville", "valencia"],                       lang: "es", yt_lang: "es" },
  { keywords: ["italy", "italia", "rome", "milan", "naples", "turin"],                                  lang: "it", yt_lang: "it" },
  { keywords: ["portugal", "lisboa", "porto", "brazil", "brasil", "são paulo", "rio"],                  lang: "pt", yt_lang: "pt" },
  { keywords: ["netherlands", "amsterdam", "rotterdam", "holland", "dutch"],                            lang: "nl", yt_lang: "nl" },
  { keywords: ["poland", "polska", "warsaw", "krakow", "wroclaw"],                                      lang: "pl", yt_lang: "pl" },
  { keywords: ["turkey", "türkiye", "istanbul", "ankara"],                                              lang: "tr", yt_lang: "tr" },
  { keywords: ["arab", "saudi", "dubai", "uae", "qatar", "kuwait", "egypt", "مصر", "السعودية"],        lang: "ar", yt_lang: "ar" },
  { keywords: ["india", "mumbai", "delhi", "bangalore", "chennai", "hyderabad"],                        lang: "en", yt_lang: "hi" },
  { keywords: ["uk", "united kingdom", "london", "manchester", "birmingham", "glasgow"],                lang: "en", yt_lang: "en-GB" },
  { keywords: ["australia", "sydney", "melbourne", "brisbane", "perth"],                               lang: "en", yt_lang: "en-AU" },
  { keywords: ["canada", "toronto", "montreal", "vancouver", "calgary"],                               lang: "en", yt_lang: "en-CA" },
  { keywords: ["usa", "us", "united states", "new york", "los angeles", "chicago", "houston"],         lang: "en", yt_lang: "en-US" },
];

function detectLanguage(location: string): { newsLang: string; ytLang: string } {
  const loc = location.toLowerCase();
  for (const entry of LOCATION_LANG_MAP) {
    if (entry.keywords.some(k => loc.includes(k))) {
      return { newsLang: entry.lang, ytLang: entry.yt_lang };
    }
  }
  return { newsLang: "en", ytLang: "en" }; // default international
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface NewsArticle {
  title: string;
  snippet: string;
  source: string;
  publishedAt: string;
}

export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  transcript?: string;
}

export interface MarketIntelligence {
  news: NewsArticle[];
  videos: YouTubeVideo[];
  promptBlock: string; // pre-formatted text to inject into the AI prompt
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>(resolve => setTimeout(() => resolve(fallback), ms)),
  ]);
}

// ── NewsAPI ───────────────────────────────────────────────────────────────────

async function fetchNews(query: string, preferredLang = "en"): Promise<NewsArticle[]> {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) return [];

  // Try preferred language first, then English as fallback
  const langs = preferredLang !== "en" ? [preferredLang, "en"] : ["en"];
  for (const lang of langs) {
    try {
      const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&apiKey=${apiKey}&language=${lang}&sortBy=publishedAt&pageSize=5`;
      const res = await fetch(url, {
        next: { revalidate: 3600 }, // cache 1h
        signal: AbortSignal.timeout(4000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const articles = (data.articles || []) as any[];
      if (articles.length === 0) continue;
      return articles.slice(0, 4).map((a: any) => ({
        title:       a.title     || "",
        snippet:     (a.description || a.content || "").slice(0, 250),
        source:      a.source?.name || "Unknown",
        publishedAt: a.publishedAt ? a.publishedAt.slice(0, 10) : "",
      }));
    } catch {
      continue;
    }
  }
  return [];
}

// ── YouTube transcript extraction ─────────────────────────────────────────────

async function extractTranscriptDirect(
  videoId: string,
  preferredLangs: string[] = ["en", "en-US"],
): Promise<string | undefined> {
  // Try YouTube timedtext API with different language codes
  for (const lang of preferredLangs) {
    try {
      const url = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}&fmt=json3`;
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible)" },
        next: { revalidate: 3600 },
        signal: AbortSignal.timeout(3000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      if (!Array.isArray(data.events) || data.events.length === 0) continue;
      const text = data.events
        .filter((e: any) => Array.isArray(e.segs))
        .map((e: any) => e.segs.map((s: any) => s.utf8 || "").join(""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 2500);
      if (text.length > 80) return text;
    } catch {
      continue;
    }
  }
  return undefined;
}

async function extractTranscriptFromPage(
  videoId: string,
  preferredLangs: string[] = ["en"],
): Promise<string | undefined> {
  try {
    const acceptLang = preferredLangs
      .map((l, i) => `${l}${i === 0 ? "" : `;q=${(1 - i * 0.1).toFixed(1)}`}`)
      .concat("en;q=0.5")
      .join(",");
    const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept-Language": acceptLang,
      },
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return undefined;
    const html = await res.text();

    // Extract captionTracks JSON
    const match = html.match(/"captionTracks":(\[[\s\S]*?\])/);
    if (!match) return undefined;

    let tracks: any[];
    try { tracks = JSON.parse(match[1]); } catch { return undefined; }
    if (!tracks.length) return undefined;

    // Prefer tracks in the requested language order, then any English variant, then first
    let track: any = undefined;
    for (const lang of preferredLangs) {
      track = tracks.find((t: any) => t.languageCode === lang || t.languageCode?.startsWith(lang));
      if (track) break;
    }
    if (!track) track = tracks.find((t: any) => t.languageCode?.startsWith("en")) || tracks[0];
    if (!track?.baseUrl) return undefined;

    const captionRes = await fetch(`${track.baseUrl}&fmt=json3`, {
      signal: AbortSignal.timeout(3000),
      next: { revalidate: 3600 },
    });
    if (!captionRes.ok) return undefined;
    const captionData = await captionRes.json();

    const text = (captionData.events || [])
      .filter((e: any) => Array.isArray(e.segs))
      .map((e: any) => e.segs.map((s: any) => s.utf8 || "").join(""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 2500);

    return text.length > 80 ? text : undefined;
  } catch {
    return undefined;
  }
}

async function getTranscript(
  videoId: string,
  preferredLangs: string[] = ["en", "en-US"],
): Promise<string | undefined> {
  // Try direct API first (faster), fallback to page scrape
  return (
    (await extractTranscriptDirect(videoId, preferredLangs)) ??
    (await extractTranscriptFromPage(videoId, preferredLangs))
  );
}

// ── YouTube search ─────────────────────────────────────────────────────────────

async function searchYouTube(query: string, relevanceLang = "en"): Promise<YouTubeVideo[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return [];

  try {
    const searchUrl =
      `https://www.googleapis.com/youtube/v3/search` +
      `?part=snippet` +
      `&q=${encodeURIComponent(query)}` +
      `&type=video` +
      `&maxResults=4` +
      `&relevanceLanguage=${relevanceLang}` +
      `&videoDuration=medium` +    // 4-20 min videos — most likely to have good content
      `&key=${apiKey}`;

    const res = await fetch(searchUrl, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return [];
    const data = await res.json();

    const items = (data.items || []) as any[];
    const videos: YouTubeVideo[] = items.map((item: any) => ({
      id:          item.id.videoId,
      title:       item.snippet.title || "",
      description: (item.snippet.description || "").slice(0, 300),
    }));

    // Transcript language priority: the search relevance language, then English
    const transcriptLangs = relevanceLang === "en" ? ["en", "en-US", "en-GB"] : [relevanceLang, "en"];

    // Extract transcripts in parallel (non-fatal — use description as fallback)
    const withTranscripts = await Promise.all(
      videos.map(async (v) => {
        const transcript = await withTimeout(getTranscript(v.id, transcriptLangs), 4000, undefined);
        return { ...v, transcript };
      })
    );

    // Return only videos that have either a transcript or a useful description
    return withTranscripts.filter(v => v.transcript || v.description.length > 50);
  } catch {
    return [];
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function getMarketIntelligence(params: {
  offerType: string;
  offerDescription: string;
  location: string;
  question: string;
}): Promise<MarketIntelligence> {
  const { offerType, offerDescription, location, question } = params;

  // Detect language from location for localized searches.
  // If no location is provided, default to English / international.
  const { newsLang, ytLang } = location
    ? detectLanguage(location)
    : { newsLang: "en", ytLang: "en" };

  const locationTag = location || "global";
  const year = new Date().getFullYear();

  // Build smart search queries — localized when possible, else international
  const offerQuery = offerDescription?.slice(0, 60) || offerType;
  const newsQuery  = `${offerQuery} marketing ${locationTag} ${year}`;
  const ytQuery    = `${offerType} marketing strategy ${locationTag} ${question.slice(0, 40)}`;

  // Run both searches in parallel with hard timeout
  const [news, videos] = await Promise.all([
    withTimeout(fetchNews(newsQuery, newsLang), SEARCH_TIMEOUT_MS, []),
    withTimeout(searchYouTube(ytQuery, ytLang), SEARCH_TIMEOUT_MS, []),
  ]);

  // Build formatted block for injection into Claude prompt (all English — the
  // LLM adapts output to the user's question language).
  let promptBlock = "";

  if (news.length > 0) {
    promptBlock += "=== LIVE WEB INTELLIGENCE (recent sources) ===\n";
    news.forEach((n, i) => {
      promptBlock += `[${i + 1}] ${n.source} (${n.publishedAt}): ${n.title}\n`;
      if (n.snippet) promptBlock += `    ${n.snippet}\n`;
    });
    promptBlock += "\n";
  }

  if (videos.length > 0) {
    promptBlock += "=== YOUTUBE MARKETING CONTENT (relevant video scripts) ===\n";
    videos.forEach((v, i) => {
      promptBlock += `[Video ${i + 1}] "${v.title}"\n`;
      if (v.transcript) {
        promptBlock += `Script (excerpt): "${v.transcript.slice(0, 600)}..."\n`;
      } else {
        promptBlock += `Description: ${v.description}\n`;
      }
    });
    promptBlock += "\n";
  }

  if (!promptBlock) {
    promptBlock = "(Live search returned no results — falling back to internal knowledge)\n";
  }

  return { news, videos, promptBlock };
}
