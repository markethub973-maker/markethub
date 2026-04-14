/**
 * POST /api/ai/alt-text — generate accessibility alt-text for an image URL.
 *
 * Uses Claude Haiku vision. Returns concise, descriptive text (<=150 chars)
 * suitable for screen readers and SEO. Works with any public image URL
 * (including Fal.ai outputs + Supabase storage).
 */

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

const HAIKU = "claude-haiku-4-5-20251001";

export async function POST(req: NextRequest) {
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    image_url?: string;
    context?: string;
  } | null;

  if (!body?.image_url) {
    return NextResponse.json({ error: "image_url required" }, { status: 400 });
  }
  try {
    const u = new URL(body.image_url);
    if (!["http:", "https:"].includes(u.protocol)) {
      return NextResponse.json({ error: "invalid url" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "invalid url" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_API_KEY_APP;
  if (!apiKey) return NextResponse.json({ error: "AI not configured" }, { status: 500 });

  const ctx = body.context?.trim().slice(0, 300);

  try {
    const anthropic = new Anthropic({ apiKey });
    const r = await anthropic.messages.create({
      model: HAIKU,
      max_tokens: 200,
      system:
        "You write accessibility alt-text for images. Output ONLY the alt text — no prefix, no quotes, no explanation. Max 150 characters. Describe what's visually present (subject, setting, action, mood). Avoid 'image of' / 'picture of'. Match the image's language context if provided.",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "url", url: body.image_url },
            },
            {
              type: "text",
              text: ctx
                ? `Context for this image: ${ctx}\n\nWrite the alt-text.`
                : "Write the alt-text.",
            },
          ],
        },
      ],
    });
    const text = r.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { text: string }).text)
      .join("")
      .trim()
      .replace(/^["']|["']$/g, "")
      .slice(0, 150);
    return NextResponse.json({ ok: true, alt_text: text });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 },
    );
  }
}
