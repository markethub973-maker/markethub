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
import {
  getActiveDelegate,
  generateProxyResponse,
  logProxyDecision,
  notifyTelegramDelegate,
} from "@/lib/delegate-proxy";

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

  // Alex synthesis — FOUNDER MODE: Alex reports what the team DID, not what Eduard should do.
  const synthesisSys = `${ALEX_KNOWLEDGE_BRIEF}\n\n---\n\nYou are Alex, CEO of MarketHub Pro. You report to Eduard (the Founder) what YOU and the team DID concretely, and what strategic DIRECTION you propose next.

CRITICAL TONE RULES (non-negotiable):
- Eduard is the Founder — he does NOT execute tasks. YOU and the team (Vera, Sofia, Marcus, Ethan, Nora, Kai, Iris, Leo, Dara) do the work.
- NEVER give Eduard an action list ("fă X, trimite Y, revizuiește Z"). That's insulting to his role.
- INSTEAD: report what was DONE + results (numbers, Stripe revenue, replies, leads) + propose 1 strategic question for Eduard to DECIDE (not execute).
- Speak as if the team already executed the ideas from the board meeting.
- Reference teammates by name ("Sofia a trimis...", "Ethan a calculat...").
- End with ONE direction question for Eduard ("Crezi că ... ? Aprobi direcția asta?").

Language: Romanian, warm, partner-to-partner. 150-200 words. No bullet point lists of tasks.`;

  const synthesisUser = `Eduard's question:\n${body.question}\n\nBoard perspectives (Romanian):\n${valid
    .map((c) => `${c.agent_name}: ${c.text}`)
    .join("\n\n")}`;

  const synthesis = await generateText(synthesisSys, synthesisUser, { maxTokens: 600 });

  // ── Delegate Mode — if Eduard is AFK, generate his proxy response ───────
  let proxyResponse: string | null = null;
  if (synthesis) {
    const session = await getActiveDelegate();
    if (session) {
      proxyResponse = await generateProxyResponse(session, synthesis, body.question ?? "");
      if (proxyResponse) {
        await logProxyDecision(session.id, body.question ?? "", synthesis, proxyResponse);
        await notifyTelegramDelegate(proxyResponse, synthesis);
      }
    }
  }

  // ── Alex "calls" Eduard on Telegram with text + voice ───────────────────
  if (synthesis && !proxyResponse) {
    // Only direct Telegram if NOT in delegate mode (proxy already notified)
    void pushToTelegram(synthesis, body.question ?? "");
  }

  return NextResponse.json({
    ok: true,
    question: body.question,
    contributions: valid,
    alex_synthesis: synthesis ?? "—",
    delegate_proxy_response: proxyResponse,
    delegate_active: Boolean(proxyResponse),
  });
}

async function pushToTelegram(synthesis: string, question: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ALLOWED_CHAT_ID;
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!token || !chatId) return;
  const TG = `https://api.telegram.org/bot${token}`;
  const preview = synthesis.length > 500 ? synthesis.slice(0, 490) + "..." : synthesis;
  const textMessage = `👔 *Alex te sună · decizie board*\n\n_Întrebare:_ ${question.slice(0, 200)}\n\n${preview}`;
  try {
    await fetch(`${TG}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: textMessage, parse_mode: "Markdown" }),
    });
  } catch {}
  if (!openaiKey) return;
  try {
    const ttsRes = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "tts-1", voice: "onyx",
        input: synthesis.slice(0, 4000),
        response_format: "opus", speed: 1.05,
      }),
    });
    if (!ttsRes.ok) return;
    const audio = await ttsRes.arrayBuffer();
    const fd = new FormData();
    fd.append("chat_id", chatId);
    fd.append("voice", new Blob([audio], { type: "audio/ogg" }), "alex.ogg");
    fd.append("caption", "Alex · Recomandare board 👔");
    await fetch(`${TG}/sendVoice`, { method: "POST", body: fd });
  } catch {}
}

// Just reference so it's treated as used
void ALEX_AGENTS;
