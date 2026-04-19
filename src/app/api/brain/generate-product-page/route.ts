/**
 * POST /api/brain/generate-product-page
 *
 * CEO Brain endpoint: from a minimal product brief, AI fills in the
 * landing-page copy fields (hero, outcomes, steps, description, tags).
 * Caller still provides product name + affiliate URL + at least 1
 * image — the rest is generated.
 *
 * Returns a fully-formed BrainProduct object that the caller persists
 * (localStorage today, brain_products table after Phase 2 subdomain).
 *
 * Admin-only. Not exposed in /api/v1.
 */

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { BrainProduct } from "@/lib/brainProducts";
import { OUTPUT_SAFETY_RULES } from "@/lib/anthropic-client";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const HAIKU = "claude-haiku-4-5-20251001";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
}

export async function POST(req: NextRequest) {
  // Admin gate — only the operator (or Brain itself with admin token)
  // can generate product pages.
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const service = createServiceClient();
  const { data: profile } = await service
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as {
    name?: string;
    category?: string;
    affiliate_url?: string;
    affiliate_program?: string;
    image_urls?: string[];
    price_display?: string;
    target_audience?: string;
    notes?: string;
  } | null;

  if (!body?.name || body.name.trim().length < 3) {
    return NextResponse.json({ error: "name required (min 3 chars)" }, { status: 400 });
  }
  if (!body.affiliate_url) {
    return NextResponse.json({ error: "affiliate_url required" }, { status: 400 });
  }
  try {
    const u = new URL(body.affiliate_url);
    if (!["http:", "https:"].includes(u.protocol)) throw 0;
  } catch {
    return NextResponse.json({ error: "invalid affiliate_url" }, { status: 400 });
  }
  const images = (body.image_urls ?? []).filter((u) => typeof u === "string" && u.length > 5).slice(0, 3);
  if (images.length === 0) {
    return NextResponse.json({ error: "at least 1 image_url required" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_API_KEY_APP;
  if (!apiKey) return NextResponse.json({ error: "AI not configured" }, { status: 500 });

  const system = `You write conversion-focused product landing pages.

Given a product brief (name + category + audience + notes), output STRICT JSON with these fields:

{
  "tagline":     "<100 chars subheadline that captures the product's promise",
  "hero_h1":     "outcome-driven headline (e.g. 'Hear every detail your monitors miss.')",
  "description": "2-3 short paragraphs explaining what the product does, who it's for, why it stands out (no marketing fluff, no superlatives without specifics)",
  "outcomes": [
    { "label": "<3-word benefit label>", "body": "<one specific sentence>" },
    { "label": "...", "body": "..." },
    { "label": "...", "body": "..." }
  ],
  "steps": [
    { "heading": "<3-5 word title>", "body": "<one short sentence — how the user uses or gets it>" },
    { "heading": "...", "body": "..." },
    { "heading": "...", "body": "..." }
  ],
  "tags": ["<short SEO/filter tag>", "<...>", "<...>", "<...>", "<...>"],
  "workflow_kind": "prompt-to-image" | "text-to-many" | "text-vs-text" | "list-to-buckets" | "voice-clone" | "video-to-text"
}

Rules:
- Be SPECIFIC. "Saves time" is bad. "Cuts mixing time from 3h to 40min" is good.
- Match the language of the input.
- No mentions of competing brands.
- workflow_kind: pick the animated demo pattern most relevant to the product type
  (use "prompt-to-image" for visual products, "voice-clone" for audio gear,
   "list-to-buckets" for tools that organize / categorize, etc.)` + OUTPUT_SAFETY_RULES;

  const userBrief = `PRODUCT NAME: ${body.name.trim()}
${body.category ? `CATEGORY: ${body.category.trim()}` : ""}
${body.target_audience ? `AUDIENCE: ${body.target_audience.trim().slice(0, 300)}` : ""}
${body.notes ? `NOTES: ${body.notes.trim().slice(0, 500)}` : ""}`;

  try {
    const anthropic = new Anthropic({ apiKey });
    const r = await anthropic.messages.create({
      model: HAIKU,
      max_tokens: 2500,
      system,
      messages: [{ role: "user", content: userBrief }],
    });
    const text = r.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("");
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("No JSON in response");
    const parsed = JSON.parse(m[0]) as Partial<BrainProduct>;

    const product: BrainProduct = {
      slug: slugify(body.name),
      name: body.name.trim(),
      category: body.category?.trim() ?? "Uncategorized",
      tagline: parsed.tagline?.slice(0, 120) ?? "",
      hero_h1: parsed.hero_h1?.slice(0, 200) ?? body.name.trim(),
      description: parsed.description ?? "",
      outcomes: Array.isArray(parsed.outcomes) ? parsed.outcomes.slice(0, 3) : [],
      steps: Array.isArray(parsed.steps) ? parsed.steps.slice(0, 3) : [],
      affiliate_url: body.affiliate_url,
      affiliate_program: body.affiliate_program,
      image_urls: images,
      workflow_kind: parsed.workflow_kind,
      price_display: body.price_display,
      tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 8) : [],
      generated_at: Date.now(),
      generated_by: "brain",
    };

    return NextResponse.json({ ok: true, product });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 },
    );
  }
}
