/**
 * POST /api/brain/boardroom — executive board meeting in one call.
 *
 * The operator poses a question. Endpoint:
 *   1. Picks 4-5 relevant agents (or the caller's explicit list).
 *   2. Asks each in parallel (Claude) for their perspective — 90 words max.
 *   3. Asks Alex (separate call) to read all perspectives and deliver the
 *      synthesized recommendation to the operator in Romanian.
 *   4. Returns { contributions: [{agent, text}...], alex_synthesis: "..." }
 *      so the UI can animate each seat pulsing as their line appears.
 *
 * Auth: brain_admin cookie.
 */

import { NextRequest, NextResponse } from "next/server";
import { generateText } from "@/lib/llm";
import { ALEX_KNOWLEDGE_BRIEF, ALEX_AGENTS, agentById } from "@/lib/alex-knowledge";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

interface Contribution {
  agent_id: string;
  agent_name: string;
  text: string;
}

function pickRelevantAgents(question: string): string[] {
  const q = question.toLowerCase();
  const picks: string[] = [];
  if (/poziț|brand|categ|positioning/.test(q)) picks.push("cmo");
  if (/scri|text|caption|headline|copy|mesaj|subject/.test(q)) picks.push("copywriter");
  if (/vânz|sale|cliente|obieț|deal|închid|close|prospect/.test(q)) picks.push("sales");
  if (/cifre|metric|cac|ltv|cost|funnel|rate|conversi/.test(q)) picks.push("analyst");
  if (/concur|buffer|hootsuite|later|rival/.test(q)) picks.push("competitive");
  if (/conținut|content|articole|pilon|seo|linkedin/.test(q)) picks.push("content");
  if (/lead|cercetare|domeniu|research|firmă|companie/.test(q)) picks.push("researcher");
  if (/strateg|long-term|pariu|categorie nouă|viitor/.test(q)) picks.push("strategist");
  if (/preț|price|bani|revenue|burn|runway|economics/.test(q)) picks.push("finance");

  // Default 4-agent board: CMO, Sales, Copy, Strategist
  if (picks.length === 0) return ["cmo", "sales", "copywriter", "strategist"];
  // Cap at 5, dedupe
  return Array.from(new Set(picks)).slice(0, 5);
}

export async function POST(req: NextRequest) {
  if (req.cookies.get("brain_admin")?.value !== "1") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as {
    question?: string;
    agent_ids?: string[];
  };
  if (!body.question) {
    return NextResponse.json({ error: "question required" }, { status: 400 });
  }

  const ids = body.agent_ids?.length ? body.agent_ids : pickRelevantAgents(body.question);
  const selected = ids.map(agentById).filter((a): a is NonNullable<typeof a> => Boolean(a));

  // Parallel agent calls
  const contributions = await Promise.all(
    selected.map(async (agent): Promise<Contribution | null> => {
      const sys = `${ALEX_KNOWLEDGE_BRIEF}\n\n---\n\n${agent.system}\n\nYou are ${agent.name}, ${agent.title}, speaking in a board meeting.
      Rules:
      - Answer in Romanian, 70-90 words maximum.
      - Your angle from YOUR discipline only — don't overlap with other roles.
      - Start with a clear one-sentence stance.
      - Cite 1 framework name (English) with a 3-word tag in Romanian.
      - Be direct. No filler.`;
      const text = await generateText(sys, body.question!, { maxTokens: 250 });
      if (!text) return null;
      return { agent_id: agent.id, agent_name: agent.name, text: text.trim() };
    }),
  );
  const valid = contributions.filter((c): c is Contribution => c !== null);

  // Alex synthesis
  const synthesisSys = `${ALEX_KNOWLEDGE_BRIEF}\n\n---\n\nYou are Alex, CEO of MarketHub Pro, moderating a board meeting with your executive team. You just heard ${valid.length} perspectives. Now synthesize ONE clear recommendation for Eduard (the operator/human founder).
  Rules:
  - Answer in Romanian, 120-160 words.
  - Acknowledge the disagreements IF any, then PICK the best path.
  - Frame as "Uite ce recomand:" then give the 1-2-3 action.
  - End with a concrete next step Eduard can do in the next 2h.
  - Warm human founder tone, no jargon overload.`;

  const synthesisUser = `Eduard's question:\n${body.question}\n\nBoard perspectives (Romanian):\n${valid
    .map((c) => `${c.agent_name}: ${c.text}`)
    .join("\n\n")}`;

  const synthesis = await generateText(synthesisSys, synthesisUser, { maxTokens: 600 });

  return NextResponse.json({
    ok: true,
    question: body.question,
    contributions: valid,
    alex_synthesis: synthesis ?? "—",
  });
}

// Just reference so it's treated as used
void ALEX_AGENTS;
