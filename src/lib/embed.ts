/**
 * Text embedding via OpenAI text-embedding-3-small (1536 dim).
 * Cost: ~€0.02 per 1M tokens = basically free for our volume.
 * Multilingual — works for all 22 target countries (DE, NO, SV, ZH, JA, etc.)
 */

export async function embedText(text: string): Promise<number[] | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !text) return null;
  try {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: text.slice(0, 8000), // model max 8k tokens
      }),
    });
    if (!res.ok) return null;
    const d = (await res.json()) as { data?: Array<{ embedding: number[] }> };
    return d.data?.[0]?.embedding ?? null;
  } catch {
    return null;
  }
}

/**
 * Batch embedding — up to 100 texts per call for efficiency.
 */
export async function embedBatch(texts: string[]): Promise<Array<number[] | null>> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !texts.length) return texts.map(() => null);
  try {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: texts.slice(0, 100).map((t) => (t ?? "").slice(0, 8000)),
      }),
    });
    if (!res.ok) return texts.map(() => null);
    const d = (await res.json()) as { data?: Array<{ embedding: number[]; index: number }> };
    const results: Array<number[] | null> = new Array(texts.length).fill(null);
    (d.data ?? []).forEach((item) => {
      results[item.index] = item.embedding;
    });
    return results;
  } catch {
    return texts.map(() => null);
  }
}
