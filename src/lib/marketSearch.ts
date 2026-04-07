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

async function fetchNews(query: string): Promise<NewsArticle[]> {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) return [];

  // Try Romanian first, then English
  const langs = ["ro", "en"];
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

async function extractTranscriptDirect(videoId: string): Promise<string | undefined> {
  // Try YouTube timedtext API with different language codes
  for (const lang of ["ro", "en", "en-US"]) {
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

async function extractTranscriptFromPage(videoId: string): Promise<string | undefined> {
  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept-Language": "ro-RO,ro;q=0.9,en;q=0.8",
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

    const track =
      tracks.find((t: any) => t.languageCode === "ro") ||
      tracks.find((t: any) => t.languageCode?.startsWith("en")) ||
      tracks[0];
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

async function getTranscript(videoId: string): Promise<string | undefined> {
  // Try direct API first (faster), fallback to page scrape
  return (await extractTranscriptDirect(videoId)) ?? (await extractTranscriptFromPage(videoId));
}

// ── YouTube search ─────────────────────────────────────────────────────────────

async function searchYouTube(query: string): Promise<YouTubeVideo[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return [];

  try {
    const searchUrl =
      `https://www.googleapis.com/youtube/v3/search` +
      `?part=snippet` +
      `&q=${encodeURIComponent(query)}` +
      `&type=video` +
      `&maxResults=4` +
      `&relevanceLanguage=ro` +
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

    // Extract transcripts in parallel (non-fatal — use description as fallback)
    const withTranscripts = await Promise.all(
      videos.map(async (v) => {
        const transcript = await withTimeout(getTranscript(v.id), 4000, undefined);
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

  // Build smart search queries
  const offerQuery = offerDescription?.slice(0, 60) || offerType;
  const newsQuery  = `${offerQuery} marketing ${location} 2025 2026`;
  const ytQuery    = `${offerType} strategie marketing romania ${question.slice(0, 40)}`;

  // Run both searches in parallel with hard timeout
  const [news, videos] = await Promise.all([
    withTimeout(fetchNews(newsQuery), SEARCH_TIMEOUT_MS, []),
    withTimeout(searchYouTube(ytQuery), SEARCH_TIMEOUT_MS, []),
  ]);

  // Build formatted block for injection into Claude prompt
  let promptBlock = "";

  if (news.length > 0) {
    promptBlock += "=== LIVE WEB INTELLIGENCE (surse recente) ===\n";
    news.forEach((n, i) => {
      promptBlock += `[${i + 1}] ${n.source} (${n.publishedAt}): ${n.title}\n`;
      if (n.snippet) promptBlock += `    ${n.snippet}\n`;
    });
    promptBlock += "\n";
  }

  if (videos.length > 0) {
    promptBlock += "=== YOUTUBE MARKETING CONTENT (scripturi video relevante) ===\n";
    videos.forEach((v, i) => {
      promptBlock += `[Video ${i + 1}] "${v.title}"\n`;
      if (v.transcript) {
        promptBlock += `Script (extras): "${v.transcript.slice(0, 600)}..."\n`;
      } else {
        promptBlock += `Descriere: ${v.description}\n`;
      }
    });
    promptBlock += "\n";
  }

  if (!promptBlock) {
    promptBlock = "(Căutarea live nu a returnat rezultate — folosesc cunoștințele interne)\n";
  }

  return { news, videos, promptBlock };
}
