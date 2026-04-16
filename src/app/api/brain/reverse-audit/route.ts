/**
 * POST /api/brain/reverse-audit
 *
 * Given a proposed target vertical/ICP, runs Reverse Strategy analysis:
 *   1. Identifies the END customer
 *   2. Maps how the intermediary acquires end customers
 *   3. Derives intermediary's actual JTBD
 *   4. Checks if MarketHub Pro's offer solves that JTBD
 *   5. Returns match score 0-10 + go/no-go recommendation
 *
 * This is the MANDATORY first step before any outreach campaign. Sofia/Vera
 * should NEVER launch a batch without checking the vertical has score ≥ 7.
 *
 * Auth: brain_admin cookie OR x-brain-cron-secret.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { generateJson } from "@/lib/llm";
import { ALEX_KNOWLEDGE_BRIEF } from "@/lib/alex-knowledge";
import { startActivity, completeActivity, failActivity } from "@/lib/agent-activity";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface ReverseAudit {
  intermediary_type: string;
  end_client_segment: string;
  how_intermediary_acquires_end_clients: string[];
  intermediary_jtbd: string[];
  our_product_delivers: string[];
  our_product_gaps: string[];
  match_score: number;
  recommendation: "go" | "park" | "iterate_offer";
  pitch_angle: string;
  leverage_multiplier: string;
  distribution_channel_potential: "yes" | "no" | "maybe";
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
    intermediary_type?: string; // e.g., "dental clinic", "digital marketing agency Romania"
    notes?: string;
  };
  if (!body.intermediary_type) {
    return NextResponse.json({ error: "intermediary_type required" }, { status: 400 });
  }

  // Kai (competitive analyst) pulses while running this analysis
  const activity = await startActivity(
    "competitive",
    `Kai analizează reverse strategy: ${body.intermediary_type}`,
  );

  // Check if we already have this pattern in the knowledge base
  const svc = createServiceClient();
  const { data: existing } = await svc
    .from("brain_intermediary_patterns")
    .select("*")
    .ilike("intermediary_type", `%${body.intermediary_type}%`)
    .order("created_at", { ascending: false })
    .limit(1);
  if (existing && existing.length > 0) {
    const cached = existing[0];
    await completeActivity(activity, `Kai: pattern cached găsit pentru "${body.intermediary_type}"`, { cached: true });
    return NextResponse.json({
      ok: true,
      cached: true,
      audit: {
        intermediary_type: cached.intermediary_type,
        end_client_segment: cached.end_client_segment,
        how_intermediary_acquires_end_clients: [cached.what_brings_end_client],
        intermediary_jtbd: cached.intermediary_needs,
        our_product_delivers: cached.our_product_delivers,
        our_product_gaps: cached.our_product_gaps,
        match_score: cached.our_product_match_score,
        recommendation: cached.our_product_match_score >= 7 ? "go" : cached.our_product_match_score < 5 ? "park" : "iterate_offer",
        pitch_angle: cached.notes,
      },
    });
  }

  const sys = `${ALEX_KNOWLEDGE_BRIEF}

---

You are Kai, Competitive/Strategic analyst for MarketHub Pro. You run REVERSE STRATEGY audits on proposed intermediaries (target verticals).

MarketHub Pro's current offer:
- €499/€1000 DFY package: 60 captions + 20 AI images + 30-day content calendar + 20-50 leads + strategy call
- SaaS subscription: AI content studio, calendar, hashtag analyzer, lead finder, brand voice, outreach sequences
- Strengths: content creation speed, AI imagery, calendar automation, brand voice consistency, outreach sequencing
- Weaknesses: NO Google My Business optimization, NO Facebook/Google Ads management, NO SEO audit, NO review generation, NO paid media buying
- Best for: people who need FAST + SCALABLE + ON-BRAND content (organic + outbound)
- Worst for: people who need paid ads, local SEO, review management, hyperlocal foot traffic

Your job: given an intermediary_type, run full Reverse Strategy audit per Eduard's framework (see rule 7a in the knowledge brief).

OUTPUT STRICT JSON, keys EXACTLY:
{
  "intermediary_type": "...",
  "end_client_segment": "who the intermediary SERVES (who has the end problem)",
  "how_intermediary_acquires_end_clients": ["concrete mechanism 1", "mechanism 2", ...],
  "intermediary_jtbd": ["pain 1 blocking intermediary growth", "pain 2", ...],
  "our_product_delivers": ["concrete thing we solve", ...],
  "our_product_gaps": ["concrete thing we DON'T solve", ...],
  "match_score": 0-10 (how well our offer solves their actual JTBD),
  "recommendation": "go" (>=7) | "park" (<5) | "iterate_offer" (5-6),
  "pitch_angle": "if go: ONE sentence reverse pitch angle for outreach",
  "leverage_multiplier": "e.g., '15x — agency serves 15 SMBs on avg' or '1x — direct single customer'",
  "distribution_channel_potential": "yes" | "no" | "maybe"
}

Be honest. If the score is low, say so — we'd rather park prospects than burn them with mismatched pitches.`;

  const user = `Intermediary type to audit: ${body.intermediary_type}\n${body.notes ? `\nContext notes: ${body.notes}` : ""}`;

  let audit: ReverseAudit | null = null;
  try {
    audit = await generateJson<ReverseAudit>(sys, user, { maxTokens: 900 });
  } catch (e) {
    await failActivity(activity, "Kai: audit failed", e instanceof Error ? e.message : String(e));
    return NextResponse.json({ error: "audit generation failed" }, { status: 502 });
  }

  if (!audit) {
    await failActivity(activity, "Kai: audit returned empty");
    return NextResponse.json({ error: "empty audit" }, { status: 502 });
  }

  // Persist to knowledge base for future reuse
  await svc.from("brain_intermediary_patterns").insert({
    end_client_segment: audit.end_client_segment,
    intermediary_type: audit.intermediary_type,
    what_brings_end_client: audit.how_intermediary_acquires_end_clients.join(" · "),
    intermediary_needs: audit.intermediary_jtbd,
    our_product_match_score: audit.match_score,
    our_product_delivers: audit.our_product_delivers,
    our_product_gaps: audit.our_product_gaps,
    notes: audit.pitch_angle,
  });

  await completeActivity(
    activity,
    `Kai: ${audit.intermediary_type} scor=${audit.match_score}/10 → ${audit.recommendation}`,
    {
      score: audit.match_score,
      recommendation: audit.recommendation,
      channel: audit.distribution_channel_potential,
    },
  );

  return NextResponse.json({ ok: true, cached: false, audit });
}
