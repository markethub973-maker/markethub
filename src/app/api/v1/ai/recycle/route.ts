/**
 * POST /api/v1/ai/recycle — Bearer-token Evergreen Post Recycler.
 * Refresh a previously published caption in 3 angles. Pro+.
 */

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { authorizeV1 } from "@/lib/apiV1Auth";
import { buildBrandVoicePrompt } from "@/lib/brandVoice";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

const HAIKU = "claude-haiku-4-5-20251001";

export async function POST(req: NextRequest) {
  const auth = await authorizeV1(req);
  if (!auth.ok) return auth.response;

  const body = (await req.json().catch(() => null)) as {
    caption?: string;
    platform?: string;
    original_date?: string;
    client_id?: string;
  } | null;

  if (!body?.caption || body.caption.trim().length < 10) {
    return NextResponse.json({ error: "caption too short (min 10 chars)" }, { status: 400 });
  }
  if (body.caption.length > 3000) {
    return NextResponse.json({ error: "caption too long (max 3000)" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_API_KEY_APP;
  if (!apiKey) return NextResponse.json({ error: "AI not configured" }, { status: 500 });

  const platform = (body.platform ?? "instagram").toLowerCase();
  const voicePrompt = await buildBrandVoicePrompt(auth.userId, body?.client_id);
  const daysAgo = body.original_date
    ? Math.max(0, Math.floor((Date.now() - new Date(body.original_date).getTime()) / (1000 * 60 * 60 * 24)))
    : null;

  const system = `You refresh a previously published caption for re-publication. The original performed — assume the core idea works. Your job is to make each variant feel FRESH without diluting the winning hook.

Produce THREE variants with DISTINCT refresh angles:
  1. "seasonal" — tie to a current moment (new year, new quarter, time-of-year)
  2. "counterexample" — flip framing: "what happens if you DON'T do X" — same lesson, opposite entry
  3. "specific-story" — anchor the general claim in a concrete mini-story or stat

Output STRICT JSON:
{ "variants": [
  { "angle": "seasonal", "caption": "..." },
  { "angle": "counterexample", "caption": "..." },
  { "angle": "specific-story", "caption": "..." }
] }

Rules:
- Keep the ORIGINAL language.
- Match platform conventions (${platform}).
- Preserve the core claim/lesson — only change framing.
- Hashtags: keep if original had them, drop if it didn't.
- Each caption standalone-readable.${voicePrompt}${daysAgo !== null ? `\nContext: original ran ${daysAgo} days ago.` : ""}`;

  try {
    const anthropic = new Anthropic({ apiKey });
    const r = await anthropic.messages.create({
      model: HAIKU,
      max_tokens: 1500,
      system,
      messages: [{ role: "user", content: `Original caption:\n${body.caption.trim()}` }],
    });
    const text = r.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("");
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("No JSON in response");
    const parsed = JSON.parse(m[0]) as { variants?: Array<{ angle: string; caption: string }> };
    const variants = (parsed.variants ?? []).filter((v) => v.angle && v.caption).slice(0, 3);
    return NextResponse.json({ ok: true, variants, original: body.caption.trim() });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
