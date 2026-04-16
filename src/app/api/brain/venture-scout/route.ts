/**
 * POST /api/brain/venture-scout
 *
 * Eduard's planet-scale vision: scan global unmet needs, design Musk-style
 * investment-ready solutions, add to venture pipeline.
 *
 * Leo (strategist) + Dara (CFO) + Theo (legal) + Kai (competitive) all pulse
 * while scanning. Output: 5-8 venture opportunities with investor hooks.
 *
 * Body: { focus_area?: string, region?: string, min_score?: number }
 *
 * Auth: brain_admin cookie OR x-brain-cron-secret.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { generateJson } from "@/lib/llm";
import { ALEX_KNOWLEDGE_BRIEF } from "@/lib/alex-knowledge";
import { startActivity, completeActivity } from "@/lib/agent-activity";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

interface Venture {
  need_description: string;
  planetary_scale: string;
  demand_signals: string[];
  proposed_solution: string;
  investor_fit: string[];
  estimated_tam: string;
  estimated_capital_need: string;
  musk_style_hook: string;
  current_mrr_potential: string;
  confidence_score: number;
  execution_risk: "low" | "medium" | "high";
  timeline_to_launch_months: number;
}

interface VentureScoutResult {
  scanned_domains: string[];
  ventures: Venture[];
  top_pick: string; // venture name with short reason
}

function authOk(req: NextRequest): boolean {
  const cookieOk = req.cookies.get("brain_admin")?.value === "1";
  const cronOk =
    req.headers.get("x-brain-cron-secret") &&
    req.headers.get("x-brain-cron-secret") === process.env.BRAIN_CRON_SECRET;
  return Boolean(cookieOk || cronOk);
}

export async function POST(req: NextRequest) {
  if (!authOk(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    focus_area?: string;
    region?: string;
    min_score?: number;
  };

  const activity = await startActivity(
    "strategist",
    `Leo scoutează ventures planet-scale ${body.focus_area ? `(focus: ${body.focus_area})` : ""}`,
  );

  const sys = `${ALEX_KNOWLEDGE_BRIEF}

---

You are Leo, Strategist running VENTURE SCOUT for Eduard per his directive:
"cautam necesitati pe toata planeta gasim solutii si le oferim in stilul Elon Mask pentru investitori"

This is venture-studio thesis work. Scan planet-scale unmet needs, design
Musk-style investment-ready solutions. Each venture must have:
- Civilizational/mass-impact framing (Musk's hook pattern)
- Clear end customer + intermediary (Reverse Strategy)
- Plausible path to €10M+ TAM
- Capital structure that works with our starting point (solo founder, limited capital)

Scan across MULTIPLE domains:
- Demographic shifts (aging EU, youth unemployment)
- Geopolitical crises (Ukraine war, energy, supply chain)
- AI disruption (whose jobs/businesses break, what needs replacing)
- Climate transition (new mandates, new markets)
- Healthcare gaps (mental health, longevity, rural access)
- Education reform (credential replacement, skill certification)
- Financial inclusion (CEE underbanked, crypto bridges)
- Marketplace gaps (B2B verticals underserved)

Focus area from user: ${body.focus_area ?? "GLOBAL — scan widely"}
Region: ${body.region ?? "prioritize EU/CEE where Eduard has ground advantage"}

Output STRICT JSON:
{
  "scanned_domains": ["list of what you considered"],
  "ventures": [
    {
      "need_description": "specific real unmet need",
      "planetary_scale": "geography + magnitude of people affected",
      "demand_signals": ["signal 1","signal 2"],
      "proposed_solution": "Musk-style concrete solution",
      "investor_fit": ["type 1","type 2"],
      "estimated_tam": "€X billion / addressable",
      "estimated_capital_need": "€X for stage Y",
      "musk_style_hook": "one-liner for investor pitch, civilizational framing",
      "current_mrr_potential": "€X-Y/mo at steady state",
      "confidence_score": 0-100,
      "execution_risk": "low|medium|high",
      "timeline_to_launch_months": 0-36
    }
  ],
  "top_pick": "name + 1-sentence why"
}

Return 5-8 ventures, sorted by confidence_score descending. Be concrete and realistic.`;

  const user = body.focus_area
    ? `Scan for ventures in focus area: ${body.focus_area}. Region preference: ${body.region ?? "EU/CEE"}.`
    : `Run planet-wide scan. Surface highest-impact opportunities for our capability stack (AI + marketing + mediation).`;

  let result: VentureScoutResult | null = null;
  try {
    result = await generateJson<VentureScoutResult>(sys, user, { maxTokens: 4000 });
  } catch { /* fall through */ }

  if (!result || !Array.isArray(result.ventures)) {
    await completeActivity(activity, "Leo: venture scout empty");
    return NextResponse.json({ error: "venture scout failed" }, { status: 502 });
  }

  // Filter by min_score if specified
  const min = body.min_score ?? 60;
  const filtered = result.ventures.filter((v) => v.confidence_score >= min);

  // Persist to brain_venture_pipeline
  const svc = createServiceClient();
  try {
    await Promise.all(
      filtered.map((v) =>
        svc.from("brain_venture_pipeline").insert({
          phase: "need_detected",
          need_description: v.need_description,
          planetary_scale: v.planetary_scale,
          demand_signals: v.demand_signals as unknown as Record<string, unknown>,
          proposed_solution: v.proposed_solution,
          investor_fit: v.investor_fit,
          estimated_tam: v.estimated_tam,
          estimated_capital_need: v.estimated_capital_need,
          musk_style_hook: v.musk_style_hook,
          current_mrr_potential: v.current_mrr_potential,
          confidence_score: v.confidence_score,
          notes: `scout run ${new Date().toISOString()} · risk: ${v.execution_risk} · timeline: ${v.timeline_to_launch_months}mo`,
        }),
      ),
    );
  } catch { /* non-fatal */ }

  await completeActivity(
    activity,
    `Leo: ${filtered.length} ventures passed filter (min ${min}), top: ${result.top_pick?.slice(0, 80) ?? "?"}`,
    { count: filtered.length, top: result.top_pick },
  );

  return NextResponse.json({
    ok: true,
    scanned_domains: result.scanned_domains,
    top_pick: result.top_pick,
    ventures_qualified: filtered,
    ventures_discarded: result.ventures.length - filtered.length,
    threshold: min,
  });
}
