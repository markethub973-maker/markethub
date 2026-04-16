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

/**
 * Pull exact prospect breakdown. Before this, agents guessed "5-15 NY
 * prospects" because they had no DB query capability. Now every agent
 * answer starts with authoritative counts, no more estimates.
 */
async function prospectBreakdown(): Promise<string> {
  try {
    const svc = createServiceClient();
    const { data } = await svc
      .from("brain_global_prospects")
      .select("country_code, vertical, outreach_status, snippet")
      .limit(500);
    const rows = data ?? [];
    if (rows.length === 0) return "";

    const byCountry: Record<string, number> = {};
    const byVertical: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    let nyMatches = 0;
    let laMatches = 0;
    for (const r of rows) {
      const cc = (r.country_code as string | null) ?? "(none)";
      byCountry[cc] = (byCountry[cc] ?? 0) + 1;
      const v = (r.vertical as string | null) ?? "(none)";
      byVertical[v] = (byVertical[v] ?? 0) + 1;
      const st = (r.outreach_status as string | null) ?? "(none)";
      byStatus[st] = (byStatus[st] ?? 0) + 1;
      const s = ((r.snippet as string | null) ?? "").toLowerCase();
      if (
        s.includes("new york") || s.includes("manhattan") ||
        s.includes("brooklyn") || s.includes("nyc") || s.includes(", ny ")
      ) nyMatches += 1;
      if (
        s.includes("los angeles") || s.includes("santa monica") ||
        s.includes("hollywood") || s.includes(", ca ")
      ) laMatches += 1;
    }
    const countryLine = Object.entries(byCountry)
      .sort(([, a], [, b]) => b - a)
      .map(([c, n]) => `${c}=${n}`)
      .join(", ");
    const statusLine = Object.entries(byStatus)
      .sort(([, a], [, b]) => b - a)
      .map(([s, n]) => `${s}=${n}`)
      .join(", ");
    return `\n\nExact prospect breakdown (from brain_global_prospects, authoritative — cite these numbers verbatim, NEVER estimate ranges like "5-15"):
  total = ${rows.length}
  by country: ${countryLine}
  by outreach_status: ${statusLine}
  New York (snippet match): ${nyMatches}
  Los Angeles (snippet match): ${laMatches}
  If asked about other cities, call GET /api/brain/prospect-breakdown?city=<name> for exact numbers.\n`;
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

  // Always inject dev pulse + prospect breakdown — keeps agents in sync with
  // Claude CLI work AND armed with authoritative DB counts (no more
  // "estimare 5-15 prospecți NY" guesses when the real answer is 9).
  const [devContext, prospectContext] = await Promise.all([
    recentDevPulse(),
    prospectBreakdown(),
  ]);

  const system = `${ALEX_KNOWLEDGE_BRIEF}\n\n---\n\n${agent.system}\n\nYou are ${agent.name}, ${agent.title}. Respond as ${agent.name} would — in character. **Reply in Romanian** (unless Eduard explicitly asks in another language). Max 250 words. Keep framework names in English (AIDA, PAS, Blue Ocean, MEDDIC etc.) but explain in RO.

WHEN ASKED ABOUT PROSPECT COUNTS (by city, country, vertical, status): read the exact numbers from the breakdown injected below. NEVER give a range like "probabil 5-15" — if the breakdown doesn't have the exact answer, recommend Eduard query it via one of our two tools below.

TOOLS AVAILABLE (Eduard can run these or quote the result in the reply):

  1) /api/brain/prospect-breakdown?city=<CSV>  — pre-built aggregations with per-city fuzzy match.

  2) /api/brain/db-query  — generic safe DB reader. POST with body:
       { "table": "<one of 25 whitelisted>", "select": ["col",...], "filters": [{"column","op","value"}], "limit": 100, "count_only": false }
     Ops: eq, neq, gt, gte, lt, lte, ilike, in, not_null, is_null, contains.
     Example for "DE prospecți cu email valid, vertical marketing":
       { "table":"brain_global_prospects", "filters":[
           {"column":"country_code","op":"eq","value":"DE"},
           {"column":"email","op":"not_null"},
           {"column":"vertical","op":"ilike","value":"marketing"}
         ], "count_only": true }

When you cite a number in your reply, ALWAYS state the source ("din breakdown live", "via db-query", sau "nu am cifra — rulează db-query").`;
  const answer = await generateText(
    system,
    `${body.question}${stateContext}${devContext}${prospectContext}`,
    { maxTokens: 700 },
  );
  return NextResponse.json({ ok: true, agent: { id: agent.id, name: agent.name }, answer: answer ?? "—" });
}
