/**
 * POST /api/v1/alt-text — generate accessibility alt-text for an image URL.
 *
 * Body:
 *   {
 *     "image_url": "https://cdn.example.com/photo.jpg",
 *     "context": "optional caption or post intent (<= 300 chars)"
 *   }
 *
 * Returns { ok: true, alt_text: "..." } — max 150 chars.
 * Plan-gated: Pro+ only (Anthropic vision billed per request).
 */

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { verifyToken } from "@/lib/apiTokens";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

const HAIKU = "claude-haiku-4-5-20251001";

export async function POST(req: NextRequest) {
  const auth = await verifyToken(
    req.headers.get("authorization"),
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
  );
  if (!auth) {
    return NextResponse.json({ error: "Invalid or missing API token" }, { status: 401 });
  }

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

  // Plan gate — admins bypass.
  const service = createServiceClient();
  const { data: profile } = await service
    .from("profiles")
    .select("plan,subscription_plan,is_admin")
    .eq("id", auth.user_id)
    .maybeSingle();
  const plan = (profile?.plan as string | null) ?? (profile?.subscription_plan as string | null) ?? "starter";
  const isAdmin = Boolean(profile?.is_admin);
  if (!isAdmin && !["pro", "studio", "agency", "business", "agency"].includes(plan)) {
    return NextResponse.json(
      { error: "Alt-text generation requires Pro plan or higher", upgrade_required: true },
      { status: 403 },
    );
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
            { type: "image", source: { type: "url", url: body.image_url } },
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
