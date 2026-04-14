/**
 * POST /api/ai/enrich-lead — AI-powered lead enrichment.
 *
 * Takes an existing research_leads row (by id) and returns:
 *   • company_angle  — what we can infer about the business from its name/category/city/website/reviews
 *   • ideal_pitch    — how MarketHub Pro (or user's service) would help them specifically
 *   • opener_message — a 2-3 sentence first-touch DM/email they can send as-is
 *   • red_flags      — risk signals to flag BEFORE contacting (bad reviews, wrong fit, etc.)
 *
 * Uses only the data we already have on the row (no external scraping).
 * Session-gated.
 */

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { buildBrandVoicePrompt } from "@/lib/brandVoice";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

const HAIKU = "claude-haiku-4-5-20251001";

export async function POST(req: NextRequest) {
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    lead_id?: string;
    your_offer?: string;
  } | null;

  if (!body?.lead_id) {
    return NextResponse.json({ error: "lead_id required" }, { status: 400 });
  }

  // Fetch the lead, scoped to this user
  const { data: lead, error: leadErr } = await supa
    .from("research_leads")
    .select("id,name,category,city,phone,website,email,rating,reviews_count,source,lead_type,pipeline_status,estimated_value")
    .eq("id", body.lead_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (leadErr || !lead) {
    return NextResponse.json({ error: "lead not found" }, { status: 404 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_API_KEY_APP;
  if (!apiKey) return NextResponse.json({ error: "AI not configured" }, { status: 500 });

  const voicePrompt = await buildBrandVoicePrompt(user.id);
  const offer = body.your_offer?.trim().slice(0, 400) ??
    "MarketHub Pro — an all-in-one AI marketing platform for small/mid-size agencies and content teams";

  const system = `You are a senior B2B sales strategist enriching a prospect's record.

You will receive a lead row (JSON). Produce a compact brief to help the operator decide whether to reach out and how.

Output STRICT JSON:
{
  "company_angle":  "2-3 sentences — what the business likely is, who their customers are, what signals the data gives (review count, rating, website presence, niche)",
  "ideal_pitch":    "2-3 sentences — how OUR offer fits THIS business specifically. Reference the data, not generic claims",
  "opener_message": "one first-touch DM/email, 2-3 sentences, warm, specific, NO cheesy hooks",
  "red_flags":      ["short bullet", "short bullet"]   // 0-3 entries; empty array if none
}

Rules:
- Do NOT invent facts not supported by the data.
- If key data is missing (no website, no rating), say so in company_angle rather than guess.
- Match the language of the lead's name/category if obvious; otherwise English.
- Opener message must be usable AS-IS — no placeholders like [YOUR_NAME].
- No emojis in the opener unless the business clearly skews casual (e.g. a coffee shop).${voicePrompt}

YOUR OFFER: ${offer}`;

  try {
    const anthropic = new Anthropic({ apiKey });
    const r = await anthropic.messages.create({
      model: HAIKU,
      max_tokens: 1500,
      system,
      messages: [{
        role: "user",
        content: `LEAD DATA:\n${JSON.stringify(lead, null, 2)}`,
      }],
    });
    const text = r.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("");
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("No JSON in response");
    const parsed = JSON.parse(m[0]) as {
      company_angle?: string;
      ideal_pitch?: string;
      opener_message?: string;
      red_flags?: string[];
    };
    return NextResponse.json({
      ok: true,
      lead_id: lead.id,
      lead_name: lead.name,
      enrichment: {
        company_angle:  parsed.company_angle  ?? "",
        ideal_pitch:    parsed.ideal_pitch    ?? "",
        opener_message: parsed.opener_message ?? "",
        red_flags:      Array.isArray(parsed.red_flags) ? parsed.red_flags.slice(0, 5) : [],
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
