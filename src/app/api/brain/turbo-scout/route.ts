/**
 * GET /api/brain/turbo-scout — daily autonomous self-improvement scan.
 *
 * Per TURBO SYSTEM Rule #1 (Eduard's directive): every day the team scouts
 *   1. A new technology/API/service worth evaluating
 *   2. A new monetization angle
 *   3. A pattern from best-in-class competitors
 *
 * Results written to brain_knowledge_base + pushed to Telegram as morning
 * briefing addition.
 *
 * Auth: x-brain-cron-secret. Runs daily at 06:45 UTC via Vercel cron.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { generateJson } from "@/lib/llm";
import { ALEX_KNOWLEDGE_BRIEF } from "@/lib/alex-knowledge";
import { startActivity, completeActivity } from "@/lib/agent-activity";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

interface TurboScoutResult {
  tech_scout: {
    name: string;
    category: string;
    why_now: string;
    potential_impact: string;
    implementation_effort: "low" | "medium" | "high";
    priority_score: number;
  };
  revenue_angle: {
    name: string;
    model: string;
    target_segment: string;
    estimated_mrr_unlock: string;
    rationale: string;
  };
  competitor_pattern: {
    competitor: string;
    what_they_do: string;
    why_it_works: string;
    how_we_could_apply: string;
  };
  priority_action_this_week: string;
}

export async function GET(req: NextRequest) {
  if (req.headers.get("x-brain-cron-secret") !== process.env.BRAIN_CRON_SECRET &&
      !(req.headers.get("authorization") ?? "").includes(process.env.CRON_SECRET ?? "_NOTSET_")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const svc = createServiceClient();
  const today = new Date().toISOString().slice(0, 10);

  // Idempotency — one scout per calendar day
  const { data: existing } = await svc
    .from("cron_logs")
    .select("id")
    .eq("job", "turbo-scout")
    .gte("created_at", `${today}T00:00:00Z`)
    .limit(1);
  if (existing && existing.length > 0) {
    return NextResponse.json({ ok: true, skipped: "already scouted today" });
  }

  // Kai + Leo both pulse during scout
  const activityLeo = await startActivity("strategist", "Leo scoutează tehnologii + revenue angles");

  // Pull recent knowledge base entries to avoid repeating
  const { data: recentKb } = await svc
    .from("brain_knowledge_base")
    .select("name")
    .order("created_at", { ascending: false })
    .limit(20);
  const knownNames = (recentKb ?? []).map((r) => r.name).join(", ");

  // Pull top competitors from memory
  const competitors = [
    "Buffer", "Hootsuite", "Later", "Jasper", "Copy.ai", "Apollo.io",
    "HubSpot Marketing Hub", "Mailchimp", "ConvertKit", "Lemlist",
  ];

  const sys = `${ALEX_KNOWLEDGE_BRIEF}

---

You are Leo (Strategist) running TURBO daily scout per Eduard's Rule #1.

Your job right now:
1. Identify ONE new technology/API/service launched or gaining traction in 2025-2026 that would give MarketHub Pro a concrete advantage. Focus on AI, content, marketing automation, vector search, LLM infra, or mediation/matching engines. Don't repeat things already in our stack (Next.js, Supabase, Vercel, Claude, OpenAI, Resend, Stripe, Fal.ai, ElevenLabs, Apify).
2. Identify ONE new monetization angle (affiliate scheme, data product, white-label tier, mediation fee structure) that could generate €500-5000 MRR on top of current SaaS+DFY model.
3. Study ONE specific move from a top competitor (pick from: ${competitors.join(", ")}) — describe WHAT they do, WHY it works for them, HOW we could adapt it.
4. Conclude with THE priority action for this week given all 3.

Already scouted (don't repeat): ${knownNames}

OUTPUT STRICT JSON with these EXACT keys:
{
  "tech_scout": {"name":"","category":"","why_now":"","potential_impact":"","implementation_effort":"low|medium|high","priority_score":0-10},
  "revenue_angle": {"name":"","model":"","target_segment":"","estimated_mrr_unlock":"€X-Y/mo","rationale":""},
  "competitor_pattern": {"competitor":"","what_they_do":"","why_it_works":"","how_we_could_apply":""},
  "priority_action_this_week": "ONE concrete action, max 30 words"
}`;

  const user = `Today is ${today}. Run the daily TURBO scout now.`;
  let result: TurboScoutResult | null = null;
  try {
    result = await generateJson<TurboScoutResult>(sys, user, { maxTokens: 2000 });
  } catch { /* fall through */ }

  if (!result) {
    await completeActivity(activityLeo, "Leo: scout returned empty", { ok: false });
    return NextResponse.json({ error: "scout failed" }, { status: 502 });
  }

  // Persist findings to knowledge base
  try {
    await svc.from("brain_knowledge_base").insert([
      {
        category: "case_study",
        name: `Tech scout · ${result.tech_scout.name}`,
        summary: result.tech_scout.why_now,
        content: result.tech_scout as unknown as Record<string, unknown>,
        tags: ["turbo-scout", "tech", today],
        source: `turbo-scout ${today}`,
        confidence: Math.max(0.1, Math.min(1.0, (result.tech_scout.priority_score ?? 5) / 10)),
      },
      {
        category: "pattern",
        name: `Revenue angle · ${result.revenue_angle.name}`,
        summary: result.revenue_angle.rationale,
        content: result.revenue_angle as unknown as Record<string, unknown>,
        tags: ["turbo-scout", "revenue", today],
        source: `turbo-scout ${today}`,
        confidence: 0.75,
      },
      {
        category: "case_study",
        name: `Competitor pattern · ${result.competitor_pattern.competitor}`,
        summary: result.competitor_pattern.what_they_do,
        content: result.competitor_pattern as unknown as Record<string, unknown>,
        tags: ["turbo-scout", "competitor", result.competitor_pattern.competitor.toLowerCase().replace(/\s/g, "-"), today],
        source: `turbo-scout ${today}`,
        confidence: 0.8,
      },
    ]);
  } catch { /* non-fatal */ }

  await svc.from("cron_logs").insert({
    job: "turbo-scout",
    result: {
      tech: result.tech_scout.name,
      revenue: result.revenue_angle.name,
      competitor: result.competitor_pattern.competitor,
      priority: result.priority_action_this_week,
    },
  });

  await completeActivity(activityLeo, `Leo: scout complete · tech=${result.tech_scout.name} · revenue=${result.revenue_angle.name}`, { ok: true });

  // Push concise brief to Telegram
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ALLOWED_CHAT_ID;
  if (token && chatId) {
    const msg = `🔎 *TURBO Scout · ${today}*\n\n⚡ *Tech*: ${result.tech_scout.name} (prio ${result.tech_scout.priority_score}/10, ${result.tech_scout.implementation_effort})\n_${result.tech_scout.potential_impact.slice(0, 200)}_\n\n💰 *Revenue angle*: ${result.revenue_angle.name}\n_${result.revenue_angle.estimated_mrr_unlock} · ${result.revenue_angle.rationale.slice(0, 180)}_\n\n👁 *Competitor*: ${result.competitor_pattern.competitor}\n_${result.competitor_pattern.how_we_could_apply.slice(0, 180)}_\n\n🎯 *Priority this week*: ${result.priority_action_this_week}`;
    try {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: "Markdown" }),
      });
    } catch { /* no-op */ }
  }

  return NextResponse.json({ ok: true, scout: result });
}
