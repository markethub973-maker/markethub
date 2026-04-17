/**
 * POST /api/ai/content-gap — given a set of competitor post captions
 * and a set of the user's own past post captions, identify topic
 * clusters the competitors are covering that the user hasn't touched
 * (their "content gaps" for the nişă).
 *
 * Returns ranked gaps with:
 *   - topic cluster label
 *   - why it matters (audience pain / signal)
 *   - 2-3 concrete post angles the user could write immediately
 */

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { buildBrandVoicePrompt } from "@/lib/brandVoice";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const HAIKU = "claude-haiku-4-5-20251001";

export async function POST(req: NextRequest) {
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    competitor_captions?: string[];
    my_captions?: string[];
    niche?: string;
    client_id?: string;
  } | null;

  if (!Array.isArray(body?.competitor_captions) || body.competitor_captions.length < 3) {
    return NextResponse.json({ error: "Need at least 3 competitor captions" }, { status: 400 });
  }
  if (!Array.isArray(body.my_captions) || body.my_captions.length < 1) {
    return NextResponse.json({ error: "Need at least 1 of your own captions" }, { status: 400 });
  }

  // Trim long captions to keep the prompt under budget
  const compText = body.competitor_captions
    .map((c) => (typeof c === "string" ? c.trim().slice(0, 400) : ""))
    .filter((c) => c.length > 5)
    .slice(0, 30)
    .map((c, i) => `[C${i + 1}] ${c}`)
    .join("\n\n");
  const myText = body.my_captions
    .map((c) => (typeof c === "string" ? c.trim().slice(0, 400) : ""))
    .filter((c) => c.length > 5)
    .slice(0, 30)
    .map((c, i) => `[M${i + 1}] ${c}`)
    .join("\n\n");

  if (!compText || !myText) {
    return NextResponse.json({ error: "Captions are too short after filtering" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_API_KEY_APP;
  if (!apiKey) return NextResponse.json({ error: "AI not configured" }, { status: 500 });

  const voicePrompt = await buildBrandVoicePrompt(user.id, body?.client_id);

  const system = `You are a content strategist doing a gap analysis between a user and their competitors.

GOAL: surface 3-6 TOPIC CLUSTERS the competitors cover that the user does NOT cover, sorted by strategic importance (audience-signal × novelty-for-the-user).

For each gap, output:
  • cluster_label — 2-5 words (e.g. "AI workflow automation", "Behind-the-scenes client stories")
  • why_it_matters — one sentence on the audience need this signals
  • post_ideas — 2-3 concrete caption-ready post angles the user could write THIS WEEK, each <=120 chars (just the angle/hook, not the full caption)

Output STRICT JSON:
{
  "gaps": [
    {
      "cluster_label": "...",
      "why_it_matters": "...",
      "post_ideas": ["...", "...", "..."]
    }
  ]
}

Rules:
- Only list clusters where competitor coverage is clearly present (2+ posts) AND user coverage is absent or very thin.
- Do NOT invent competitor topics that aren't in the provided captions.
- post_ideas must feel actionable, not abstract ("advisors who stopped chasing templates" not "productivity topics").
- Language: match the dominant language of the captions.${voicePrompt}
${body.niche ? `\nNiche / audience context: ${body.niche.slice(0, 200)}` : ""}`;

  try {
    const anthropic = new Anthropic({ apiKey });
    const r = await anthropic.messages.create({
      model: HAIKU,
      max_tokens: 2000,
      system,
      messages: [
        {
          role: "user",
          content: `COMPETITOR CAPTIONS:\n${compText}\n\n---\n\nMY CAPTIONS:\n${myText}`,
        },
      ],
    });
    const text = r.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("");
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("No JSON in response");
    const parsed = JSON.parse(m[0]) as {
      gaps?: Array<{ cluster_label: string; why_it_matters: string; post_ideas: string[] }>;
    };
    const gaps = (parsed.gaps ?? [])
      .filter((g) => g.cluster_label && g.why_it_matters && Array.isArray(g.post_ideas))
      .map((g) => ({
        cluster_label: g.cluster_label,
        why_it_matters: g.why_it_matters,
        post_ideas: g.post_ideas.slice(0, 3),
      }))
      .slice(0, 6);
    return NextResponse.json({
      ok: true,
      gaps,
      analyzed: { competitors: body.competitor_captions.length, my_posts: body.my_captions.length },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
