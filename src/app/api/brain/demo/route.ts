/**
 * POST /api/brain/demo — one-shot demo generator for a prospect.
 *
 * Body: { domain: string, to_email?: string }
 * 1. Fetches their homepage, extracts brand context (name, tone, offering).
 * 2. Generates 5 platform-specific captions + 3 short image prompts.
 * 3. (Future: actually call fal.ai for images. Today: return the prompts
 *    so the operator can paste them into /studio/image for real output.)
 * 4. If to_email provided, sends the demo via Resend from Alex.
 *
 * Auth: brain_admin cookie OR x-brain-cron-secret.
 */

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { OUTPUT_SAFETY_RULES } from "@/lib/anthropic-client";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const HAIKU = "claude-haiku-4-5-20251001";

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 3500);
}

async function fetchSite(domain: string): Promise<string> {
  try {
    const url = domain.startsWith("http") ? domain : `https://${domain}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "MarketHubPro/1.0 (demo-research)" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return "";
    return stripHtml(await res.text());
  } catch {
    return "";
  }
}

export async function POST(req: NextRequest) {
  const cookieOk = req.cookies.get("brain_admin")?.value === "1";
  const cronOk =
    req.headers.get("x-brain-cron-secret") &&
    req.headers.get("x-brain-cron-secret") === process.env.BRAIN_CRON_SECRET;
  if (!cookieOk && !cronOk) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    domain?: string;
    to_email?: string;
  };
  if (!body.domain) {
    return NextResponse.json({ error: "domain required" }, { status: 400 });
  }

  const snippet = await fetchSite(body.domain);
  if (!snippet) {
    return NextResponse.json({ error: "Could not fetch site" }, { status: 400 });
  }
  const isRo = body.domain.endsWith(".ro");

  const apiKey = process.env.ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_API_KEY_APP;
  if (!apiKey) return NextResponse.json({ error: "AI not configured" }, { status: 500 });
  const anthropic = new Anthropic({ apiKey });

  const system = `You are Alex, founder of MarketHub Pro. Generate a free sample "demo" for a prospect — 5 social captions and 3 image prompts — calibrated to their actual brand voice inferred from their website.

Output STRICT JSON:
{
  "brand_summary": "2-sentence summary of what they do + who their customer is",
  "tone": "one-line tone description (e.g. 'warm, premium, clinical trust')",
  "captions": [
    { "platform": "instagram" | "linkedin" | "facebook" | "tiktok" | "twitter", "text": "..." },
    ... 5 total
  ],
  "image_prompts": [
    "detailed prompt for AI image 1, max 40 words",
    "prompt 2",
    "prompt 3"
  ]
}

Rules:
- Captions in ${isRo ? "Romanian" : "English"}, max 220 chars each, include 1-3 relevant hashtags.
- Distribute across platforms (ex: 2 Instagram, 1 LinkedIn, 1 Facebook, 1 TikTok).
- Image prompts must be usable for a fal.ai or DALL·E call — photographic, brand-appropriate, no people faces, no text-in-image.
- Ground every caption in something specific from the website snippet.
- Tone: warm human founder — professional but conversational, like a peer talking. Not academic, not corporate, not slangy.` + OUTPUT_SAFETY_RULES;

  const r = await anthropic.messages.create({
    model: HAIKU,
    max_tokens: 1400,
    system,
    messages: [
      {
        role: "user",
        content: `Website snippet for ${body.domain}:\n${snippet}`,
      },
    ],
  });
  const text = r.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { text: string }).text)
    .join("");
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return NextResponse.json({ error: "Bad AI response" }, { status: 500 });
  const demo = JSON.parse(m[0]) as {
    brand_summary: string;
    tone: string;
    captions: Array<{ platform: string; text: string }>;
    image_prompts: string[];
  };

  // Optional: email the demo to the prospect as HTML.
  if (body.to_email && process.env.RESEND_API_KEY) {
    const captionsHtml = demo.captions
      .map(
        (c) =>
          `<div style="margin:12px 0;padding:12px;border-left:3px solid #F59E0B;background:#fafafa;"><b>${c.platform.toUpperCase()}</b><br/><span style="white-space:pre-wrap">${c.text}</span></div>`,
      )
      .join("");
    const imgHtml = demo.image_prompts.map((p, i) => `<li><b>Image ${i + 1}:</b> ${p}</li>`).join("");
    const html = `<div style="font-family:system-ui,sans-serif;color:#222;max-width:640px;line-height:1.55;">
      <p>Hi,</p>
      <p>Alex here — as promised, here's a free sample demo based on your site (${body.domain}).</p>
      <p><b>Brand snapshot:</b> ${demo.brand_summary}</p>
      <p><b>Voice:</b> ${demo.tone}</p>
      <h3 style="margin-top:20px;">5 sample captions</h3>
      ${captionsHtml}
      <h3 style="margin-top:20px;">3 image concepts</h3>
      <ul>${imgHtml}</ul>
      <p style="margin-top:20px;">If these feel right, the full package (60 captions + 20 images + calendar + 20–50 leads + strategy call) ships in 5–7 days. Link for checkout: <a href="${isRo ? "https://get.markethubpromo.com/ro" : "https://get.markethubpromo.com/intl"}">${isRo ? "€499 (Romania)" : "€1000 (Global)"}</a>.</p>
      <p>Happy to adjust any of the above — reply with feedback.</p>
      <p>— Alex<br/><span style="color:#888;font-size:12px;">Founder, MarketHub Pro · alex@markethubpromo.com</span></p>
    </div>`;
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Alex <alex@markethubpromo.com>",
          to: [body.to_email],
          bcc: ["office@markethubpromo.com"],
          subject: `Your free sample demo — ${body.domain}`,
          html,
          reply_to: "alex@markethubpromo.com",
        }),
      });
    } catch {
      /* non-fatal */
    }
  }

  return NextResponse.json({ ok: true, domain: body.domain, demo });
}
