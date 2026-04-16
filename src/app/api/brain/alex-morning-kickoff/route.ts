/**
 * GET /api/brain/alex-morning-kickoff — Alex picks the day's first task at 07:05.
 *
 * Runs right after morning-debate (07:00). Given the state + open threads +
 * yesterday's results + auto-learned rules, Alex commits to ONE concrete
 * first action for the day, logs the decision, and notifies Eduard.
 *
 * Not a vague "strategic direction" — a specific action with owner + target +
 * expected outcome. Starts the day's execution without Eduard lifting a finger.
 *
 * Auth: x-brain-cron-secret.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { generateText } from "@/lib/llm";
import { ALEX_KNOWLEDGE_BRIEF } from "@/lib/alex-knowledge";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

interface KickoffState {
  new_prospects_untouched: number;
  outreach_queued_tbd: number;
  outreach_replied_yesterday: number;
  open_critical_incidents: number;
  auto_learned_rules_count: number;
  top_intermediary_score: number;
  recent_dev_events: string[];
}

async function buildState(): Promise<KickoffState> {
  const svc = createServiceClient();
  const now = Date.now();
  const y = new Date(now - 24 * 3600_000).toISOString();

  const [prospects, tbd, replied, incidents, learnings, top, devEvents] = await Promise.all([
    svc
      .from("brain_global_prospects")
      .select("id", { count: "exact", head: true })
      .is("last_scanned_at", null),
    svc
      .from("outreach_log")
      .select("id", { count: "exact", head: true })
      .like("subject", "TBD%"),
    svc
      .from("outreach_log")
      .select("id", { count: "exact", head: true })
      .not("replied_at", "is", null)
      .gte("replied_at", y),
    svc
      .from("ops_incidents")
      .select("id", { count: "exact", head: true })
      .is("resolved_at", null)
      .eq("severity", "critical"),
    svc
      .from("brain_knowledge_base")
      .select("id", { count: "exact", head: true })
      .contains("tags", ["auto_learned"]),
    svc
      .from("brain_intermediary_patterns")
      .select("our_product_match_score")
      .order("our_product_match_score", { ascending: false })
      .limit(1),
    svc
      .from("brain_agent_activity")
      .select("description, created_at")
      .eq("agent_id", "dev")
      .gte("created_at", y)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  return {
    new_prospects_untouched: prospects.count ?? 0,
    outreach_queued_tbd: tbd.count ?? 0,
    outreach_replied_yesterday: replied.count ?? 0,
    open_critical_incidents: incidents.count ?? 0,
    auto_learned_rules_count: learnings.count ?? 0,
    top_intermediary_score: (top.data?.[0]?.our_product_match_score as number | undefined) ?? 0,
    recent_dev_events: (devEvents.data ?? []).map(
      (r) => `${(r.created_at as string).slice(11, 16)} — ${r.description}`,
    ),
  };
}

function authOk(req: NextRequest): boolean {
  const secret = req.headers.get("x-brain-cron-secret");
  return Boolean(secret && secret === process.env.BRAIN_CRON_SECRET);
}

async function notifyTelegram(summary: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ALLOWED_CHAT_ID;
  if (!token || !chatId) return false;
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: summary }),
    });
    const j = (await r.json()) as { ok?: boolean };
    return Boolean(j.ok);
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  if (!authOk(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const state = await buildState();
  const svc = createServiceClient();

  const system = `${ALEX_KNOWLEDGE_BRIEF}

---

You are Alex, kicking off the day at 07:05. Morning debate finished at 07:00. Now commit to ONE concrete first action for the team — specific, owned, with a clear expected outcome by end of day.

Rules:
- Pick from the three highest-leverage domains: outreach (most likely to convert to first Stripe sale), content (momentum for inbound), ops (fix something blocking revenue).
- If there are open critical incidents, the first action MUST address one of them.
- Name the specific agent who owns the action (Sofia / Vera / Marcus / Ethan / Nora / Kai / Iris / Leo / Dara / Theo).
- Propose an API endpoint or tool on the platform the owner will call (don't invent new tools).
- Expected outcome should be measurable by 18:00 same day.
- Apply rule 11 (autonomy): if this is in an agent's auto-approve lane (outreach, content, lead scoring), just launch it. Do NOT wait for Eduard.
- Reply in Romanian, terse.

Output STRICT JSON:
{
  "first_action": {
    "owner_agent": "sales" | "content" | "cmo" | "analyst" | "researcher" | "competitive" | "copywriter" | "strategist" | "finance" | "legal",
    "what": "Imperative sentence",
    "why": "1 line grounded in the state numbers",
    "tool": "e.g. /api/brain/alex-loom, /studio/campaign, /api/brain/mine-leads",
    "expected_by_eod": "Measurable outcome"
  },
  "telegram_summary": "Short Romanian message for Eduard, plain text (NO markdown)"
}`;

  const user = `State:
${JSON.stringify(state, null, 2)}

Decide the day's first action.`;

  const raw = await generateText(system, user, { maxTokens: 600 });
  if (!raw) {
    return NextResponse.json({ error: "LLM did not respond" }, { status: 502 });
  }
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) return NextResponse.json({ error: "No JSON in LLM output", raw }, { status: 502 });

  type FirstAction = {
    owner_agent: string;
    what: string;
    why: string;
    tool: string;
    expected_by_eod: string;
  };
  let parsed: { first_action: FirstAction; telegram_summary: string };
  try {
    parsed = JSON.parse(m[0]) as { first_action: FirstAction; telegram_summary: string };
  } catch {
    return NextResponse.json({ error: "Malformed JSON from LLM", raw: m[0] }, { status: 502 });
  }

  // Log the kickoff with first-class activity="kickoff" (post 2026-04-16 DDL).
  await svc.from("brain_agent_activity").insert({
    agent_id: parsed.first_action.owner_agent ?? "alex",
    agent_name: "Alex (kickoff)",
    activity: "kickoff",
    description: parsed.first_action.what.slice(0, 300),
    result: {
      ...parsed.first_action,
      state,
      date: new Date().toISOString().slice(0, 10),
    },
  });

  // Telegram to Eduard
  const header = "☀️ Kickoff dimineață 07:05";
  const fullMessage = `${header}\n\n${parsed.telegram_summary}\n\nOwner: ${parsed.first_action.owner_agent}\nTool: ${parsed.first_action.tool}\nExpected by EOD: ${parsed.first_action.expected_by_eod}\n\n(Mă ocup. Dacă vrei alt task azi, @claude sau răspunde.)`;
  const sent = await notifyTelegram(fullMessage);

  return NextResponse.json({ ok: true, state, ...parsed, telegram_sent: sent });
}
