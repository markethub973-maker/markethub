/**
 * POST /api/ai/recycle — given a previously published post caption,
 * generate 3 refreshed variations ready for re-publication.
 *
 * Different from /api/ai/caption-variants (which A/Bs a draft):
 * recycle assumes the original already resonated with the audience,
 * so the variants PRESERVE the hook/structure and change the framing
 * just enough to feel new (different angle, fresh example, updated
 * stat, new CTA). Perfect for evergreen content rotation.
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
  const voicePrompt = await buildBrandVoicePrompt(user.id, body?.client_id);

  const daysAgo = body.original_date
    ? Math.max(0, Math.floor((Date.now() - new Date(body.original_date).getTime()) / (1000 * 60 * 60 * 24)))
    : null;

  const system = `You refresh a previously published caption for re-publication. The original performed — assume the core idea works. Your job is to make each variant feel FRESH without diluting the winning hook.

Produce THREE variants with DISTINCT refresh angles:
  1. "seasonal" — tie the core idea to a current moment (new year, new quarter, anniversary, time-of-year reference)
  2. "counterexample" — flip the framing: instead of "do X", explore "what happens if you DON'T do X" — same lesson, opposite entry
  3. "specific-story" — take the general claim and anchor it in a concrete mini-story or stat (real or clearly hypothetical)

Output STRICT JSON:
{
  "variants": [
    { "angle": "seasonal", "caption": "..." },
    { "angle": "counterexample", "caption": "..." },
    { "angle": "specific-story", "caption": "..." }
  ]
}

Rules:
- Keep the ORIGINAL language.
- Match original platform conventions (${platform}).
- Preserve the core claim/lesson — only change framing.
- Hashtags: keep them if original had them, drop if it didn't.
- Each caption must be standalone-readable (no "as I said before").${voicePrompt}${daysAgo !== null ? `\nContext: the original ran ${daysAgo} days ago.` : ""}`;

  try {
    const anthropic = new Anthropic({ apiKey });
    const r = await anthropic.messages.create({
      model: HAIKU,
      max_tokens: 1500,
      system,
      messages: [{ role: "user", content: `Original caption:\n${body.caption.trim()}` }],
    });
    const text = r.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { text: string }).text)
      .join("");
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("No JSON in response");
    const parsed = JSON.parse(m[0]) as { variants?: Array<{ angle: string; caption: string }> };
    const variants = (parsed.variants ?? [])
      .filter((v) => v.angle && v.caption)
      .slice(0, 3);
    return NextResponse.json({ ok: true, variants, original: body.caption.trim() });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 },
    );
  }
}
