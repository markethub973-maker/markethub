"use client";

import { useEffect, useState, useCallback } from "react";
import { ChevronDown, ChevronUp, Zap, RefreshCw } from "lucide-react";

const AMBER = "#F59E0B";
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
  total_usd: number;
  anthropic_usd: number;
  apify_usd: number;
  markup_percent: number;
  total_with_markup_usd: number;
}

const OPERATION_LABELS: Record<string, string> = {
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
  research_local_market:"Piața locală",
  research_instagram:   "Căutare Instagram",
  research_tiktok:      "Căutare TikTok",
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
  refreshTrigger?: number; // increment to force refresh
}

export default function CostMeter({ sessionId, refreshTrigger }: Props) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<SessionCost | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchCosts = useCallback(async () => {
    if (!sessionId || sessionId === "unknown") return;
    setLoading(true);
    try {
      const res = await fetch(`/api/costs/session?session_id=${encodeURIComponent(sessionId)}`);
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => { fetchCosts(); }, [fetchCosts, refreshTrigger]);

  if (!data || data.lines.length === 0) return null;

  const clientPrice = data.total_with_markup_usd;
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
            <p className="text-xs font-bold" style={{ color: "#292524" }}>
              Costul sesiunii curente
            </p>
            <p className="text-xs" style={{ color: "#A8967E" }}>
              {data.lines.length} operațiuni • {fmtTotal(clientPrice)} ({(clientPrice * ronRate).toFixed(3)} RON)
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
                <span className="font-mono font-semibold" style={{ color: "#292524" }}>
                  {fmt(line.cost_usd)}
                </span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="rounded-xl p-3 space-y-1.5"
            style={{ backgroundColor: "rgba(245,215,160,0.06)", border: "1px solid rgba(245,215,160,0.15)" }}>
            <div className="flex justify-between text-xs">
              <span style={{ color: "#A8967E" }}>Cost AI (Anthropic)</span>
              <span className="font-mono" style={{ color: "#292524" }}>{fmt(data.anthropic_usd)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span style={{ color: "#A8967E" }}>Cost căutări (Apify)</span>
              <span className="font-mono" style={{ color: "#292524" }}>{fmt(data.apify_usd)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span style={{ color: "#A8967E" }}>Cost real total</span>
              <span className="font-mono" style={{ color: "#292524" }}>{fmtTotal(data.total_usd)}</span>
            </div>
            <div className="border-t pt-1.5 flex justify-between text-xs font-bold"
              style={{ borderColor: "rgba(245,215,160,0.2)" }}>
              <span style={{ color: "#78614E" }}>
                Total cu comision platformă ({data.markup_percent}%)
              </span>
              <span className="font-mono" style={{ color: AMBER }}>{fmtTotal(clientPrice)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span style={{ color: "#A8967E" }}>Echivalent RON (~{ronRate} curs)</span>
              <span className="font-mono font-bold" style={{ color: GREEN }}>
                {(clientPrice * ronRate).toFixed(4)} RON
              </span>
            </div>
          </div>

          <p className="text-xs text-center" style={{ color: "#A8967E" }}>
            Costurile sunt calculate în timp real per apel API
          </p>
        </div>
      )}
    </div>
  );
}
