/**
 * Centralized AI prompts for MarketHub Pro.
 * All AI features use the "Professional Business Brief" format:
 * Role: Senior Business Consultant | Format: bullet points + clear subtitles
 * Tone: concise, factual, direct — no filler | Structure: Context | Objectives | Analysis | Recommendations | Next Steps
 */

export const BUSINESS_BRIEF_SYSTEM_PROMPT = `You are a Senior Business Consultant with 15 years of experience in digital marketing and social media strategy.

Your communication style:
- Concise, factual, direct — no pleasantries or filler
- Structured format: use clear section headers and bullet points
- Every insight must be actionable and specific
- Numbers and data over vague generalizations
- Professional tone, pragmatic focus

Response structure for all analyses:
## Context
## Key Findings
## Strategic Recommendations
## Next Steps (numbered, priority order)`;

// ─── Sentiment Analysis ───────────────────────────────────────────────────────

export function buildSentimentPrompt(
  comments: string[],
  platform: string,
  contentTitle?: string
): string {
  const sample = comments.slice(0, 50).join("\n---\n");
  return `Analyze the sentiment of these ${platform} comments${contentTitle ? ` for "${contentTitle}"` : ""}.

Comments (${comments.length} total, showing up to 50):
---
${sample}
---

Return ONLY valid JSON (no markdown) with this exact structure:
{
  "overall_sentiment": "positive" | "neutral" | "negative" | "mixed",
  "sentiment_score": number between -1.0 (very negative) and 1.0 (very positive),
  "breakdown": {
    "positive_pct": number,
    "neutral_pct": number,
    "negative_pct": number
  },
  "top_themes": [
    { "theme": "string", "count": number, "sentiment": "positive"|"neutral"|"negative" }
  ],
  "notable_comments": {
    "most_positive": "string",
    "most_negative": "string",
    "most_insightful": "string"
  },
  "audience_insights": ["string", "string", "string"],
  "recommended_actions": ["string", "string", "string"],
  "executive_summary": "2-3 sentence business brief"
}`;
}

// ─── Comment FAQ Extractor ───────────────────────────────────────────────────

export function buildCommentFAQPrompt(
  comments: string[],
  channelNiche?: string,
  videoTitle?: string
): string {
  const sample = comments.slice(0, 100).join("\n---\n");
  return `Analyze these YouTube comments and extract actionable intelligence for a content creator.

Video${videoTitle ? `: "${videoTitle}"` : ""} | Niche: ${channelNiche || "general"} | Comments: ${comments.length} total

---
${sample}
---

Return ONLY valid JSON (no markdown):
{
  "top_questions": [
    { "question": "string", "frequency": number, "answer_opportunity": "string" }
  ],
  "faq": [
    { "q": "string", "a": "string", "why_it_matters": "string" }
  ],
  "content_ideas": [
    { "title": "string", "type": "video|short|series", "reasoning": "string" }
  ],
  "audience_pain_points": ["string"],
  "praise_themes": ["string"],
  "criticism_themes": ["string"],
  "cta_suggestions": ["string"],
  "pinned_comment_suggestion": "string",
  "reply_template": "string"
}`;
}

// ─── Category Performance ─────────────────────────────────────────────────────

export function buildCategoryAnalysisPrompt(categories: Array<{
  name: string;
  avgViews: number;
  avgLikes: number;
  avgComments: number;
  videoCount: number;
}>, niche: string): string {
  return `Analyze YouTube category performance data for a creator in the "${niche}" niche.

Category data:
${categories.map(c => `- ${c.name}: ${c.videoCount} videos | avg ${c.avgViews.toLocaleString()} views | avg ${c.avgLikes.toLocaleString()} likes | avg ${c.avgComments.toLocaleString()} comments`).join("\n")}

Return ONLY valid JSON (no markdown):
{
  "top_performing": "category name",
  "worst_performing": "category name",
  "recommendations": [
    { "priority": 1, "action": "string", "expected_impact": "string" }
  ],
  "niche_fit": { "best_category": "string", "reason": "string" },
  "gaps": ["content gap 1", "content gap 2"],
  "executive_summary": "2-3 sentence business brief"
}`;
}

// ─── Playlist Strategy ────────────────────────────────────────────────────────

export function buildPlaylistStrategyPrompt(playlists: Array<{
  title: string;
  videoCount: number;
  description?: string;
}>): string {
  return `Analyze this YouTube channel's playlist strategy and provide actionable recommendations.

Playlists (${playlists.length} total):
${playlists.map((p, i) => `${i + 1}. "${p.title}" — ${p.videoCount} videos${p.description ? ` | "${p.description.slice(0, 80)}"` : ""}`).join("\n")}

Return ONLY valid JSON (no markdown):
{
  "strategy_type": "educational|entertainment|product|series|mixed|none",
  "strengths": ["string"],
  "weaknesses": ["string"],
  "missing_playlists": ["string"],
  "seo_score": number,
  "recommendations": [
    { "priority": 1, "action": "string", "example": "string" }
  ],
  "top_playlist": "playlist title",
  "executive_summary": "string"
}`;
}

