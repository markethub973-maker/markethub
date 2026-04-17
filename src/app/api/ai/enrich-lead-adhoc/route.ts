/**
 * POST /api/ai/enrich-lead-adhoc — same as /api/ai/enrich-lead but for
 * ad-hoc leads (no DB row required). Accepts raw fields, returns the
 * same enrichment structure.
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
    name?: string;
    category?: string;
    city?: string;
    website?: string;
    email?: string;
    rating?: number;
    reviews_count?: number;
    source?: string;
    your_offer?: string;
    client_id?: string;
  } | null;

  if (!body?.name || body.name.trim().length < 2) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_API_KEY_APP;
  if (!apiKey) return NextResponse.json({ error: "AI not configured" }, { status: 500 });

  const voicePrompt = await buildBrandVoicePrompt(user.id, body?.client_id);
  const offer = body.your_offer?.trim().slice(0, 400) ??
    "MarketHub Pro — an all-in-one AI marketing platform for small/mid-size agencies and content teams";

  const leadData = {
    name: body.name.trim(),
    category: body.category?.trim() ?? null,
    city: body.city?.trim() ?? null,
    website: body.website?.trim() ?? null,
    email: body.email?.trim() ?? null,
    rating: typeof body.rating === "number" ? body.rating : null,
    reviews_count: typeof body.reviews_count === "number" ? body.reviews_count : null,
    source: body.source?.trim() ?? null,
  };

  const system = `You are a senior B2B sales strategist enriching a prospect's record.

Output STRICT JSON:
{
  "company_angle":  "2-3 sentences — what the business likely is, who their customers are, what signals the data gives",
  "ideal_pitch":    "2-3 sentences — how OUR offer fits THIS business specifically. Reference the data, not generic claims",
  "opener_message": "one first-touch DM/email, 2-3 sentences, warm, specific, NO cheesy hooks",
  "red_flags":      ["short bullet", "short bullet"]
}

Rules:
- Do NOT invent facts not supported by the data.
- If key data is missing, say so in company_angle rather than guess.
- Match the language of the lead's name/category if obvious; otherwise English.
- Opener message must be usable AS-IS — no [PLACEHOLDER] text.
- No emojis unless the business clearly skews casual.${voicePrompt}

YOUR OFFER: ${offer}`;

  try {
    const anthropic = new Anthropic({ apiKey });
    const r = await anthropic.messages.create({
      model: HAIKU,
      max_tokens: 1500,
      system,
      messages: [{ role: "user", content: `LEAD DATA:\n${JSON.stringify(leadData, null, 2)}` }],
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
      lead_name: leadData.name,
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
