/**
 * POST /api/pitch — Generate a personalized pitch message for a prospect.
 *
 * Auth: x-brain-cron-secret or Bearer CRON_SECRET.
 *
 * Body: { prospect_id: string, platform: "linkedin_connect" | "linkedin_message" | "email" }
 *
 * Returns: { message, subject?, char_count, platform }
 */

import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  COUNTRY_TO_TIER,
  RESELLER_TIERS,
  type ResellerTierId,
} from "@/lib/stripe";
import { getAppApiKey, OUTPUT_SAFETY_RULES } from "@/lib/anthropic-client";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

type Platform = "linkedin_connect" | "linkedin_message" | "email";

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

// ── Platform constraints ─────────────────────────────────────────────────────

const PLATFORM_RULES: Record<
  Platform,
  { maxChars?: number; maxWords?: number; includeLink: boolean; format: string }
> = {
  linkedin_connect: {
    maxChars: 300,
    includeLink: false,
    format:
      "LinkedIn connection request. Max 300 characters. No links allowed. Short, friendly, personalized. Mention something specific about their business.",
  },
  linkedin_message: {
    maxChars: 500,
    includeLink: true,
    format:
      "LinkedIn follow-up message. Max 500 characters. Include the prospect page link naturally. Warm but professional.",
  },
  email: {
    maxWords: 200,
    includeLink: true,
    format:
      "Email using PAS formula (Problem-Agitate-Solution). Max 200 words. Include the prospect page link. Include a subject line. Professional but warm tone.",
  },
};

// ── POST ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!authOk(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { prospect_id: string; platform: Platform };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.prospect_id || !body.platform) {
    return Response.json(
      { error: "prospect_id and platform are required" },
      { status: 400 },
    );
  }

  const validPlatforms: Platform[] = [
    "linkedin_connect",
    "linkedin_message",
    "email",
  ];
  if (!validPlatforms.includes(body.platform)) {
    return Response.json(
      { error: `platform must be one of: ${validPlatforms.join(", ")}` },
      { status: 400 },
    );
  }

  // ── Fetch prospect ────────────────────────────────────────────────────────
  const svc = createServiceClient();
  const { data: prospect, error } = await svc
    .from("brain_global_prospects")
    .select("*")
    .eq("id", body.prospect_id)
    .maybeSingle();

  if (error || !prospect) {
    return Response.json(
      { error: "Prospect not found" },
      { status: 404 },
    );
  }

  // ── Tier & pricing ───────────────────────────────────────────────────────
  const cc = (prospect.country_code || "RO").toUpperCase();
  const tierId: ResellerTierId = COUNTRY_TO_TIER[cc] || "southeast";
  const tier = RESELLER_TIERS[tierId];
  const currencySymbol = tier.currency === "usd" ? "$" : "€";
  const price = `${currencySymbol}${tier.clientCharge}`;

  // ── Check for existing prospect page ──────────────────────────────────────
  let pageSlug: string | null = null;
  const { data: pageData } = await svc
    .from("prospect_pages")
    .select("slug")
    .eq("prospect_id", body.prospect_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (pageData) {
    pageSlug = pageData.slug;
  }

  const pageUrl = pageSlug
    ? `https://markethubpromo.com/p/${pageSlug}`
    : null;

  // ── Platform rules ───────────────────────────────────────────────────────
  const rules = PLATFORM_RULES[body.platform];

  // ── Generate pitch via Claude Haiku ──────────────────────────────────────
  const anthropic = new Anthropic({ apiKey: getAppApiKey() });

  const systemPrompt = `You are a professional business development consultant writing outreach messages for a social media marketing service.

${rules.format}

${rules.includeLink && pageUrl ? `Include this link naturally in your message: ${pageUrl}` : ""}
${rules.includeLink && !pageUrl ? "Do not include any links — no prospect page exists yet." : ""}

${body.platform === "email" ? 'Format your response as:\nSUBJECT: [subject line]\n\n[email body]' : "Return ONLY the message text, nothing else."}

${OUTPUT_SAFETY_RULES}`;

  const userPrompt = `Prospect details:
- Business: ${prospect.business_name || prospect.domain || "Unknown"}
- Domain: ${prospect.domain || "N/A"}
- Industry: ${prospect.industry || "marketing agency"}
- Country: ${prospect.country_code || "N/A"}
- Contact: ${prospect.contact_name || prospect.email || "the team"}
- Service price: ${price}/month
${prospect.instagram ? `- Instagram: @${prospect.instagram}` : ""}
${prospect.last_post_days ? `- Last social media post: ${prospect.last_post_days} days ago` : ""}
${prospect.notes ? `- Notes: ${prospect.notes}` : ""}

Write a personalized ${body.platform.replace("_", " ")} for this prospect.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-20250414",
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    let message = text.trim();
    let subject: string | undefined;

    // Extract subject for email
    if (body.platform === "email") {
      const subjectMatch = message.match(
        /^SUBJECT:\s*(.+?)(?:\n|$)/i,
      );
      if (subjectMatch) {
        subject = subjectMatch[1].trim();
        message = message
          .replace(/^SUBJECT:\s*.+?\n\n?/i, "")
          .trim();
      }
    }

    // Enforce character limits
    if (rules.maxChars && message.length > rules.maxChars) {
      message = message.slice(0, rules.maxChars - 3) + "...";
    }

    return Response.json({
      message,
      ...(subject ? { subject } : {}),
      char_count: message.length,
      platform: body.platform,
    });
  } catch (err) {
    console.error("[pitch] AI generation failed:", err);
    return Response.json(
      { error: "Failed to generate pitch" },
      { status: 500 },
    );
  }
}
