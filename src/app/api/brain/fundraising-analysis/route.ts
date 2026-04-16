/**
 * POST /api/brain/fundraising-analysis
 *
 * Deep research: study how founders (like Musk) raise capital for ambitious
 * projects, then apply patterns to MarketHub Pro. 4 agents run in parallel:
 *   - Leo: historical funding pattern analysis (Musk's 10 ventures)
 *   - Dara: financial mechanics (rounds, valuations, dilution, terms)
 *   - Vera: positioning + pitch deck narratives
 *   - Alex: synthesis + concrete plan for MarketHub Pro
 *
 * Output: full fundraising playbook persisted to brain_knowledge_base.
 *
 * Auth: brain_admin cookie OR x-brain-cron-secret.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { generateText, generateJson } from "@/lib/llm";
import { ALEX_KNOWLEDGE_BRIEF, agentById } from "@/lib/alex-knowledge";
import { startActivity, completeActivity } from "@/lib/agent-activity";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

interface FundingPlan {
  our_situation: string;
  realistic_path: Array<{ stage: string; timing: string; amount: string; source: string; conditions: string }>;
  target_investors: Array<{ name: string; location: string; focus: string; why_fit: string; how_to_contact: string }>;
  pitch_narrative: string;
  immediate_actions_next_30d: string[];
}

function authOk(req: NextRequest): boolean {
  const cookieOk = req.cookies.get("brain_admin")?.value === "1";
  const cronOk =
    req.headers.get("x-brain-cron-secret") &&
    req.headers.get("x-brain-cron-secret") === process.env.BRAIN_CRON_SECRET;
  return Boolean(cookieOk || cronOk);
}

export async function POST(req: NextRequest) {
  if (!authOk(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const leo = agentById("strategist");
  const dara = agentById("finance");
  const vera = agentById("cmo");

  // Start all 3 agent activities in parallel
  const [leoAct, daraAct, veraAct] = await Promise.all([
    startActivity("strategist", "Leo: analiză istorică finanțare Musk (10 proiecte)"),
    startActivity("finance", "Dara: mecanica financiară runds + dilution Musk"),
    startActivity("cmo", "Vera: pattern-uri pitch + narrativ Musk"),
  ]);

  // Parallel research — Sonnet 4.6 for depth
  const [musk_history, musk_finance, musk_pitch] = await Promise.all([
    // Leo — historical pattern analysis
    generateText(
      `${ALEX_KNOWLEDGE_BRIEF}\n\n---\n\n${leo?.system ?? ""}`,
      `Concrete historical analysis: Elon Musk's 10 ventures (Zip2, X.com/PayPal, SpaceX, Tesla, SolarCity, OpenAI, Neuralink, Boring Co, Starlink, X/Twitter, xAI). For each, state:
- Initial capital source (self? VC? government? corporate?)
- Key funding round details (amount, lead investor, year, valuation)
- The 1 UNIQUE mechanism that unlocked the next stage
- Transferable pattern for a bootstrapped founder without Musk's prior exits

End with: 5 patterns we CAN replicate at MarketHub Pro scale (B2B SaaS, Romania-based, pre-revenue).

Max 900 words. Dense. No fluff.`,
      { maxTokens: 4000 },
    ),

    // Dara — financial mechanics
    generateText(
      `${ALEX_KNOWLEDGE_BRIEF}\n\n---\n\n${dara?.system ?? ""}`,
      `Financial engineering analysis of Musk's fundraising:
1. Typical round structures (seed → A → B → C → IPO)
2. Common instruments used: convertible notes, SAFEs, preferred stock, convertible debt
3. Dilution math (what % founder keeps after each round)
4. Government grants/contracts Musk leveraged (NASA COTS, DOE ATVM loan — amounts, conditions)
5. Strategic investors vs pure VC (Google in SpaceX, Panasonic in Tesla) — why they matter

Then: realistic fundraising MATH for a EU B2B SaaS pre-revenue startup (MarketHub Pro) targeting €3-5M seed in 18 months. Show:
- Pre-money valuation ranges at each stage
- Dilution schedule (founder should keep 60%+ after seed)
- Required traction milestones per stage
- EU-specific instruments (SEIS/EIS UK equivalent, EIC Accelerator €2.5M non-dilutive)

Max 800 words. Numbers heavy.`,
      { maxTokens: 4000 },
    ),

    // Vera — positioning + pitch
    generateText(
      `${ALEX_KNOWLEDGE_BRIEF}\n\n---\n\n${vera?.system ?? ""}`,
      `Narrative patterns analysis: how did Musk pitch investors on 4 of his most successful raises?
- PayPal Series A (1999, Sequoia)
- SpaceX seed (2002, personal + Founders Fund)
- Tesla Series B (2006, with Daimler later)
- xAI $6B (2024, Sequoia + Andreessen)

For each: what was the hook line? What was the vision? What proof points did he use? What did he promise + what did he sidestep?

Then: draft a 60-second verbal pitch for MarketHub Pro to a Romanian or CEE VC (Credo, GapMinder, Early Game Ventures). Include:
- Hook (specific pain, not generic)
- Traction slide placeholder
- TAM math that's DEFENSIBLE
- Why NOW (2026 AI window + marketplace shift)
- Why US (unfair advantage)
- Ask (amount + use of funds)

Max 600 words. The pitch section must be copy-ready.`,
      { maxTokens: 4000 },
    ),
  ]);

  await Promise.all([
    completeActivity(leoAct, "Leo: istoric Musk analizat"),
    completeActivity(daraAct, "Dara: mecanica financiară mapată"),
    completeActivity(veraAct, "Vera: narrativ pitch draftuit"),
  ]);

  // Alex synthesis — structured JSON plan
  const synthAct = await startActivity("alex", "Alex sintetizează planul de finanțare MarketHub Pro");

  const synth = await generateJson<FundingPlan>(
    `${ALEX_KNOWLEDGE_BRIEF}

---

You are Alex, CEO of MarketHub Pro. You just received 3 research briefs from Leo, Dara, Vera on Musk's fundraising patterns. Synthesize into a CONCRETE plan for US.

MarketHub Pro current state (Eduard's reality):
- Pre-revenue, 0 clients currently (but infrastructure complete)
- Bootstrapped, personal cost ~€0-100 so far
- Based: Romania (EU)
- Product: AI marketing platform with SaaS + DFY + emerging mediator model
- Unfair advantage: hybrid AI team working 24/7, multi-framework orchestration, Reverse Strategy approach

Output STRICT JSON:
{
  "our_situation": "1-paragraph honest state",
  "realistic_path": [
    {"stage":"Bootstrap to traction","timing":"0-3 months","amount":"€0-5k MRR","source":"organic outreach + DFY sales","conditions":"deliver 5-10 happy clients"},
    {"stage":"...", ...}
  ],
  "target_investors": [
    {"name":"Credo Ventures","location":"Prague","focus":"CEE B2B SaaS seed","why_fit":"...","how_to_contact":"warm intro via X or email partner Y"},
    {"name":"...", ...}
  ],
  "pitch_narrative": "60-sec verbal pitch ready to deliver, Eduard-voiced, Romania-aware",
  "immediate_actions_next_30d": ["action 1","action 2","..."]
}

Include 8-12 real investors relevant to our stage+geography. Target_investors must be ACTIONABLE (real names, real contact paths).`,
    `Leo's research:\n${musk_history}\n\n---\n\nDara's research:\n${musk_finance}\n\n---\n\nVera's research:\n${musk_pitch}\n\nSynthesize the plan.`,
    { maxTokens: 5000 },
  );

  await completeActivity(synthAct, "Alex: plan de finanțare sintetizat");

  // Persist everything to knowledge base
  const svc = createServiceClient();
  await svc.from("brain_knowledge_base").insert([
    {
      category: "case_study",
      name: "Musk fundraising analysis — Leo (strategist)",
      summary: "Historical patterns across 10 Musk ventures + 5 replicable mechanisms",
      content: { research: musk_history },
      tags: ["fundraising", "musk", "history", "patterns"],
      source: "fundraising-analysis endpoint",
      confidence: 0.85,
    },
    {
      category: "case_study",
      name: "Musk fundraising mechanics — Dara (CFO)",
      summary: "Round structures, instruments, dilution math, government leverage",
      content: { research: musk_finance },
      tags: ["fundraising", "musk", "finance", "dilution", "terms"],
      source: "fundraising-analysis endpoint",
      confidence: 0.85,
    },
    {
      category: "case_study",
      name: "Musk pitch patterns — Vera (CMO)",
      summary: "Narrative + hook patterns across 4 successful raises, MarketHub Pro pitch draft",
      content: { research: musk_pitch },
      tags: ["fundraising", "musk", "pitch", "narrative"],
      source: "fundraising-analysis endpoint",
      confidence: 0.85,
    },
    {
      category: "framework",
      name: "MarketHub Pro Fundraising Plan (Alex synthesis)",
      summary: "Concrete staged fundraising path with target investors, pitch, 30-day actions",
      content: synth as unknown as Record<string, unknown>,
      tags: ["fundraising", "plan", "markethub-pro", "action"],
      source: "fundraising-analysis endpoint",
      confidence: 0.9,
    },
  ]);

  return NextResponse.json({
    ok: true,
    plan: synth,
    raw_research: {
      leo: musk_history,
      dara: musk_finance,
      vera: musk_pitch,
    },
  });
}
