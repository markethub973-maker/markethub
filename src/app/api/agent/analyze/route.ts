import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import { requireAuth } from "@/lib/route-helpers";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const user = { id: auth.userId };

  const { goal, steps_results } = await req.json();

  const summary = steps_results.map((s: any, i: number) => {
    const r = s.result;
    if (!r) return `Step ${i + 1} (${s.label}): no data`;

    if (r.places) {
      const withPhone = r.places.filter((p: any) => p.phone).length;
      const withWebsite = r.places.filter((p: any) => p.website).length;
      return `Step ${i + 1} - ${s.label}: Found ${r.total} places on Google Maps. ${withPhone} have phone numbers, ${withWebsite} have websites. Top places: ${r.places.slice(0, 5).map((p: any) => `${p.name} (${p.rating}⭐, ${p.phone || "no phone"})`).join(", ")}`;
    }
    if (r.results) {
      const organic = r.results.filter((x: any) => x.type === "organic").length;
      const ads = r.results.filter((x: any) => x.type === "ad").length;
      const paa = r.results.filter((x: any) => x.type === "paa").length;
      return `Step ${i + 1} - ${s.label}: Google Search found ${organic} organic results, ${ads} ads, ${paa} People Also Ask questions. Top sites: ${r.results.filter((x: any) => x.type === "organic").slice(0, 3).map((x: any) => x.displayedUrl || x.url).join(", ")}`;
    }
    if (r.posts) {
      return `Step ${i + 1} - ${s.label}: Found ${r.total} posts. ${r.profile ? `Profile: @${r.profile.username} with ${r.profile.followers} followers.` : ""} Top engagement: ${r.posts.slice(0, 3).map((p: any) => `${p.likes} likes`).join(", ")}`;
    }
    if (r.videos) {
      return `Step ${i + 1} - ${s.label}: Found ${r.total} TikTok videos. Top plays: ${r.videos.slice(0, 3).map((v: any) => `${v.plays} views by @${v.author}`).join(", ")}`;
    }
    return `Step ${i + 1} - ${s.label}: completed`;
  }).join("\n");

  try {
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      messages: [{
        role: "user",
        content: `You are a marketing analyst. Analyze these research results and provide actionable insights.

Original goal: ${goal}

Research results:
${summary}

Provide a concise analysis in JSON format:
{
  "headline": "one sentence summary of what was found",
  "total_leads": number (estimate of actionable contacts found),
  "quality_score": number 1-10,
  "key_findings": ["finding1", "finding2", "finding3"],
  "top_opportunities": [
    { "name": "business/account name", "reason": "why they are a good prospect", "action": "what to do" }
  ],
  "next_actions": ["action1", "action2", "action3"],
  "message_template": "a short outreach message template they could use"
}

Be specific, practical and adapt to the user's market and language. Return only JSON.`
      }],
    });

    const text = msg.content[0].type === "text" ? msg.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ error: "Parse error" }, { status: 500 });

    return NextResponse.json({ analysis: JSON.parse(jsonMatch[0]) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
