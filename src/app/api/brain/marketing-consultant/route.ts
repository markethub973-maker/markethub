/**
 * POST /api/brain/marketing-consultant — Marketing Consultant Analysis
 *
 * Runs the marketing_consultant or positioning_audit prompt on any
 * product/business description. Used by Alex's team to analyze prospects,
 * audit own messaging, or prepare pitch decks.
 *
 * Body: { description: string, type?: "consultant" | "audit", lang?: string }
 * Auth: brain_admin cookie OR x-brain-cron-secret header OR admin session
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import Anthropic from "@anthropic-ai/sdk";
import { ALEX_PROMPTS } from "@/lib/alex-prompts";
import { ALEX_KNOWLEDGE_BRIEF } from "@/lib/alex-knowledge";
import { OUTPUT_SAFETY_RULES } from "@/lib/anthropic-client";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const HAIKU = "claude-haiku-4-5-20251001";

function authOk(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET || process.env.BRAIN_CRON_SECRET;
  const h = req.headers.get("x-brain-cron-secret") || req.headers.get("authorization");
  if (h && cronSecret && (h === cronSecret || h === `Bearer ${cronSecret}`)) return true;
  const cookie = req.cookies.get("brain_admin")?.value;
  if (cookie === process.env.BRAIN_ADMIN_PASSWORD) return true;
  return false;
}

export async function POST(req: NextRequest) {
  if (!authOk(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { description, type = "consultant", lang = "ro" } = body as {
    description?: string;
    type?: "consultant" | "audit";
    lang?: string;
  };

  if (!description?.trim()) {
    return NextResponse.json(
      { error: "description required — describe the product/business in 3-5 sentences" },
      { status: 400 }
    );
  }

  const scenario = type === "audit" ? "positioning_audit" : "marketing_consultant";
  const systemPrompt = ALEX_PROMPTS[scenario](lang);

  const anthropic = new Anthropic();

  const msg = await anthropic.messages.create({
    model: HAIKU,
    max_tokens: 2048,
    system: `${ALEX_KNOWLEDGE_BRIEF}\n\n${OUTPUT_SAFETY_RULES}\n\n${systemPrompt}`,
    messages: [
      {
        role: "user",
        content: `Analyze this product/business:\n\n${description.trim()}`,
      },
    ],
  });

  const raw = msg.content[0].type === "text" ? msg.content[0].text : "";

  // Try to parse JSON from the response
  let parsed = null;
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
  } catch {
    // If JSON parsing fails, return raw text
  }

  // Log to brain_agent_activity
  const svc = createServiceClient();
  await svc.from("brain_agent_activity").insert({
    agent_id: type === "audit" ? "strategist" : "cmo",
    agent_name: type === "audit" ? "Leo (Strategist) + Iris (Copywriter)" : "Vera (CMO)",
    activity: "marketing_analysis",
    description: `${type === "audit" ? "Positioning audit" : "Marketing consultant analysis"} for: ${description.slice(0, 100)}...`,
    result: { type: scenario, lang, parsed: !!parsed, input_length: description.length },
  });

  // Also save to knowledge base for future reference
  await svc.from("brain_knowledge_base").insert({
    category: "framework",
    name: `${type === "audit" ? "Positioning Audit" : "Marketing Analysis"}: ${description.slice(0, 60)}...`,
    summary: parsed?.usp || parsed?.category?.recommended || description.slice(0, 200),
    content: parsed || { raw_response: raw },
    tags: ["marketing-consultant", scenario, `lang:${lang}`],
    source: "marketing-consultant endpoint",
    confidence: 0.9,
  });

  return NextResponse.json({
    type: scenario,
    analysis: parsed || raw,
    raw: parsed ? undefined : raw,
    saved: true,
  });
}
