/**
 * API Cost Tracker — real cost calculation and logging for all external API calls.
 * Prices last verified April 2026.
 */

// ── Anthropic model pricing (USD per token) ──────────────────────────────────
export const ANTHROPIC_PRICES: Record<string, { input: number; output: number }> = {
  "claude-haiku-4-5-20251001": { input: 0.00000025,  output: 0.00000125  }, // $0.25/$1.25 per 1M
  "claude-sonnet-4-6":         { input: 0.000003,    output: 0.000015    }, // $3/$15 per 1M
  "claude-opus-4-6":           { input: 0.000015,    output: 0.000075    }, // $15/$75 per 1M
};

// ── Apify pricing (USD per actor compute unit) ────────────────────────────────
export const APIFY_ACU_PRICE = 0.004; // ~$0.004/ACU

// ── Estimated Apify ACUs per operation (average) ─────────────────────────────
export const APIFY_ACU_ESTIMATES: Record<string, number> = {
  research_google:       0.5,   // ~$0.002
  research_maps:         0.8,   // ~$0.003
  research_reddit:       0.4,   // ~$0.0016
  research_website:      2.0,   // ~$0.008 (cheerio crawler)
  research_maps_reviews: 1.5,   // ~$0.006
  research_local_market: 0.6,   // ~$0.0024
  research_instagram:    0.5,
  research_tiktok:       0.5,
};

// ── Human-readable operation labels ──────────────────────────────────────────
export const OPERATION_LABELS: Record<string, string> = {
  analyze:              "Analiză ofertă AI",
  score:                "Scorare leads AI",
  message:              "Mesaj outreach AI",
  campaign:             "Campanie completă AI",
  marketing_advisor:    "Expert Marketing MAX",
  research_google:      "Căutare Google",
  research_maps:        "Căutare Maps",
  research_reddit:      "Căutare Reddit",
  research_website:     "Analiză website",
  research_maps_reviews:"Recenzii Maps",
  research_local_market:"Piața locală OLX",
  research_instagram:   "Căutare Instagram",
  research_tiktok:      "Căutare TikTok",
};

// ── Cost calculation ──────────────────────────────────────────────────────────
export function calcAnthropicCost(model: string, inputTokens: number, outputTokens: number): number {
  const prices = ANTHROPIC_PRICES[model] ?? ANTHROPIC_PRICES["claude-haiku-4-5-20251001"];
  return inputTokens * prices.input + outputTokens * prices.output;
}

export function calcApifyCost(operation: string): number {
  const acu = APIFY_ACU_ESTIMATES[operation] ?? 0.5;
  return acu * APIFY_ACU_PRICE;
}

// ── Format helpers ────────────────────────────────────────────────────────────
export function formatCostUSD(usd: number): string {
  if (usd === 0) return "$0.0000";
  if (usd < 0.0001) return `<$0.0001`;
  return `$${usd.toFixed(4)}`;
}

export function formatCostRON(usd: number, ronRate = 4.6): string {
  const ron = usd * ronRate;
  if (ron < 0.001) return "<0.001 RON";
  return `${ron.toFixed(4)} RON`;
}

// ── Cost logging (non-fatal — never breaks API routes) ───────────────────────
export async function logApiCost(params: {
  userId: string;
  sessionId: string;
  service: "anthropic" | "apify";
  operation: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  costUsd: number;
}): Promise<void> {
  try {
    const { createServiceClient } = await import("@/lib/supabase/service");
    const supabase = createServiceClient();
    await supabase.from("api_cost_logs" as any).insert({
      user_id: params.userId,
      session_id: params.sessionId,
      service: params.service,
      operation: params.operation,
      model: params.model ?? null,
      input_tokens: params.inputTokens ?? 0,
      output_tokens: params.outputTokens ?? 0,
      cost_usd: params.costUsd,
    });
  } catch {
    // Non-fatal: cost logging never breaks the actual API call
  }
}

// ── Aggregate session costs ───────────────────────────────────────────────────
export interface CostLine {
  operation: string;
  service: string;
  model?: string;
  cost_usd: number;
  input_tokens?: number;
  output_tokens?: number;
  created_at: string;
}

export interface SessionCostSummary {
  lines: CostLine[];
  total_usd: number;
  total_with_markup_usd: number;
  markup_percent: number;
  anthropic_usd: number;
  apify_usd: number;
}
