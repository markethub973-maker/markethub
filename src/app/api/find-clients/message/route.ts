import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import { safeAnthropic } from "@/lib/serviceGuard";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `You are an international expert copywriter for outreach messages. Detect the language of the lead's info and the user's input — write all messages in that same language. Write SHORT, NATURAL, non-salesy messages.

Rules:
- Max 3 sentences
- Start with something specific about them (not generic)
- No "I hope this message finds you well"
- No "I'd like to offer you..."
- Sound like a person, not a company
- Match the platform tone (Reddit = casual, Email = slightly more formal, LinkedIn = professional)
- Include a soft call-to-action (question, not a pitch)

Return JSON:
{
  "messages": {
    "reddit": "message for Reddit DM",
    "email": "message for email (with subject line)",
    "facebook": "message for Facebook",
    "generic": "generic message"
  },
  "subject_line": "email subject line",
  "best_platform": "which platform is best for this specific lead"
}`;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { lead, offer_summary, outreach_hook } = await req.json();
  if (!lead || !offer_summary) return NextResponse.json({ error: "lead and offer_summary required" }, { status: 400 });

  const prompt = `
Lead info:
- Name/Handle: ${lead.contact_hint || lead.title || "unknown"}
- Platform: ${lead.platform}
- What they posted/searched: ${(lead.description || lead.text || "").slice(0, 300)}
- Intent signals: ${(lead.signals || []).join(", ")}
- Score: ${lead.score}/10

Offer: ${offer_summary}
Suggested opening hook: ${outreach_hook || ""}

Write personalized outreach messages for this specific lead.`;

  const result = await safeAnthropic(() =>
    anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 800,
      system: SYSTEM,
      messages: [{ role: "user", content: prompt }],
    })
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error, service: "anthropic", degraded: true }, { status: 503 });
  }

  try {
    const text = result.data.content[0].type === "text" ? result.data.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ error: "AI parse error" }, { status: 500 });
    // Sanitize unescaped control characters inside JSON string values.
    // Walk char-by-char: track whether we're inside a JSON string,
    // and escape any literal newline/tab that appears there.
    const raw = jsonMatch[0];
    let sanitized = "";
    let inString = false;
    for (let i = 0; i < raw.length; i++) {
      const ch = raw[i];
      if (ch === '"' && (i === 0 || raw[i - 1] !== "\\")) {
        inString = !inString;
        sanitized += ch;
      } else if (inString && ch === "\n") {
        sanitized += "\\n";
      } else if (inString && ch === "\r") {
        sanitized += "\\r";
      } else if (inString && ch === "\t") {
        sanitized += "\\t";
      } else {
        sanitized += ch;
      }
    }
    return NextResponse.json(JSON.parse(sanitized));
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}