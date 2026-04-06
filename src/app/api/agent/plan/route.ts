import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import { safeAnthropic } from "@/lib/serviceGuard";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a marketing research agent workflow planner. Your job is to analyze a business goal and generate the optimal multi-step research workflow to achieve it.

Available tools/actors:
1. google_search — Search Google for keywords, finds websites, news, competitors, ads
2. google_maps — Find local businesses on Google Maps (restaurants, venues, companies) with address, phone, rating, reviews
3. google_maps_reviews — Scrape reviews for a specific Google Maps place — sentiment analysis, owner responses
4. instagram_profile — Scrape Instagram profile + posts by @username
5. instagram_hashtag — Scrape Instagram posts by #hashtag
6. tiktok_profile — Scrape TikTok profile + videos by @username
7. tiktok_hashtag — Scrape TikTok videos by #hashtag
8. facebook_page — Scrape Facebook page posts and info
9. youtube_channel — Scrape YouTube channel videos by @handle or URL
10. youtube_search — Search YouTube videos by keyword
11. reddit_search — Search Reddit threads and discussions by keyword
12. reddit_subreddit — Browse a specific subreddit for posts
13. website_crawler — Extract full content from a competitor website (prices, copy, structure)

When the user provides a goal, you must:
1. Identify the TARGET AUDIENCE (who are potential clients/customers)
2. Identify the best CHANNELS to find them
3. Generate 3-6 sequential steps using the available tools
4. Each step should build on previous results
5. Adapt keywords and queries for Romanian market unless specified otherwise

Return ONLY valid JSON in this exact format:
{
  "goal_summary": "brief description of what we're trying to achieve",
  "target_audience": "description of ideal clients",
  "strategy": "brief explanation of the approach",
  "estimated_leads": "rough estimate of leads we might find",
  "steps": [
    {
      "id": 1,
      "actor": "google_maps",
      "label": "Find local venues on Google Maps",
      "icon": "map",
      "purpose": "Identify restaurants, clubs and event halls that could hire DJ services",
      "params": {
        "query": "restaurant evenimente sala nunta",
        "location": "Romania",
        "limit": 20
      }
    }
  ],
  "ai_tips": ["tip1", "tip2", "tip3"]
}

Actor param formats:
- google_search: { query, country, pages }
- google_maps: { query, location, limit }
- google_maps_reviews: { placeName, maxReviews }
- instagram_profile: { username, limit }
- instagram_hashtag: { hashtag, limit }
- tiktok_profile: { username, limit }
- tiktok_hashtag: { hashtag, limit }
- facebook_page: { page, limit }
- youtube_channel: { channel, limit }
- youtube_search: { keyword, limit }
- reddit_search: { query, limit }
- reddit_subreddit: { subreddit, query, limit }
- website_crawler: { url, maxPages }

Always think about the complete marketing funnel: discovery → qualification → contact.
For Romanian market use Romanian keywords unless the user specifies another market.`;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { goal, region, hints, language } = await req.json();
  if (!goal?.trim()) return NextResponse.json({ error: "Goal required" }, { status: 400 });

  const localContext = region && hints?.length
    ? `\n\nLOCAL MARKET OVERRIDE:\n- Target region: ${region}\n- Language for keywords: ${language || "auto"}\n- Market-specific hints:\n${(hints as string[]).map((h: string) => `  • ${h}`).join("\n")}`
    : "";

  const result = await safeAnthropic(() =>
    anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      system: SYSTEM_PROMPT + localContext,
      messages: [{ role: "user", content: `Business goal: ${goal}` }],
    })
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error, service: "anthropic", degraded: true }, { status: 503 });
  }

  try {
    const text = result.data.content[0].type === "text" ? result.data.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ error: "Could not parse AI response" }, { status: 500 });
    return NextResponse.json({ plan: JSON.parse(jsonMatch[0]) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
