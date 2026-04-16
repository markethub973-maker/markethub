/**
 * POST /api/brain/legal-check
 *
 * Theo (Chief Legal Officer) reviews any proposed action for legal risk.
 * Call before sending outreach, launching in new geography, signing contract.
 *
 * Body: { action: string, jurisdictions?: string[], context?: string }
 * Returns: { risk_level, jurisdictions, rules_triggered, required_actions, commercial_tradeoff }
 *
 * Auth: brain_admin cookie OR x-brain-cron-secret.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { generateJson } from "@/lib/llm";
import { ALEX_KNOWLEDGE_BRIEF, agentById } from "@/lib/alex-knowledge";
import { startActivity, completeActivity } from "@/lib/agent-activity";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface LegalReview {
  risk_level: "low" | "medium" | "high" | "block";
  risk_icon: "🟢" | "🟡" | "🔴" | "⛔";
  jurisdictions: string[];
  rules_triggered: Array<{ regulation: string; article: string; concern: string }>;
  required_actions: string[];
  commercial_tradeoff: string;
  recommendation: "go" | "proceed_with_conditions" | "iterate" | "block";
  summary: string;
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

  const body = (await req.json().catch(() => ({}))) as {
    action?: string;
    jurisdictions?: string[];
    context?: string;
  };
  if (!body.action) {
    return NextResponse.json({ error: "action required" }, { status: 400 });
  }

  const theo = agentById("legal");
  const activity = await startActivity("legal", `Theo analizează risc legal: ${body.action.slice(0, 60)}`);

  const sys = `${ALEX_KNOWLEDGE_BRIEF}\n\n---\n\n${theo?.system ?? ""}

You are being called in compliance-check mode. Review the action below.

Output STRICT JSON:
{
  "risk_level": "low|medium|high|block",
  "risk_icon": "🟢|🟡|🔴|⛔",
  "jurisdictions": ["Romania","EU","etc"],
  "rules_triggered": [
    {"regulation":"GDPR","article":"Art 6(1)(f)","concern":"1 sentence concern"}
  ],
  "required_actions": ["concrete checklist item 1","item 2"],
  "commercial_tradeoff": "what we lose vs what we comply with, or 'none' if easy",
  "recommendation": "go|proceed_with_conditions|iterate|block",
  "summary": "1-paragraph clear verdict"
}

Be pragmatic. Low risk is fine. Block only for truly severe issues (serious GDPR breach, sanctions, platform ToS termination risk).`;

  const user = `Action to review: ${body.action}
${body.jurisdictions ? `Target jurisdictions: ${body.jurisdictions.join(", ")}` : "Target jurisdictions: Romania + EU (default)"}
${body.context ? `Additional context: ${body.context}` : ""}`;

  let review: LegalReview | null = null;
  try {
    review = await generateJson<LegalReview>(sys, user, { maxTokens: 2000 });
  } catch {
    /* fall through */
  }

  if (!review) {
    await completeActivity(activity, "Theo: legal check failed");
    return NextResponse.json({ error: "legal check failed" }, { status: 502 });
  }

  // Persist to knowledge base for future pattern-matching
  const svc = createServiceClient();
  await svc.from("brain_knowledge_base").insert({
    category: "case_study",
    name: `Legal review · ${body.action.slice(0, 80)}`,
    summary: review.summary,
    content: review as unknown as Record<string, unknown>,
    tags: ["legal", "compliance", ...(review.jurisdictions ?? [])],
    source: "legal-check endpoint",
    confidence: 0.9,
  });

  await completeActivity(
    activity,
    `Theo: ${review.risk_icon} ${review.risk_level.toUpperCase()} · ${review.recommendation}`,
    { risk: review.risk_level, recommendation: review.recommendation },
  );

  return NextResponse.json({ ok: true, review });
}
