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
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Pull the last few dev-session events so the agent automatically knows
 * what Claude (CLI) has been doing in the codebase. Closes the
 * "3 separate threads" gap — Eduard's question to Sofia now reaches an
 * agent who already saw the latest file changes / test sends / deploys.
 */
async function recentDevPulse(): Promise<string> {
  try {
    const svc = createServiceClient();
    const { data } = await svc
      .from("brain_agent_activity")
      .select("description, created_at")
      .eq("agent_id", "dev")
      .order("created_at", { ascending: false })
      .limit(8);
    if (!data || data.length === 0) return "";
    const lines = data
      .map((r) => `  · ${new Date(r.created_at as string).toISOString().slice(11, 16)} — ${r.description}`)
      .join("\n");
    return `\n\nDev session activity (last 8 events from Claude CLI working alongside you):\n${lines}\n`;
  } catch {
    return "";
  }
}

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

  // Always inject dev pulse — keeps agents in sync with Claude CLI work
  const devContext = await recentDevPulse();

  const system = `${ALEX_KNOWLEDGE_BRIEF}\n\n---\n\n${agent.system}\n\nYou are ${agent.name}, ${agent.title}. Respond as ${agent.name} would — in character. **Reply in Romanian** (unless Eduard explicitly asks in another language). Max 250 words. Keep framework names in English (AIDA, PAS, Blue Ocean, MEDDIC etc.) but explain in RO.`;
  const answer = await generateText(system, `${body.question}${stateContext}${devContext}`, { maxTokens: 700 });
  return NextResponse.json({ ok: true, agent: { id: agent.id, name: agent.name }, answer: answer ?? "—" });
}
