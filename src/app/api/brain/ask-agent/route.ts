/**
 * POST /api/brain/ask-agent — operator asks a specialist agent a question.
 *
 * Body: { agent_id: string, question: string, state?: boolean }
 * If state=true, also passes current Brain advisor state as context.
 * Auth: brain_admin cookie.
 */

import { NextRequest, NextResponse } from "next/server";
import { generateText } from "@/lib/llm";
import { agentById, ALEX_KNOWLEDGE_BRIEF } from "@/lib/alex-knowledge";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const cookieOk = req.cookies.get("brain_admin")?.value === "1";
  const cronOk = req.headers.get("x-brain-cron-secret") === process.env.BRAIN_CRON_SECRET;
  if (!cookieOk && !cronOk) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as {
    agent_id?: string;
    question?: string;
    state?: boolean;
  };
  if (!body.agent_id || !body.question) {
    return NextResponse.json({ error: "agent_id + question required" }, { status: 400 });
  }
  const agent = agentById(body.agent_id);
  if (!agent) return NextResponse.json({ error: "unknown agent" }, { status: 404 });

  let stateContext = "";
  if (body.state) {
    try {
      const res = await fetch("https://markethubpromo.com/api/brain/advisor", {
        headers: { "x-brain-cron-secret": process.env.BRAIN_CRON_SECRET ?? "" },
      });
      if (res.ok) {
        const d = (await res.json()) as { state?: unknown; summary_headline?: string };
        stateContext = `\n\nCurrent Brain state:\n${JSON.stringify(d.state ?? {})}\nHeadline: ${d.summary_headline ?? ""}`;
      }
    } catch { /* no-op */ }
  }

  const system = `${ALEX_KNOWLEDGE_BRIEF}\n\n---\n\n${agent.system}\n\nYou are ${agent.name}, ${agent.title}. Respond as ${agent.name} would — in character. **Reply in Romanian** (unless Eduard explicitly asks in another language). Max 250 words. Keep framework names in English (AIDA, PAS, Blue Ocean, MEDDIC etc.) but explain in RO.`;
  const answer = await generateText(system, `${body.question}${stateContext}`, { maxTokens: 700 });
  return NextResponse.json({ ok: true, agent: { id: agent.id, name: agent.name }, answer: answer ?? "—" });
}
