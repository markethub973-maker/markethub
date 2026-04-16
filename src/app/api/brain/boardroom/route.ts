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
import { synthesizeSpeech } from "@/lib/tts";
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
  round: 1 | 2;
  responds_to?: string | null; // agent_id of who they're responding to (round 2)
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
  if (/legal|gdpr|lege|contract|risc|compliance|sancțiuni|tos|drept|penaliz|jurid/i.test(q)) picks.push("legal");

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

  // ─── ROUND 1 ─── Parallel initial perspectives
  const round1 = await Promise.all(
    selected.map(async (agent): Promise<Contribution | null> => {
      const sys = `${ALEX_KNOWLEDGE_BRIEF}\n\n---\n\n${agent.system}\n\nYou are ${agent.name}, ${agent.title}, speaking in a board meeting — this is ROUND 1 (opening statements).
      Rules:
      - Answer in Romanian, 70-90 words maximum.
      - Your angle from YOUR discipline only — don't overlap with other roles.
      - Start with a clear one-sentence stance.
      - Cite 1 framework name (English) with a 3-word tag in Romanian.
      - Be direct. No filler.`;
      const text = await generateText(sys, body.question!, { maxTokens: 250 });
      if (!text) return null;
      return { agent_id: agent.id, agent_name: agent.name, text: text.trim(), round: 1 };
    }),
  );
  const valid1 = round1.filter((c): c is Contribution => c !== null);

  // ─── ROUND 2 ─── Each agent reads the others' Round 1 takes and responds.
  // This creates actual inter-agent dialogue: agreements, challenges, refinements.
  const round1Summary = valid1
    .map((c) => `${c.agent_name} (${agentById(c.agent_id)?.title ?? ""}): ${c.text}`)
    .join("\n\n");

  const round2 = await Promise.all(
    selected.map(async (agent): Promise<Contribution | null> => {
      // Build a list of other agents' contributions this agent will respond to
      const others = valid1.filter((c) => c.agent_id !== agent.id);
      if (others.length === 0) return null;
      const sys = `${ALEX_KNOWLEDGE_BRIEF}\n\n---\n\n${agent.system}\n\nYou are ${agent.name}, ${agent.title}. This is ROUND 2 of a board debate — you have just HEARD the other directors' opening statements and must respond.

RULES:
- Answer in Romanian, 70-100 words maximum.
- You MUST directly reference at least ONE teammate by name and engage with what they said:
  · agree + extend ("Sofia are dreptate, dar adaug că...")
  · disagree + explain ("Nu sunt de acord cu Leo — motivul este...")
  · bridge two views ("Între Vera și Dara e un tradeoff real: ...")
- Don't repeat your own Round 1 stance. BUILD on the conversation.
- If everyone else missed something critical from your discipline, say it now.
- Start with the teammate name you're responding to ("Sofia,..." or "@Sofia" or "Răspund lui Leo:").
- No filler. Be pointed.`;
      const user = `The question being debated:\n${body.question}\n\nYour own Round 1 stance (don't repeat it):\n${valid1.find((c) => c.agent_id === agent.id)?.text ?? "(none)"}\n\nOther directors' Round 1 stances:\n${others.map((o) => `${o.agent_name}: ${o.text}`).join("\n\n")}\n\nGive your Round 2 response now.`;
      const text = await generateText(sys, user, { maxTokens: 300 });
      if (!text) return null;
      // Try to extract who they're responding to (first name mentioned)
      const mentionedIds = others.filter((o) => text.toLowerCase().includes(o.agent_name.toLowerCase())).map((o) => o.agent_id);
      return {
        agent_id: agent.id,
        agent_name: agent.name,
        text: text.trim(),
        round: 2,
        responds_to: mentionedIds[0] ?? null,
      };
    }),
  );
  const valid2 = round2.filter((c): c is Contribution => c !== null);

  // Combined contributions, ordered: round1 first then round2
  const valid = [...valid1, ...valid2];

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

  const synthesisUser = `Eduard's question:\n${body.question}\n\nROUND 1 — Opening statements:\n${valid1
    .map((c) => `${c.agent_name}: ${c.text}`)
    .join("\n\n")}\n\nROUND 2 — Cross-debate (agents respond to each other):\n${valid2
    .map((c) => `${c.agent_name} (răspunde la ${agentById(c.responds_to ?? "")?.name ?? "echipă"}): ${c.text}`)
    .join("\n\n")}\n\nNow synthesize the DEBATE outcome — what the team aligned on, where they disagree, what you (Alex) decided.`;

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
    contributions: valid,             // combined, kept for backward compat
    round1: valid1,                   // opening statements
    round2: valid2,                   // cross-debate (agents respond to each other)
    alex_synthesis: synthesis ?? "—",
    delegate_proxy_response: proxyResponse,
    delegate_active: Boolean(proxyResponse),
  });
}

async function pushToTelegram(synthesis: string, question: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ALLOWED_CHAT_ID;
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
  // Use unified TTS (ElevenLabs Daniel if configured, OpenAI fallback).
  // Previously hard-coded OpenAI "onyx" which has English-accented Romanian.
  try {
    const tts = await synthesizeSpeech(synthesis);
    if (!tts) return;
    const fd = new FormData();
    fd.append("chat_id", chatId);
    if (tts.format === "opus") {
      fd.append("voice", new Blob([tts.audio], { type: "audio/ogg" }), "alex.ogg");
      fd.append("caption", "Alex · Recomandare board 👔");
      await fetch(`${TG}/sendVoice`, { method: "POST", body: fd });
    } else {
      // ElevenLabs mp3 — use sendAudio
      fd.append("audio", new Blob([tts.audio], { type: "audio/mpeg" }), "alex.mp3");
      fd.append("title", "Alex · Recomandare board");
      fd.append("performer", "MarketHub Pro");
      await fetch(`${TG}/sendAudio`, { method: "POST", body: fd });
    }
  } catch {}
}

// Just reference so it's treated as used
void ALEX_AGENTS;
