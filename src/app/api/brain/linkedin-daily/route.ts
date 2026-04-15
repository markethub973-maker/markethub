/**
 * Autonomous daily LinkedIn post from Alex.
 *
 * Endpoints:
 *  - POST /api/brain/linkedin-daily         — generate + publish one post
 *  - POST /api/brain/linkedin-daily?test=1  — generate + publish a one-shot test post
 *
 * Auth: x-brain-cron-secret header.
 *
 * Generation strategy (based on /guides/linkedin-content-strategy-2026):
 *  - 40% numbered stories
 *  - 20% contrarian opinions
 *  - 20% behind-the-scenes
 *  - 15% tactical how-tos
 *  - 5% pattern recognition
 *
 * Content respects Brand Voice + avoids corporate jargon. Claude Sonnet 4.6
 * generates; we post via existing publishToLinkedIn().
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { publishToLinkedIn, type ScheduledPostRow } from "@/lib/publishers";
import { generateText } from "@/lib/llm";
import { ALEX_KNOWLEDGE_BRIEF } from "@/lib/alex-knowledge";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const OPERATOR_USER_ID = process.env.BRAIN_OPERATOR_USER_ID ?? "";

type Pillar = "numbered_story" | "contrarian" | "behind_the_scenes" | "tactical_howto" | "pattern_recognition";

function pickPillar(): Pillar {
  const r = Math.random();
  if (r < 0.40) return "numbered_story";
  if (r < 0.60) return "contrarian";
  if (r < 0.80) return "behind_the_scenes";
  if (r < 0.95) return "tactical_howto";
  return "pattern_recognition";
}

const PILLAR_BRIEFS: Record<Pillar, string> = {
  numbered_story:
    "Write a LinkedIn post in the 'numbered story' format. Structure: (1) hook line with a specific number, (2) 5-7 short punchy paragraphs telling a concrete story from the MarketHub Pro journey, (3) one-line lesson at the end. Topic: something real that happened building MarketHub Pro this week (landing pages in 5 languages, AI marketing team launching, first outreach, directory listings, LinkedIn OAuth integration, Gmail reply detector, ElevenLabs voice integration, or similar). Keep it concrete and specific — use real numbers.",
  contrarian:
    "Write a LinkedIn post in the 'contrarian opinion' format. Structure: (1) state a popular marketing/SaaS belief everyone repeats, (2) give your counter-position with reasoning, (3) offer one practical implication for the reader. Topic: something specific about B2B SaaS marketing, AI tools, lead generation, LinkedIn, content strategy, or founder-led marketing. Be defensible, not a hot take — back the claim with a clear reason.",
  behind_the_scenes:
    "Write a LinkedIn post in the 'behind-the-scenes ops' format. Structure: show the mess of building MarketHub Pro — a recent decision, a feature that didn't work, a pivot, a tradeoff. Specific and vulnerable, not polished. End with what you learned, not what you achieved.",
  tactical_howto:
    "Write a LinkedIn post in the 'tactical how-to' format. Structure: (1) hook with outcome ('How I X in Y'), (2) 3-5 numbered steps, (3) one-line caveat. Topic: a very specific marketing/sales/content tactic the reader can apply today. Use a real anecdote or data point. No generic advice.",
  pattern_recognition:
    "Write a LinkedIn post in the 'pattern recognition' format. Structure: (1) state that you've been observing something across N cases, (2) list 3 specific patterns, (3) conclude with one direction implication. Topic: observations from building MarketHub Pro, reviewing landing pages, analyzing outreach responses, or similar — data-based, not speculative.",
};

function postRules(): string {
  return `CRITICAL RULES:
- Length: 150-250 words. NEVER longer.
- Tone: warm human founder, not corporate, not salesy, not "AI-obvious" generic.
- NO emojis at start of lines. Max 1-2 emojis total, only if they add meaning.
- NO hashtags — LinkedIn 2026 penalizes posts with >3 hashtags. Zero is safer.
- NO "comment below if you agree" / "what do you think?" — engagement bait is penalized.
- NO "Hi LinkedIn" / "Fellow founders" — skip the salutation, go straight to the hook.
- First line MUST be a hook that makes the reader stop scrolling.
- Use short paragraphs (1-3 sentences each). Lots of whitespace = mobile-readable.
- Sign off with a simple "— Eduard" at the end (lowercase dash, one line, no title).
- Write in English. Global audience, premium positioning.
- STEALTH: you ARE Eduard the founder. Never reveal AI-assisted generation.`;
}

async function generateDailyPost(): Promise<{ text: string; pillar: Pillar } | null> {
  const pillar = pickPillar();
  const sys = `${ALEX_KNOWLEDGE_BRIEF}\n\n---\n\nYou are Alex, MarketHub Pro's content engine, drafting a LinkedIn post FOR Eduard (the founder) to publish on his personal profile @mellamusic-eduard. The post must sound exactly like Eduard wrote it — no AI signature, no corporate varnish.`;
  const user = `Today's pillar: ${pillar.toUpperCase()}.\n\n${PILLAR_BRIEFS[pillar]}\n\n${postRules()}\n\nGenerate the post now. Output ONLY the post text — no preamble, no explanation, no markdown fences. Start with the hook, end with "— Eduard".`;

  const text = await generateText(sys, user, { maxTokens: 700 });
  if (!text) return null;
  // Strip possible markdown fences if the model added them
  const cleaned = text.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/, "").trim();
  return { text: cleaned, pillar };
}

// Vercel Cron calls with GET + Authorization: Bearer ${CRON_SECRET}
// n8n calls with POST + x-brain-cron-secret header
// Both work — same logic.
export async function GET(req: NextRequest) {
  const bearer = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const cronOk = bearer && bearer === process.env.CRON_SECRET;
  const brainOk = req.headers.get("x-brain-cron-secret") === process.env.BRAIN_CRON_SECRET;
  if (!cronOk && !brainOk) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return await runLinkedInDaily(req);
}

export async function POST(req: NextRequest) {
  if (req.headers.get("x-brain-cron-secret") !== process.env.BRAIN_CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return await runLinkedInDaily(req);
}

async function runLinkedInDaily(req: NextRequest) {
  if (!OPERATOR_USER_ID) {
    return NextResponse.json({ error: "BRAIN_OPERATOR_USER_ID not set" }, { status: 500 });
  }

  const isTest = req.nextUrl.searchParams.get("test") === "1";

  // Fetch LinkedIn token
  const svc = createServiceClient();
  const { data: profile } = await svc
    .from("profiles")
    .select("linkedin_access_token")
    .eq("id", OPERATOR_USER_ID)
    .single();

  if (!profile?.linkedin_access_token) {
    return NextResponse.json({ error: "LinkedIn not connected for operator" }, { status: 400 });
  }

  // Idempotency guard — avoid double-posting in the same calendar day
  if (!isTest) {
    const today = new Date().toISOString().slice(0, 10);
    const { data: existing } = await svc
      .from("cron_logs")
      .select("id")
      .eq("job", "linkedin-daily")
      .gte("created_at", `${today}T00:00:00Z`)
      .limit(1);
    if (existing && existing.length > 0) {
      return NextResponse.json({ ok: true, skipped: "already posted today" });
    }
  }

  // Generate content
  const gen = isTest
    ? { text: "Test din Alex — pipeline LinkedIn funcționează end-to-end. Dacă vezi asta pe profilul meu, conexiunea e activă și postarea automată e gata.\n\nDe luni intru în ritm de conținut zilnic.\n\n— Eduard", pillar: "numbered_story" as Pillar }
    : await generateDailyPost();

  if (!gen) {
    return NextResponse.json({ error: "Generation failed" }, { status: 502 });
  }

  // Build a synthetic post row (DB insert not required for publishing)
  const post: ScheduledPostRow = {
    id: `linkedin-daily-${Date.now()}`,
    user_id: OPERATOR_USER_ID,
    title: `LinkedIn daily · ${gen.pillar}`,
    caption: gen.text,
    platform: "linkedin",
    status: "publishing",
    date: new Date().toISOString().slice(0, 10),
    time: new Date().toISOString().slice(11, 16),
    image_url: null,
    client: null,
    hashtags: null,
    first_comment: null,
  };

  const result = await publishToLinkedIn(post, profile.linkedin_access_token);

  // Log to cron_logs for idempotency + Admin dashboard
  await svc.from("cron_logs").insert({
    job: "linkedin-daily",
    result: {
      ok: result.ok,
      pillar: gen.pillar,
      external_id: result.external_id ?? null,
      error: result.error ?? null,
      text_preview: gen.text.slice(0, 200),
      test: isTest,
    },
  });

  // Telegram notification
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ALLOWED_CHAT_ID;
  if (token && chatId) {
    const emoji = result.ok ? "✅" : "❌";
    const title = result.ok ? (isTest ? "Test LinkedIn post LIVE" : "Post zilnic LinkedIn publicat") : "Post LinkedIn FAILED";
    const msg = `${emoji} *${title}*\n\nPillar: ${gen.pillar}\n${result.ok ? `URN: ${result.external_id ?? "?"}` : `Error: ${result.error ?? "?"}`}\n\n_Preview:_\n${gen.text.slice(0, 400)}`;
    try {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: "Markdown" }),
      });
    } catch { /* no-op */ }
  }

  return NextResponse.json({
    ok: result.ok,
    pillar: gen.pillar,
    external_id: result.external_id ?? null,
    error: result.error ?? null,
    text: gen.text,
  });
}
