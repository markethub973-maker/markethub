/**
 * Multi-provider LLM helper for the Alex CEO stack.
 *
 * Default: Claude Haiku 4.5 (fast, cheap, good prose).
 * Fallback: OpenAI GPT-5-nano if Anthropic fails or is rate-limited.
 *
 * Usage:
 *   const text = await generateJson(systemPrompt, userContent, { maxTokens: 600 });
 *
 * Returns the first string that parses as JSON inside the response.
 */

import Anthropic from "@anthropic-ai/sdk";

// Sonnet 4.6 = dramatically better strategic reasoning than Haiku, still ~5x
// cheaper than Opus. Sweet-spot for Alex's boardroom synthesis.
const CLAUDE_MODEL = "claude-sonnet-4-6";
const OPENAI_MODEL = "gpt-5-nano";

interface GenerateOpts {
  maxTokens?: number;
  preferProvider?: "claude" | "openai";
}

async function callClaude(system: string, user: string, maxTokens: number): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_API_KEY_APP;
  if (!apiKey) return null;
  try {
    const client = new Anthropic({ apiKey });
    const r = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    });
    return r.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { text: string }).text)
      .join("");
  } catch {
    return null;
  }
}

async function callOpenAI(system: string, user: string, maxTokens: number): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  try {
    // /v1/responses uses gpt-5-nano and returns `output` array.
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        input: `${system}\n\n---\n\n${user}`,
        max_output_tokens: maxTokens,
        store: false,
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      output?: Array<{ content?: Array<{ text?: string }> }>;
      output_text?: string;
    };
    if (data.output_text) return data.output_text;
    // Walk output array (Responses API shape)
    const parts = (data.output ?? [])
      .flatMap((o) => o.content ?? [])
      .map((c) => c.text ?? "")
      .filter(Boolean);
    return parts.join("\n");
  } catch {
    return null;
  }
}

export async function generateText(
  system: string,
  user: string,
  opts: GenerateOpts = {},
): Promise<string | null> {
  const maxTokens = opts.maxTokens ?? 800;
  const order = opts.preferProvider === "openai"
    ? [callOpenAI, callClaude]
    : [callClaude, callOpenAI];
  for (const fn of order) {
    const out = await fn(system, user, maxTokens);
    if (out && out.length > 5) return out;
  }
  return null;
}

export function extractJson<T = unknown>(text: string | null): T | null {
  if (!text) return null;
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]) as T;
  } catch {
    return null;
  }
}

export async function generateJson<T = unknown>(
  system: string,
  user: string,
  opts: GenerateOpts = {},
): Promise<T | null> {
  const text = await generateText(system, user, opts);
  return extractJson<T>(text);
}

/**
 * Dual-agent pipeline: one provider writes, the OTHER reviews for language
 * correctness (non-existent words, awkward grammar, tone drift). Produces
 * noticeably more natural copy in RO/EN/DE/ES/IT at the cost of one extra
 * round-trip. Use for high-stakes outputs (cold outreach, client demos).
 */
export interface ReviewedJsonResult<T> {
  first: T | null;
  reviewed: T | null;
  notes?: string;
}

export async function generateJsonReviewed<T extends Record<string, unknown>>(
  system: string,
  user: string,
  language: string, // e.g. "ro", "en", "de"
  opts: GenerateOpts = {},
): Promise<ReviewedJsonResult<T>> {
  // PASS 1 — writer (Claude by default)
  const first = await generateJson<T>(system, user, { ...opts, preferProvider: "claude" });
  if (!first) return { first: null, reviewed: null };

  // PASS 2 — reviewer (OpenAI) checks for language correctness
  const reviewSystem = `You are a bilingual copy editor reviewing a draft written by another AI in language code "${language}".

Rules:
- Keep the meaning, structure, JSON keys, and length IDENTICAL.
- Fix any invented/non-existent words, wrong conjugations, diacritics issues.
- Make the prose sound like a native speaker — warm and human, not academic, not corporate, not slangy.
- If the draft is already native-quality, return it unchanged.
- Output ONLY the corrected JSON in the same shape as the input.`;

  const reviewerInput = `Language: ${language}
Draft JSON to review:
${JSON.stringify(first)}`;

  const reviewed = await generateJson<T>(reviewSystem, reviewerInput, {
    preferProvider: "openai",
    maxTokens: opts.maxTokens ?? 800,
  });

  return {
    first,
    reviewed: reviewed ?? first, // if reviewer fails, keep first
  };
}
