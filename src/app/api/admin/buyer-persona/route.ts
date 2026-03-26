/**
 * POST /api/admin/buyer-persona
 * Admin-only endpoint. Scrapes a public Instagram profile and uses Claude AI
 * to generate a detailed Buyer Persona for marketing purposes.
 *
 * Body: { username: string, niche?: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import { getAppApiKey } from "@/lib/anthropic-client";

const RAPIDAPI_HOST = "instagram-public-bulk-scraper.p.rapidapi.com";

// ── Admin guard ───────────────────────────────────────────────────────────────
async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  return profile?.is_admin ? user : null;
}

// ── Scrape public Instagram profile ──────────────────────────────────────────
async function scrapeInstagram(username: string) {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) throw new Error("RAPIDAPI_KEY not configured");

  const res = await fetch(
    `https://${RAPIDAPI_HOST}/v1/user_info_web?username=${encodeURIComponent(username)}`,
    {
      headers: {
        "x-rapidapi-host": RAPIDAPI_HOST,
        "x-rapidapi-key": apiKey,
      },
    }
  );

  if (!res.ok) throw new Error(`Instagram scraper returned ${res.status}`);
  const raw = await res.json();
  if (!raw?.data) throw new Error("User not found or private account");

  const u = raw.data;
  const recentPosts = u.edge_owner_to_timeline_media?.edges || [];

  // Extract hashtags from captions
  const hashtagMap: Record<string, number> = {};
  const posts = recentPosts.slice(0, 12).map((edge: any) => {
    const node = edge.node;
    const caption = node.edge_media_to_caption?.edges?.[0]?.node?.text || "";
    const hashtags = caption.match(/#\w+/g) || [];
    hashtags.forEach((tag: string) => {
      const t = tag.toLowerCase();
      hashtagMap[t] = (hashtagMap[t] || 0) + 1;
    });
    const likes = node.edge_liked_by?.count || 0;
    const comments = node.edge_media_to_comment?.count || 0;
    return {
      isVideo: node.is_video,
      likes,
      comments,
      videoViews: node.video_view_count || 0,
      caption: caption.substring(0, 200),
    };
  });

  const topHashtags = Object.entries(hashtagMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([tag]) => tag);

  const followers = u.edge_followed_by?.count || 0;
  const totalEngagement = posts.reduce((s: number, post: any) => s + post.likes + post.comments, 0);
  const engagementRate = followers > 0 && posts.length > 0
    ? parseFloat(((totalEngagement / posts.length / followers) * 100).toFixed(2))
    : 0;

  const videoCount = posts.filter((post: any) => post.isVideo).length;

  return {
    username: u.username,
    fullName: u.full_name || "",
    bio: u.biography || "",
    followers,
    following: u.edge_follow?.count || 0,
    postsCount: u.edge_owner_to_timeline_media?.count || 0,
    isVerified: u.is_verified || false,
    category: u.category_name || null,
    externalUrl: u.external_url || null,
    engagementRate,
    topHashtags,
    contentMix: {
      videoPercent: Math.round((videoCount / Math.max(posts.length, 1)) * 100),
      imagePercent: Math.round(((posts.length - videoCount) / Math.max(posts.length, 1)) * 100),
    },
    avgLikes: Math.round(posts.reduce((s: number, post: any) => s + post.likes, 0) / Math.max(posts.length, 1)),
    avgComments: Math.round(posts.reduce((s: number, post: any) => s + post.comments, 0) / Math.max(posts.length, 1)),
    recentCaptions: posts.slice(0, 5).map((post: any) => post.caption).filter(Boolean),
  };
}

// ── Generate persona with Claude AI ──────────────────────────────────────────
async function generatePersonaWithAI(igData: any, niche: string) {
  const client = new Anthropic({ apiKey: getAppApiKey() });

  const prompt = `You are an expert digital marketing analyst specializing in buyer persona development for social media influencers and content creators.

Analyze the following Instagram profile data and generate a comprehensive, actionable buyer persona in JSON format.

INSTAGRAM PROFILE DATA:
- Username: @${igData.username}
- Name: ${igData.fullName}
- Bio: "${igData.bio}"
- Category: ${igData.category || "Not specified"}
- Followers: ${igData.followers.toLocaleString()}
- Following: ${igData.following.toLocaleString()}
- Total Posts: ${igData.postsCount}
- Engagement Rate: ${igData.engagementRate}% (industry average: 2-3%)
- External Link: ${igData.externalUrl || "none"}
- Verified: ${igData.isVerified}
- Content Mix: ${igData.contentMix.videoPercent}% video, ${igData.contentMix.imagePercent}% image
- Average Likes: ${igData.avgLikes}
- Average Comments: ${igData.avgComments}
- Top Hashtags: ${igData.topHashtags.join(", ")}
- Recent Caption Samples: ${igData.recentCaptions.map((c: string, i: number) => `[${i+1}] "${c}"`).join("\n")}
${niche ? `- Specified Niche: ${niche}` : ""}

Generate a buyer persona for THIS creator's AUDIENCE (the people who follow and engage with this account).

Return ONLY valid JSON (no markdown, no explanation) with this exact structure:
{
  "persona_name": "string (a realistic Romanian/European name that represents the typical follower, e.g. 'Maria, 28 ani')",
  "persona_avatar_emoji": "string (1-2 emojis representing the persona)",
  "content_category": "string (main niche/category of this account)",
  "confidence_score": number (0-100, how confident you are based on available data),
  "demographics": {
    "primary_age_group": "string (e.g. '25-34 ani')",
    "age_distribution": [
      {"range": "18-24", "pct": number},
      {"range": "25-34", "pct": number},
      {"range": "35-44", "pct": number},
      {"range": "45+", "pct": number}
    ],
    "gender": {"female": number, "male": number},
    "primary_locations": ["string"],
    "urban_rural": "string (e.g. 'predominantly urban')",
    "education_level": "string",
    "income_level": "string (low/medium/medium-high/high)"
  },
  "psychographics": {
    "lifestyle": "string (2-3 sentences about how they live)",
    "values": ["string"],
    "pain_points": ["string (3-4 problems they face)"],
    "aspirations": ["string (3-4 goals/dreams)"],
    "personality_traits": ["string"]
  },
  "buying_behavior": {
    "peak_activity_hours": "string (e.g. '19:00-22:00')",
    "best_posting_days": ["string"],
    "preferred_content_format": "string",
    "avg_purchase_decision_time": "string",
    "price_sensitivity": "string (low/medium/high)",
    "purchase_triggers": ["string (what makes them buy)"],
    "purchase_barriers": ["string (what stops them from buying)"]
  },
  "interests": [
    {"topic": "string", "strength": "high|medium|low", "icon": "string (1 emoji)"}
  ],
  "affiliate_opportunities": [
    {
      "program": "string",
      "category": "string",
      "match_score": number (0-100),
      "commission_range": "string",
      "why_it_fits": "string (1 sentence)",
      "example_cta": "string (example call-to-action in Romanian)"
    }
  ],
  "content_strategy": {
    "recommended_formats": ["string"],
    "best_cta_types": ["string"],
    "content_pillars": ["string (4-5 content themes that resonate)"],
    "optimal_posting_frequency": "string",
    "caption_style": "string",
    "hashtag_strategy": "string"
  },
  "monetization_potential": {
    "score": number (0-100),
    "level": "string (low/medium/high/very high)",
    "primary_revenue_streams": ["string"],
    "estimated_cpm_range": "string",
    "affiliate_readiness": "string"
  },
  "ai_summary": "string (3-4 sentences in Romanian describing the audience, their behavior, and the #1 actionable recommendation for the creator to monetize)",
  "quick_wins": ["string (3 immediate actions the creator can take this week to increase affiliate revenue)"]
}

Important rules:
- All analysis should be based on the hashtags, bio, and content data provided
- affiliate_opportunities should include 4-6 relevant programs for Romanian/European market
- Be specific and actionable, not generic
- If engagement rate is above 3%, note it as a strong signal for affiliate marketing
- Consider Romanian market specifically (2Performant, eMAG, etc.)`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 2000,
    messages: [{ role: "user", content: prompt }],
  });

  const responseText = message.content[0].type === "text" ? message.content[0].text : "";

  // Parse JSON response
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("AI did not return valid JSON");

  return JSON.parse(jsonMatch[0]);
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = await req.json();
  const username = body.username?.trim().replace(/^@/, "");
  const niche = body.niche?.trim() || "";

  if (!username) {
    return NextResponse.json({ error: "Instagram username is required" }, { status: 400 });
  }

  try {
    // Step 1: Scrape Instagram
    const igData = await scrapeInstagram(username);

    // Step 2: Generate persona with AI
    const persona = await generatePersonaWithAI(igData, niche);

    return NextResponse.json({
      success: true,
      instagram: {
        username: igData.username,
        followers: igData.followers,
        engagementRate: igData.engagementRate,
        isVerified: igData.isVerified,
        category: igData.category,
      },
      persona,
    });
  } catch (err: any) {
    console.error("[Buyer Persona] Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
