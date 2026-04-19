/**
 * POST /api/prospect-page — Create a new personalized prospect landing page.
 * GET  /api/prospect-page?slug=xxx — Get visit stats for a prospect page.
 *
 * Auth: x-brain-cron-secret or Bearer CRON_SECRET.
 */

import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  COUNTRY_TO_TIER,
  RESELLER_TIERS,
  type ResellerTierId,
} from "@/lib/stripe";
import { getAppApiKey, OUTPUT_SAFETY_RULES } from "@/lib/anthropic-client";
import { webRead } from "@/lib/webSearch";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// ── Auth ─────────────────────────────────────────────────────────────────────

function authOk(req: NextRequest): boolean {
  const cronHeader = req.headers.get("x-brain-cron-secret");
  if (
    cronHeader &&
    process.env.BRAIN_CRON_SECRET &&
    cronHeader === process.env.BRAIN_CRON_SECRET
  ) {
    return true;
  }
  const auth = req.headers.get("authorization");
  if (
    auth &&
    process.env.CRON_SECRET &&
    auth === `Bearer ${process.env.CRON_SECRET}`
  ) {
    return true;
  }
  return false;
}

// ── Slug helper ──────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

// ── GET: Visit stats ─────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!authOk(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) {
    return Response.json({ error: "Missing slug" }, { status: 400 });
  }

  const svc = createServiceClient();
  const { data, error } = await svc
    .from("prospect_pages")
    .select("visit_count, last_visited_at, created_at")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json(data);
}

// ── POST: Create prospect page ──────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!authOk(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    prospect_id?: string;
    business_name: string;
    website: string;
    industry?: string;
    instagram?: string;
    country_code?: string;
  };

  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.business_name || !body.website) {
    return Response.json(
      { error: "business_name and website are required" },
      { status: 400 },
    );
  }

  // ── Slug ─────────────────────────────────────────────────────────────────
  const baseSlug = slugify(body.business_name);
  const svc = createServiceClient();

  // Ensure unique slug
  let slug = baseSlug;
  const { data: existing } = await svc
    .from("prospect_pages")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (existing) {
    slug = `${baseSlug}-${Date.now().toString(36)}`;
  }

  // ── Tier & pricing ───────────────────────────────────────────────────────
  const cc = (body.country_code || "RO").toUpperCase();
  const tierId: ResellerTierId = COUNTRY_TO_TIER[cc] || "southeast";
  const tier = RESELLER_TIERS[tierId];
  const priceAmount = tier.clientCharge;
  const priceCurrency = tier.currency;

  // ── Web read (best effort) ───────────────────────────────────────────────
  let siteContext = "";
  try {
    const webResult = await webRead(body.website);
    if (webResult.success && webResult.text) {
      siteContext = webResult.text.slice(0, 2000);
    }
  } catch {
    // Non-critical — we generate posts with whatever info we have
  }

  // ── Industry detection ───────────────────────────────────────────────────
  const industry =
    body.industry ||
    (siteContext
      ? "detected from website"
      : "general business");

  // ── Generate sample posts via Claude Haiku ───────────────────────────────
  let samplePosts: Array<{
    title: string;
    caption: string;
    emoji: string;
  }> = [];

  try {
    const anthropic = new Anthropic({ apiKey: getAppApiKey() });

    const systemPrompt = `You are a social media content creator for businesses. Generate exactly 3 social media post ideas for the business described below.

Each post must have:
- title: short catchy title (3-5 words)
- caption: engaging caption (~50 words, professional but warm)
- emoji: one relevant emoji

Return ONLY valid JSON — an array of 3 objects with keys: title, caption, emoji.

${OUTPUT_SAFETY_RULES}`;

    const userPrompt = `Business: ${body.business_name}
Website: ${body.website}
Industry: ${industry}
${body.instagram ? `Instagram: @${body.instagram.replace(/^@/, "")}` : ""}
${siteContext ? `\nWebsite content:\n${siteContext.slice(0, 1000)}` : ""}

Generate 3 social media posts for this business.`;

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-20250414",
      max_tokens: 800,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Extract JSON array from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed) && parsed.length > 0) {
        samplePosts = parsed.slice(0, 5).map(
          (p: { title?: string; caption?: string; emoji?: string }) => ({
            title: String(p.title || "Post"),
            caption: String(p.caption || ""),
            emoji: String(p.emoji || "📝"),
          }),
        );
      }
    }
  } catch (err) {
    console.error("[prospect-page] AI generation failed:", err);
  }

  // Fallback if AI failed
  if (samplePosts.length === 0) {
    samplePosts = [
      {
        title: "Welcome to Our Story",
        caption: `Discover what makes ${body.business_name} unique. We are committed to delivering exceptional quality and service to every client.`,
        emoji: "👋",
      },
      {
        title: "Behind the Scenes",
        caption: `Take a look at the passion and dedication that drives ${body.business_name} every day. Our team works hard to exceed your expectations.`,
        emoji: "✨",
      },
      {
        title: "What Our Clients Say",
        caption: `Nothing speaks louder than happy clients. See why businesses choose ${body.business_name} time and time again.`,
        emoji: "⭐",
      },
    ];
  }

  // ── Save to DB ───────────────────────────────────────────────────────────
  const { data: page, error } = await svc
    .from("prospect_pages")
    .insert({
      slug,
      prospect_id: body.prospect_id || null,
      business_name: body.business_name,
      website: body.website,
      industry: body.industry || industry,
      instagram: body.instagram || null,
      last_post_days: null,
      sample_posts: samplePosts,
      price_amount: priceAmount,
      price_currency: priceCurrency,
      tier: tierId,
      visit_count: 0,
      last_visited_at: null,
    })
    .select("id, slug")
    .single();

  if (error) {
    console.error("[prospect-page] Insert error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({
    slug,
    url: `https://markethubpromo.com/p/${slug}`,
    page_id: page.id,
  });
}