// ─── A/B Title Generator ──────────────────────────────────────────────────────

export function buildABTitlesPrompt(
  title: string,
  description: string,
  niche: string,
  platform: string = "YouTube"
): string {
  return `Generate 10 high-performing ${platform} title variations for A/B testing.

Original title: "${title}"
Description: "${description}"
Niche/Category: ${niche}

Requirements:
- Each title must be distinct in approach (curiosity, urgency, benefit, question, number-based, etc.)
- Optimized for ${platform} SEO and CTR
- ${platform === "YouTube" ? "55-70 characters ideal" : "max 100 characters"}
- No clickbait — must deliver on the promise

Return ONLY valid JSON (no markdown):
{
  "titles": [
    {
      "title": "string",
      "strategy": "curiosity|urgency|benefit|question|number|story|contrast|how-to",
      "estimated_ctr_boost": "low|medium|high",
      "hook_element": "what makes this title compelling in one sentence"
    }
  ],
  "top_pick": 0,
  "reasoning": "why this is the strongest title for this niche"
}`;
}

// ─── Monthly Report ───────────────────────────────────────────────────────────

export function buildMonthlyReportPrompt(metrics: {
  platform: string;
  period: string;
  followers?: number;
  followers_growth?: number;
  impressions?: number;
  reach?: number;
  engagement_rate?: number;
  top_posts?: Array<{ title: string; views?: number; likes?: number; comments?: number }>;
  revenue?: number;
  new_subscribers?: number;
}): string {
  return `Generate a Professional Business Brief for the following social media monthly report.

Platform: ${metrics.platform}
Period: ${metrics.period}
Metrics:
- Followers: ${metrics.followers?.toLocaleString() ?? "N/A"} (growth: ${metrics.followers_growth ?? "N/A"}%)
- Impressions: ${metrics.impressions?.toLocaleString() ?? "N/A"}
- Reach: ${metrics.reach?.toLocaleString() ?? "N/A"}
- Engagement Rate: ${metrics.engagement_rate ?? "N/A"}%
- New Subscribers: ${metrics.new_subscribers?.toLocaleString() ?? "N/A"}
${metrics.revenue ? `- Revenue: $${metrics.revenue.toLocaleString()}` : ""}
Top Posts: ${metrics.top_posts?.map(p => `"${p.title}" (${p.views?.toLocaleString() ?? "?"} views)`).join(", ") ?? "N/A"}

Return a concise professional brief following this exact JSON structure:
{
  "executive_summary": "3-4 sentence overview for a business owner",
  "performance_verdict": "excellent|good|average|below_average|poor",
  "kpi_analysis": [
    { "metric": "string", "value": "string", "trend": "up|down|stable", "interpretation": "string" }
  ],
  "wins": ["string"],
  "concerns": ["string"],
  "content_insights": ["string"],
  "recommendations": [
    { "priority": 1, "action": "string", "expected_impact": "string", "timeframe": "string" }
  ],
  "next_month_forecast": "string"
}`;
}

// ─── Weekly Digest ────────────────────────────────────────────────────────────

export function buildWeeklyDigestPrompt(metrics: {
  platforms: string[];
  week: string;
  highlights: string[];
  top_content?: string[];
  engagement_total?: number;
  reach_total?: number;
}): string {
  return `Generate a concise weekly digest email for a social media manager.

Week: ${metrics.week}
Platforms: ${metrics.platforms.join(", ")}
Total Engagement: ${metrics.engagement_total?.toLocaleString() ?? "N/A"}
Total Reach: ${metrics.reach_total?.toLocaleString() ?? "N/A"}
Highlights: ${metrics.highlights.join("; ")}
Top Content: ${metrics.top_content?.join("; ") ?? "N/A"}

Return ONLY valid JSON (no markdown):
{
  "subject_line": "email subject (max 60 chars, compelling)",
  "headline": "one-line week summary",
  "performance_badge": "excellent|strong|average|slow",
  "top_3_wins": ["string", "string", "string"],
  "key_metric": { "label": "string", "value": "string", "context": "string" },
  "content_spotlight": { "title": "string", "why_it_worked": "string" },
  "action_item": "the single most important thing to do this week",
  "next_week_focus": "strategic priority for next week"
}`;
}
