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

const CLAUDE_MODEL = "claude-haiku-4-5-20251001";
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
