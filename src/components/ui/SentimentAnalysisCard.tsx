"use client";
import { useState } from "react";

interface SentimentResult {
  overall_sentiment: "positive" | "neutral" | "negative" | "mixed";
  sentiment_score: number;
  breakdown: { positive_pct: number; neutral_pct: number; negative_pct: number };
  top_themes: Array<{ theme: string; count: number; sentiment: string }>;
  notable_comments: { most_positive: string; most_negative: string; most_insightful: string };
  audience_insights: string[];
  recommended_actions: string[];
  executive_summary: string;
}

interface SentimentAnalysisCardProps {
  comments: string[];
  platform: string;
  contentTitle?: string;
}

const SENTIMENT_COLOR: Record<string, string> = {
  positive: "text-green-600",
  neutral: "text-[#78614E]",
  negative: "text-red-500",
  mixed: "text-amber-500",
};
const SENTIMENT_BG: Record<string, string> = {
  positive: "bg-green-50 border-green-200",
  neutral: "bg-[#FFF8F0] border-[#E8D9C5]",
  negative: "bg-red-50 border-red-200",
  mixed: "bg-amber-50 border-amber-200",
};

export default function SentimentAnalysisCard({ comments, platform, contentTitle }: SentimentAnalysisCardProps) {
  const [result, setResult] = useState<SentimentResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = async () => {
    if (!comments.length) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/sentiment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comments, platform, contentTitle }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "ai_budget_exceeded") {
          setError(data.message);
        } else {
          setError(data.error || "Analysis failed");
        }
        return;
      }
      setResult(data);
    } catch {
      setError("Failed to connect to AI");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-[#E8D9C5] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🧠</span>
          <h3 className="font-semibold text-[#292524] text-sm">AI Sentiment Analysis</h3>
          {comments.length > 0 && (
            <span className="text-xs bg-[#F5D7A0]/40 text-[#78614E] px-2 py-0.5 rounded-full">
              {comments.length} comments
            </span>
          )}
        </div>
        <button
          onClick={analyze}
          disabled={loading || !comments.length}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#F59E0B] text-white hover:bg-[#D97706] transition-colors disabled:opacity-50"
        >
          {loading ? (
            <>
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Analyzing...
            </>
          ) : "Analyze"}
        </button>
      </div>

      {error && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 mb-3">{error}</div>
      )}

      {!result && !loading && !error && (
        <p className="text-xs text-[#C4AA8A]">
          {comments.length === 0 ? "No comments to analyze." : "Click Analyze to get AI-powered sentiment insights."}
        </p>
      )}

      {result && (
        <div className="space-y-3">
          {/* Overall */}
          <div className={`flex items-center justify-between p-3 rounded-lg border ${SENTIMENT_BG[result.overall_sentiment]}`}>
            <div>
              <p className="text-xs text-[#78614E] mb-0.5">Overall Sentiment</p>
              <p className={`text-sm font-bold capitalize ${SENTIMENT_COLOR[result.overall_sentiment]}`}>
                {result.overall_sentiment} · Score: {result.sentiment_score.toFixed(2)}
              </p>
            </div>
            <div className="text-right text-xs text-[#78614E] space-y-0.5">
              <p>✅ {result.breakdown.positive_pct}%</p>
              <p>➖ {result.breakdown.neutral_pct}%</p>
              <p>❌ {result.breakdown.negative_pct}%</p>
            </div>
          </div>

          {/* Summary */}
          <p className="text-xs text-[#78614E] leading-relaxed bg-[#FFFCF7] p-3 rounded-lg border border-[#F5D7A0]/50">
            {result.executive_summary}
          </p>

          {/* Themes */}
          {result.top_themes?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[#292524] mb-1.5">Top Themes</p>
              <div className="flex flex-wrap gap-1.5">
                {result.top_themes.slice(0, 6).map((t, i) => (
                  <span key={i} className={`text-xs px-2 py-0.5 rounded-full border ${SENTIMENT_BG[t.sentiment] || "bg-gray-50 border-gray-200"}`}>
                    {t.theme} ({t.count})
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          {result.recommended_actions?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[#292524] mb-1.5">Recommended Actions</p>
              <ul className="space-y-1">
                {result.recommended_actions.map((a, i) => (
                  <li key={i} className="text-xs text-[#78614E] flex gap-1.5">
                    <span className="text-[#F59E0B] mt-0.5">→</span>
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
