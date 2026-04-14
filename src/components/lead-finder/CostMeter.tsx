"use client";

import { useEffect, useState, useCallback } from "react";
import { ChevronDown, ChevronUp, Zap, RefreshCw } from "lucide-react";

const AMBER = "var(--color-primary)";
const GREEN = "#1DB954";

interface CostLine {
  operation: string;
  service: string;
  model?: string;
  cost_usd: number;
  input_tokens?: number;
  output_tokens?: number;
  created_at: string;
}

interface SessionCost {
  lines: CostLine[];
  api_cost_usd: number;
  api_markup_usd: number;
  markup_percent: number;
  anthropic_usd: number;
  apify_usd: number;
  value_fee_usd: number;
  value_fee_percent: number;
  value_fee_enabled: boolean;
  campaign_value_usd: number;
  total_usd: number;
}

const OPERATION_LABELS: Record<string, string> = {
  analyze:              "AI offer analysis",
  score:                "AI lead scoring",
  message:              "AI outreach message",
  campaign:             "AI full campaign",
  marketing_advisor:    "APEX — Marketing Intelligence",
  research_google:      "Google search",
  research_maps:        "Maps search",
  research_reddit:      "Reddit search",
  research_website:     "Website analysis",
  research_maps_reviews:"Maps reviews",
  research_local_market:"Local market",
  research_instagram:   "Instagram search",
  research_tiktok:      "TikTok search",
};

function fmt(usd: number): string {
  if (usd < 0.00001) return "<$0.00001";
  return `$${usd.toFixed(5)}`;
}

function fmtTotal(usd: number): string {
  if (usd < 0.001) return `$${(usd * 1000).toFixed(3)}‰`;
  return `$${usd.toFixed(4)}`;
}

interface Props {
  sessionId: string;
  refreshTrigger?: number;
  campaignValue?: number;
  campaignValueCurrency?: string;
}

export default function CostMeter({ sessionId, refreshTrigger, campaignValue = 0, campaignValueCurrency = "EUR" }: Props) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<SessionCost | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchCosts = useCallback(async () => {
    if (!sessionId || sessionId === "unknown") return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        session_id: sessionId,
        campaign_value: String(campaignValue || 0),
        currency: campaignValueCurrency || "EUR",
      });
      const res = await fetch(`/api/costs/session?${params}`);
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [sessionId, campaignValue, campaignValueCurrency]);

  useEffect(() => { fetchCosts(); }, [fetchCosts, refreshTrigger]);

  if (!data || data.lines.length === 0) return null;

  const clientPrice = data.total_usd;
  const ronRate = 4.6;

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ border: `1px solid rgba(245,215,160,0.2)`, backgroundColor: "rgba(245,215,160,0.03)" }}>

      {/* Summary bar */}
      <button type="button" onClick={() => { setOpen(v => !v); if (!open) fetchCosts(); }}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-amber-500/5 transition-all">
        <div className="flex items-center gap-3">
          <Zap className="w-4 h-4" style={{ color: AMBER }} />
          <div className="text-left">
            <p className="text-xs font-bold" style={{ color: "var(--color-text)" }}>
              Current session cost
            </p>
            <p className="text-xs" style={{ color: "#A8967E" }}>
              {data.lines.length} operations • {fmtTotal(clientPrice)} ({(clientPrice * ronRate).toFixed(3)} RON)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-2 py-1 rounded-lg"
            style={{ backgroundColor: `${AMBER}15`, color: AMBER }}>
            {fmtTotal(clientPrice)}
          </span>
          {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" style={{ color: "#A8967E" }} />}
          {open ? <ChevronUp className="w-4 h-4" style={{ color: "#A8967E" }} /> : <ChevronDown className="w-4 h-4" style={{ color: "#A8967E" }} />}
        </div>
      </button>

      {/* Expanded breakdown */}
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t" style={{ borderColor: "rgba(245,215,160,0.12)" }}>
          {/* Cost lines */}
          <div className="space-y-1 pt-3">
            {data.lines.map((line, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span style={{ color: line.service === "anthropic" ? AMBER : GREEN }}>
                    {line.service === "anthropic" ? "🤖" : "🔍"}
                  </span>
                  <span style={{ color: "#78614E" }}>{OPERATION_LABELS[line.operation] || line.operation}</span>
                  {line.input_tokens ? (
                    <span style={{ color: "#A8967E" }}>
                      ({line.input_tokens + (line.output_tokens || 0)} tokens)
                    </span>
                  ) : null}
                </div>
                <span className="font-mono font-semibold" style={{ color: "var(--color-text)" }}>
                  {fmt(line.cost_usd)}
                </span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="rounded-xl p-3 space-y-1.5"
            style={{ backgroundColor: "rgba(245,215,160,0.06)", border: "1px solid rgba(245,215,160,0.15)" }}>
            <div className="flex justify-between text-xs">
              <span style={{ color: "#A8967E" }}>AI processing cost</span>
              <span className="font-mono" style={{ color: "var(--color-text)" }}>{fmt(data.anthropic_usd)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span style={{ color: "#A8967E" }}>Search cost (Apify)</span>
              <span className="font-mono" style={{ color: "var(--color-text)" }}>{fmt(data.apify_usd)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span style={{ color: "#A8967E" }}>Real API cost total</span>
              <span className="font-mono" style={{ color: "var(--color-text)" }}>{fmtTotal(data.api_cost_usd)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span style={{ color: "#A8967E" }}>Platform fee ({data.markup_percent}%)</span>
              <span className="font-mono" style={{ color: "var(--color-text)" }}>{fmtTotal(data.api_markup_usd)}</span>
            </div>
            {data.value_fee_enabled && data.campaign_value_usd > 0 && (
              <div className="flex justify-between text-xs">
                <span style={{ color: "#A8967E" }}>
                  Business value fee ({data.value_fee_percent}% of ${data.campaign_value_usd.toFixed(0)})
                </span>
                <span className="font-mono font-bold" style={{ color: AMBER }}>
                  {fmtTotal(data.value_fee_usd)}
                </span>
              </div>
            )}
            <div className="border-t pt-1.5 flex justify-between text-xs font-bold"
              style={{ borderColor: "rgba(245,215,160,0.2)" }}>
              <span style={{ color: "#78614E" }}>Total to pay</span>
              <span className="font-mono" style={{ color: AMBER }}>{fmtTotal(clientPrice)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span style={{ color: "#A8967E" }}>RON equivalent (~{ronRate} rate)</span>
              <span className="font-mono font-bold" style={{ color: GREEN }}>
                {(clientPrice * ronRate).toFixed(4)} RON
              </span>
            </div>
          </div>

          <p className="text-xs text-center" style={{ color: "#A8967E" }}>
            Costs are calculated in real time per API call
          </p>
        </div>
      )}
    </div>
  );
}
