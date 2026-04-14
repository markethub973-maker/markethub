/**
 * POST /api/ai/extract-hooks — given a caption, pull out the "hook-worthy"
 * opening lines that could be reused on future posts. Returns up to 5
 * self-contained hooks (1 line each) with a brief rationale.
 *
 * Used by the Hook Library to add hooks from any past post with one click.
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
    caption?: string;
  } | null;

  if (!body?.caption || body.caption.trim().length < 20) {
    return NextResponse.json({ error: "caption too short (min 20 chars)" }, { status: 400 });
  }
  if (body.caption.length > 5000) {
    return NextResponse.json({ error: "caption too long (max 5000)" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_API_KEY_APP;
  if (!apiKey) return NextResponse.json({ error: "AI not configured" }, { status: 500 });

  const system = `You extract REUSABLE HOOKS from social media captions. A good hook is:
- One line (<=120 chars)
- Stops the scroll — curiosity / contradiction / specificity / pain
- Self-contained (works without the rest of the post)
- Not a generic platitude ("Life is about the journey...")

Return up to 5 hooks actually present OR synthesizable from the caption. If the caption has no good hook material, return fewer.

Output STRICT JSON:
{ "hooks": [
  { "hook": "<=120 chars, one line", "type": "question|contradiction|stat|story|contrarian", "rationale": "one short sentence why it works" }
] }

Rules:
- Language must match the caption.
- Do NOT invent stats or quotes not in the source.
- Each hook must be distinct (different angle).`;

  try {
    const anthropic = new Anthropic({ apiKey });
    const r = await anthropic.messages.create({
      model: HAIKU,
      max_tokens: 1000,
      system,
      messages: [{ role: "user", content: `Caption:\n${body.caption.trim()}` }],
    });
    const text = r.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("");
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("No JSON in response");
    const parsed = JSON.parse(m[0]) as {
      hooks?: Array<{ hook: string; type: string; rationale: string }>;
    };
    const hooks = (parsed.hooks ?? [])
      .filter((h) => h.hook && h.hook.length > 0 && h.hook.length <= 140)
      .slice(0, 5);
    return NextResponse.json({ ok: true, hooks });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
