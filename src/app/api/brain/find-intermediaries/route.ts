/**
 * POST /api/brain/find-intermediaries
 *
 * Reverse search — given an END customer pain/segment, returns ranked list
 * of INTERMEDIARIES who serve them + fit score for MarketHub Pro offer.
 *
 * This is the flip of /reverse-audit:
 *   - reverse-audit: "I'm considering targeting X — is it a good fit?"
 *   - find-intermediaries: "End customer Y has pain Z — who should we target?"
 *
 * Per Eduard's rule: start from end customer, find who brings them.
 *
 * Auth: brain_admin cookie OR x-brain-cron-secret.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { generateJson } from "@/lib/llm";
import { ALEX_KNOWLEDGE_BRIEF } from "@/lib/alex-knowledge";
import { startActivity, completeActivity, failActivity } from "@/lib/agent-activity";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

interface IntermediarySuggestion {
  intermediary_type: string;
  what_they_sell_to_end_customer: string;
  how_they_acquire_end_customers: string[];
  their_likely_jtbd: string[];
  our_product_match_score: number;
  recommended_search_query: string; // for Nora to use in Apify
  leverage_multiplier: string;
  why_this_works: string;
}

interface ReverseSearchResult {
  end_customer_segment: string;
  end_customer_pain: string;
  intermediaries: IntermediarySuggestion[];
  top_recommendation: string;
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
    end_customer_pain?: string;
    end_customer_segment?: string;
    notes?: string;
  };
  if (!body.end_customer_pain && !body.end_customer_segment) {
    return NextResponse.json(
      { error: "either end_customer_pain or end_customer_segment required" },
      { status: 400 },
    );
  }

  // Leo (strategist) pulses while running reverse search
  const activity = await startActivity(
    "strategist",
    `Leo caută intermediari pentru: ${body.end_customer_segment ?? body.end_customer_pain}`,
  );

  const sys = `${ALEX_KNOWLEDGE_BRIEF}

---

You are Leo, Strategist for MarketHub Pro. You run REVERSE SEARCH: given an end-customer pain or segment, you brainstorm 5-8 different INTERMEDIARY types who serve that end customer, then score each for MarketHub Pro fit.

MarketHub Pro's offer (strengths): AI content creation, image generation, content calendar, brand voice, outreach sequences, leads enrichment, caption/hashtag AI.
Weaknesses: NO paid ads management, NO local SEO/GMB optimization, NO review generation, NO appointment booking, NO payment processing.

Best-fit intermediary profile: B2B service sellers needing content at scale, with multiple end clients (so we get leverage multiplier).

Your job:
1. Identify the end customer clearly
2. Brainstorm 5-8 DIFFERENT types of intermediaries who serve them (not just variants of the same thing)
3. For each, analyze how they acquire their end customers + their likely JTBD
4. Score MarketHub Pro fit 0-10 per intermediary
5. Suggest concrete Apify search queries Nora can use to scrape each type
6. Rank the list; top recommendation at the end

OUTPUT STRICT JSON:
{
  "end_customer_segment": "...",
  "end_customer_pain": "...",
  "intermediaries": [
    {
      "intermediary_type": "e.g. Digital Marketing Agency (SMB-focused)",
      "what_they_sell_to_end_customer": "...",
      "how_they_acquire_end_customers": ["mechanism 1", "mechanism 2"],
      "their_likely_jtbd": ["pain 1", "pain 2"],
      "our_product_match_score": 0-10,
      "recommended_search_query": "e.g., 'digital marketing agency Bucuresti'",
      "leverage_multiplier": "e.g., '15x — serves ~15 SMBs on avg'",
      "why_this_works": "one sentence"
    }
  ],
  "top_recommendation": "name of #1 intermediary + why it wins"
}`;

  const user = `End customer segment: ${body.end_customer_segment ?? "(derive from pain)"}
End customer pain: ${body.end_customer_pain ?? "(derive from segment)"}
${body.notes ? `\nContext notes: ${body.notes}` : ""}`;

  let result: ReverseSearchResult | null = null;
  try {
    result = await generateJson<ReverseSearchResult>(sys, user, { maxTokens: 2500 });
  } catch (e) {
    await failActivity(activity, "Leo: reverse search failed", e instanceof Error ? e.message : String(e));
    return NextResponse.json({ error: "reverse search failed" }, { status: 502 });
  }

  if (!result || !Array.isArray(result.intermediaries)) {
    await failActivity(activity, "Leo: empty reverse search result");
    return NextResponse.json({ error: "empty result" }, { status: 502 });
  }

  // Sort intermediaries by match score desc
  result.intermediaries.sort((a, b) => b.our_product_match_score - a.our_product_match_score);

  // Persist each intermediary suggestion to the knowledge base for future reuse
  const svc = createServiceClient();
  try {
    await Promise.all(
      result.intermediaries.slice(0, 5).map((i) =>
        svc.from("brain_intermediary_patterns").insert({
          end_client_segment: result!.end_customer_segment,
          intermediary_type: i.intermediary_type,
          what_brings_end_client: i.how_they_acquire_end_customers.join(" · "),
          intermediary_needs: i.their_likely_jtbd,
          our_product_match_score: i.our_product_match_score,
          our_product_delivers: [i.why_this_works],
          our_product_gaps: [],
          notes: `Reverse search from end customer: "${result!.end_customer_pain}". Search query: ${i.recommended_search_query}. Leverage: ${i.leverage_multiplier}`,
        }),
      ),
    );
  } catch { /* non-fatal — persistence is nice-to-have */ }

  const topScore = result.intermediaries[0]?.our_product_match_score ?? 0;
  const topName = result.intermediaries[0]?.intermediary_type ?? "?";
  await completeActivity(
    activity,
    `Leo: ${result.intermediaries.length} intermediari identificați · top=${topName} (${topScore}/10)`,
    { count: result.intermediaries.length, top: topName, top_score: topScore },
  );

  return NextResponse.json({ ok: true, result });
}
