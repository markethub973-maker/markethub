"use client";

import { useEffect, useState, useCallback } from "react";

const LOW_CREDIT_THRESHOLD = 3; // dollars

interface UsageData {
  usage?: { input_tokens?: number; output_tokens?: number; error?: string };
  billing?: { available_credit?: number; balance?: number; error?: string };
  monthly_usage?: { input_tokens?: number; output_tokens?: number; error?: string };
  api_key_prefix?: string;
  fetched_at?: string;
  error?: string;
}

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

// Anthropic pricing (per 1M tokens, claude-sonnet-4-6)
const INPUT_COST_PER_1M = 3.0;
const OUTPUT_COST_PER_1M = 15.0;

function estimateCost(inputTokens: number, outputTokens: number): number {
  return (inputTokens / 1_000_000) * INPUT_COST_PER_1M + (outputTokens / 1_000_000) * OUTPUT_COST_PER_1M;
}

export default function AdminAnthropicUsage() {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/anthropic-usage");
      const json = await res.json();
      setData(json);
      setLastRefresh(new Date());
    } catch {
      setData({ error: "Connection error" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Auto-refresh every 5 minutes
    const interval = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [load]);

  const inputTokens = data?.monthly_usage?.input_tokens ?? data?.usage?.input_tokens ?? 0;
  const outputTokens = data?.monthly_usage?.output_tokens ?? data?.usage?.output_tokens ?? 0;
  const estimatedCost = estimateCost(inputTokens, outputTokens);

  const availableCredit =
    typeof data?.billing?.available_credit === "number"
      ? data.billing.available_credit
      : typeof data?.billing?.balance === "number"
      ? data.billing.balance
      : null;

  const isLowCredit = availableCredit !== null && availableCredit < LOW_CREDIT_THRESHOLD;
  const creditPct = availableCredit !== null && availableCredit > 0
    ? Math.min((availableCredit / (availableCredit + estimatedCost)) * 100, 100)
    : null;

  return (
    <div className="rounded-2xl p-6" style={{ backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{ backgroundColor: isLowCredit ? "rgba(239,68,68,0.1)" : "rgba(245,158,11,0.1)" }}>
            🤖
          </div>
          <div>
            <h2 className="font-bold text-lg" style={{ color: "#292524" }}>Anthropic API Usage</h2>
            <p className="text-xs" style={{ color: "#C4AA8A" }}>
              {data?.api_key_prefix && `Key: ${data.api_key_prefix}`}
              {lastRefresh && ` · Updated ${lastRefresh.toLocaleTimeString()}`}
            </p>
          </div>
        </div>
        <button type="button" onClick={load} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
          style={{ backgroundColor: "rgba(245,158,11,0.1)", color: "#D97706" }}>
          {loading ? (
            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          ) : "↻"} Refresh
        </button>
      </div>

      {/* Low credit alarm */}
      {isLowCredit && (
        <div className="mb-4 rounded-xl p-4 flex items-start gap-3 animate-pulse"
          style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)" }}>
          <span className="text-2xl shrink-0">🚨</span>
          <div>
            <p className="font-bold text-sm" style={{ color: "#DC2626" }}>
              Low Credit Alert — ${availableCredit!.toFixed(2)} remaining
            </p>
            <p className="text-xs mt-0.5" style={{ color: "#78614E" }}>
              Credit is below ${LOW_CREDIT_THRESHOLD}. Recharge your Anthropic account to avoid service interruption.
            </p>
            <a href="https://console.anthropic.com/settings/billing"
              target="_blank" rel="noopener noreferrer"
              className="inline-block mt-2 text-xs font-bold px-3 py-1.5 rounded-lg"
              style={{ backgroundColor: "#DC2626", color: "white" }}>
              → Recharge Now
            </a>
          </div>
        </div>
      )}

      {loading && !data ? (
        <div className="flex items-center justify-center py-8">
          <svg className="w-6 h-6 animate-spin" style={{ color: "#F59E0B" }} fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        </div>
      ) : (
        <>
          {/* Stats grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            {/* Available Credit */}
            <div className="rounded-xl p-4" style={{
              backgroundColor: isLowCredit ? "rgba(239,68,68,0.06)" : "rgba(22,163,74,0.06)",
              border: `1px solid ${isLowCredit ? "rgba(239,68,68,0.2)" : "rgba(22,163,74,0.2)"}`,
            }}>
              <p className="text-xs mb-1" style={{ color: "#78614E" }}>Available Credit</p>
              <p className="text-2xl font-bold" style={{ color: isLowCredit ? "#DC2626" : "#16A34A" }}>
                {availableCredit !== null ? `$${availableCredit.toFixed(2)}` : "—"}
              </p>
              {isLowCredit && <p className="text-xs mt-1" style={{ color: "#DC2626" }}>⚠ Below ${LOW_CREDIT_THRESHOLD} threshold</p>}
            </div>

            {/* Estimated cost this month */}
            <div className="rounded-xl p-4" style={{ backgroundColor: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)" }}>
              <p className="text-xs mb-1" style={{ color: "#78614E" }}>Est. Cost This Month</p>
              <p className="text-2xl font-bold" style={{ color: "#D97706" }}>
                ${estimatedCost.toFixed(4)}
              </p>
              <p className="text-xs mt-1" style={{ color: "#C4AA8A" }}>Based on token usage</p>
            </div>

            {/* Input tokens */}
            <div className="rounded-xl p-4" style={{ backgroundColor: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.2)" }}>
              <p className="text-xs mb-1" style={{ color: "#78614E" }}>Input Tokens</p>
              <p className="text-2xl font-bold" style={{ color: "#8B5CF6" }}>
                {fmt(inputTokens)}
              </p>
              <p className="text-xs mt-1" style={{ color: "#C4AA8A" }}>${((inputTokens / 1_000_000) * INPUT_COST_PER_1M).toFixed(4)}</p>
            </div>

            {/* Output tokens */}
            <div className="rounded-xl p-4" style={{ backgroundColor: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.2)" }}>
              <p className="text-xs mb-1" style={{ color: "#78614E" }}>Output Tokens</p>
              <p className="text-2xl font-bold" style={{ color: "#3B82F6" }}>
                {fmt(outputTokens)}
              </p>
              <p className="text-xs mt-1" style={{ color: "#C4AA8A" }}>${((outputTokens / 1_000_000) * OUTPUT_COST_PER_1M).toFixed(4)}</p>
            </div>
          </div>

          {/* Credit bar */}
          {creditPct !== null && (
            <div className="mb-4">
              <div className="flex justify-between text-xs mb-1.5" style={{ color: "#78614E" }}>
                <span>Credit remaining</span>
                <span style={{ color: isLowCredit ? "#DC2626" : "#16A34A", fontWeight: 700 }}>
                  {creditPct.toFixed(0)}%
                </span>
              </div>
              <div className="w-full h-3 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(245,215,160,0.3)" }}>
                <div className="h-full rounded-full transition-all"
                  style={{
                    width: `${creditPct}%`,
                    backgroundColor: creditPct > 50 ? "#16A34A" : creditPct > 20 ? "#F59E0B" : "#DC2626",
                  }} />
              </div>
            </div>
          )}

          {/* Pricing info */}
          <div className="rounded-xl p-3 mt-3" style={{ backgroundColor: "rgba(245,215,160,0.1)", border: "1px solid rgba(245,215,160,0.3)" }}>
            <p className="text-xs font-semibold mb-2" style={{ color: "#78614E" }}>Pricing reference (claude-sonnet-4-6)</p>
            <div className="flex gap-4 text-xs" style={{ color: "#C4AA8A" }}>
              <span>Input: <b style={{ color: "#292524" }}>${INPUT_COST_PER_1M}/1M tokens</b></span>
              <span>Output: <b style={{ color: "#292524" }}>${OUTPUT_COST_PER_1M}/1M tokens</b></span>
              <a href="https://console.anthropic.com/settings/billing" target="_blank" rel="noopener noreferrer"
                className="ml-auto font-semibold hover:underline" style={{ color: "#F59E0B" }}>
                Manage billing →
              </a>
            </div>
          </div>

          {/* API info note if billing not available */}
          {availableCredit === null && !data?.error && (
            <div className="mt-3 rounded-xl p-3" style={{ backgroundColor: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.15)" }}>
              <p className="text-xs" style={{ color: "#3B82F6" }}>
                ℹ Credit balance requires Anthropic Workspaces API access. Token usage is estimated from API calls.
                Check exact balance at <a href="https://console.anthropic.com/settings/billing" target="_blank" rel="noopener noreferrer" className="underline">console.anthropic.com</a>.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
