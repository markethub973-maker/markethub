import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import { safeAnthropic } from "@/lib/serviceGuard";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `You are a sales qualification expert. Given a list of search results and an offer, score each result as a potential lead.

For each result evaluate:
- Are they actively looking for this type of offer? (intent)
- Do they match the target profile?
- Is the timing good (recent post/activity)?
- Can they afford it?

Return ONLY valid JSON array:
[
  {
    "index": 0,
    "score": 8,
    "label": "hot",
    "signals": ["Caută activ", "Buget menționat", "Eveniment specific"],
    "contact_hint": "name or handle if visible",
    "why": "one sentence why this is a good lead"
  }
]

score: 1-10 (10 = perfect prospect, 1 = not relevant)
label: "hot" (8-10), "warm" (5-7), "cold" (1-4)`;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { results, offer_summary, intent_signals } = await req.json();
  if (!results?.length) return NextResponse.json({ error: "Results required" }, { status: 400 });

  const prompt = `
Offer: ${offer_summary}
Intent signals to look for: ${(intent_signals || []).join(", ")}

Results to score (${results.length} items):
${results.slice(0, 20).map((r: any, i: number) => `
[${i}] Title: ${r.title || r.name || ""}
Description: ${(r.description || r.text || r.snippet || "").slice(0, 200)}
URL: ${r.url || r.profile_url || ""}
Platform: ${r.platform || ""}
`).join("\n")}`;

  const result = await safeAnthropic(() =>
    anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2000,
      system: SYSTEM,
      messages: [{ role: "user", content: prompt }],
    })
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error, service: "anthropic", degraded: true }, { status: 503 });
  }

  try {
    const text = result.data.content[0].type === "text" ? result.data.content[0].text : "";
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return NextResponse.json({ error: "AI parse error" }, { status: 500 });
    return NextResponse.json({ scored: JSON.parse(jsonMatch[0]) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
