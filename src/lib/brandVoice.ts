/**
 * Brand voice — load + apply helpers.
 *
 * Any AI feature that generates user-facing copy calls
 * `buildBrandVoicePrompt(userId)` and prepends the result to its
 * system prompt. Returns empty string if user hasn't set one up yet,
 * so callers can naively use it.
 */

import { createServiceClient } from "@/lib/supabase/service";

export interface ContentStrategy {
  icp: string | null;             // Ideal Customer Profile — 1-3 sentences
  values: string[];               // 3 brand values (short phrases)
  topic_clusters: string[];       // 5 content clusters (e.g. "AI workflow automation")
  north_star: string | null;      // One sentence: what does success look like?
}

export interface BrandVoice {
  tone: string | null;
  vocabulary: string | null;
  style_guide: string | null;
  dos: string[];
  donts: string[];
  ai_summary: string | null;
  strategy: ContentStrategy | null;
}

export async function loadBrandVoice(userId: string): Promise<BrandVoice | null> {
  const service = createServiceClient();
  // Try with `strategy` column first; fall back to base columns if the
  // column doesn't exist yet (pre-migration environments).
  let data: Record<string, unknown> | null = null;
  const withStrategy = await service
    .from("user_brand_voice")
    .select("tone,vocabulary,style_guide,dos,donts,ai_summary,strategy")
    .eq("user_id", userId)
    .maybeSingle();
  if (withStrategy.error && withStrategy.error.code === "42703") {
    // column "strategy" does not exist — older schema
    const fallback = await service
      .from("user_brand_voice")
      .select("tone,vocabulary,style_guide,dos,donts,ai_summary")
      .eq("user_id", userId)
      .maybeSingle();
    data = fallback.data as Record<string, unknown> | null;
  } else {
    data = withStrategy.data as Record<string, unknown> | null;
  }
  if (!data) return null;
  const s = data.strategy as ContentStrategy | undefined | null;
  return {
    tone: (data.tone as string | null) ?? null,
    vocabulary: (data.vocabulary as string | null) ?? null,
    style_guide: (data.style_guide as string | null) ?? null,
    dos: (data.dos as string[]) ?? [],
    donts: (data.donts as string[]) ?? [],
    ai_summary: (data.ai_summary as string | null) ?? null,
    strategy: s
      ? {
          icp: s.icp ?? null,
          values: Array.isArray(s.values) ? s.values : [],
          topic_clusters: Array.isArray(s.topic_clusters) ? s.topic_clusters : [],
          north_star: s.north_star ?? null,
        }
      : null,
  };
}

/**
 * Returns a prompt fragment ready to be appended to any AI system
 * prompt. Empty string if no voice configured — caller adds nothing.
 */
export async function buildBrandVoicePrompt(userId: string): Promise<string> {
  const bv = await loadBrandVoice(userId);
  if (!bv) return "";
  const sections: string[] = [];

  // Brand voice (tone, style, dos/donts)
  if (bv.ai_summary) {
    sections.push(`## Brand voice\n${bv.ai_summary}`);
  } else {
    const parts: string[] = [];
    if (bv.tone) parts.push(`Tone: ${bv.tone}`);
    if (bv.vocabulary) parts.push(`Vocabulary: ${bv.vocabulary}`);
    if (bv.style_guide) parts.push(`Style rules: ${bv.style_guide}`);
    if (bv.dos.length > 0) parts.push(`Always: ${bv.dos.join("; ")}`);
    if (bv.donts.length > 0) parts.push(`Never: ${bv.donts.join("; ")}`);
    if (parts.length > 0) sections.push(`## Brand voice\n${parts.join("\n")}`);
  }

  // Content strategy — who we're writing for and why
  if (bv.strategy) {
    const s = bv.strategy;
    const sparts: string[] = [];
    if (s.icp) sparts.push(`ICP (ideal customer): ${s.icp}`);
    if (s.values.length > 0) sparts.push(`Brand values: ${s.values.join(" · ")}`);
    if (s.topic_clusters.length > 0) sparts.push(`Topic clusters we cover: ${s.topic_clusters.join(" · ")}`);
    if (s.north_star) sparts.push(`North-star goal: ${s.north_star}`);
    if (sparts.length > 0) sections.push(`## Content strategy\n${sparts.join("\n")}`);
  }

  return sections.length > 0 ? `\n\n${sections.join("\n\n")}` : "";
}

export interface AnalyzedVoice {
  tone: string;
  vocabulary: string;
  style_guide: string;
  dos: string[];
  donts: string[];
  ai_summary: string;
}

/**
 * Ask Haiku to synthesize a brand voice profile from sample posts.
 * Samples are joined with separators, Haiku returns structured JSON.
 */
export async function analyzeBrandVoice(samples: string[]): Promise<AnalyzedVoice | null> {
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const apiKey = process.env.ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_API_KEY_APP;
  if (!apiKey) return null;

  const client = new Anthropic({ apiKey });
  const joined = samples
    .map((s, i) => `--- Sample ${i + 1} ---\n${s.trim()}`)
    .join("\n\n");

  const system = `You analyze a brand's past social posts and extract a reusable voice profile. Output STRICT JSON only:
{
  "tone": "one sentence describing the voice (e.g. 'friendly but authoritative, data-driven, no jargon')",
  "vocabulary": "10-20 characteristic words/phrases comma-separated",
  "style_guide": "3-5 rules about sentence length, punctuation, emojis, line breaks, etc.",
  "dos": ["short imperative", "..."],
  "donts": ["short imperative", "..."],
  "ai_summary": "3-4 sentence summary that can be pasted directly into another AI system prompt to make it write in this voice"
}
Language: output fields in the SAME language as the samples.
No preamble, no markdown, JSON only.`;

  try {
    const r = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1500,
      system,
      messages: [{ role: "user", content: joined }],
    });
    const text = r.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("");
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return null;
    return JSON.parse(m[0]) as AnalyzedVoice;
  } catch {
    return null;
  }
}
