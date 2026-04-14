"use client";

/**
 * Collapsible engagement predictor — lives in the post create form.
 * User clicks "Predict engagement" → AI rates the draft.
 */

import { useState } from "react";
import { TrendingUp, Loader2, AlertCircle, CheckCircle2, ChevronDown } from "lucide-react";

interface Props {
  caption: string;
  platform: string;
  hashtags: string;
  hasImage: boolean;
  scheduledFor?: string; // ISO date-time
}

interface Prediction {
  score: number;
  label: string;
  reasoning: string;
  suggestions: string[];
}

function scoreColor(score: number): { bar: string; bg: string; text: string } {
  if (score >= 71) return { bar: "#10B981", bg: "rgba(16,185,129,0.08)", text: "#065F46" };
  if (score >= 51) return { bar: "#84CC16", bg: "rgba(132,204,22,0.08)", text: "#4D7C0F" };
  if (score >= 31) return { bar: "var(--color-primary)", bg: "rgba(245,158,11,0.08)", text: "#92400E" };
  return { bar: "#EF4444", bg: "rgba(239,68,68,0.08)", text: "#991B1B" };
}

export default function EngagementPredictor(props: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pred, setPred] = useState<Prediction | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const predict = async () => {
    if (!props.caption.trim() || props.caption.trim().length < 5) {
      setErr("Caption too short (min 5 chars)");
      setOpen(true);
      return;
    }
    setOpen(true);
    setLoading(true);
    setErr(null);
    setPred(null);
    try {
      const res = await fetch("/api/ai/predict-engagement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caption: props.caption,
          platform: props.platform,
          hashtags: props.hashtags,
          has_image: props.hasImage,
          scheduled_for: props.scheduledFor,
        }),
      });
      const d = await res.json();
      if (!res.ok || !d.ok) {
        setErr(d.error ?? "Failed");
      } else {
        setPred({
          score: d.score,
          label: d.label,
          reasoning: d.reasoning,
          suggestions: d.suggestions,
        });
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  if (!open && !pred) {
    return (
      <button
        type="button"
        onClick={predict}
        disabled={loading}
        className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-md"
        style={{
          backgroundColor: "rgba(16,185,129,0.1)",
          color: "#10B981",
        }}
      >
        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <TrendingUp className="w-3 h-3" />}
        Predict engagement
      </button>
    );
  }

  const c = pred ? scoreColor(pred.score) : null;

  return (
    <div
      className="rounded-lg p-3"
      style={{
        backgroundColor: c?.bg ?? "rgba(0,0,0,0.03)",
        border: `1px solid ${c?.bar ?? "rgba(0,0,0,0.1)"}33`,
      }}
    >
      {loading && (
        <div className="flex items-center gap-2 py-2">
          <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#78614E" }} />
          <p className="text-xs" style={{ color: "#78614E" }}>Analyzing post…</p>
        </div>
      )}

      {err && (
        <div className="flex items-center gap-2 text-xs" style={{ color: "#B91C1C" }}>
          <AlertCircle className="w-3 h-3" />
          {err}
        </div>
      )}

      {pred && c && (
        <>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div
                className="text-2xl font-bold tabular-nums"
                style={{ color: c.text }}
              >
                {pred.score}
              </div>
              <div>
                <p
                  className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: c.text }}
                >
                  {pred.label}
                </p>
                <p className="text-[10px]" style={{ color: "#78614E" }}>
                  Engagement prediction
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={predict}
              disabled={loading}
              className="text-[10px] font-bold"
              style={{ color: c.text }}
            >
              Re-check
            </button>
          </div>

          <div
            className="w-full h-1.5 rounded-full mb-3"
            style={{ backgroundColor: "rgba(0,0,0,0.08)" }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${pred.score}%`, backgroundColor: c.bar }}
            />
          </div>

          {pred.reasoning && (
            <p className="text-xs mb-2" style={{ color: "var(--color-text)", lineHeight: 1.4 }}>
              {pred.reasoning}
            </p>
          )}

          {pred.suggestions.length > 0 && (
            <details>
              <summary
                className="text-[10px] font-bold uppercase tracking-wider cursor-pointer flex items-center gap-1"
                style={{ color: c.text }}
              >
                <CheckCircle2 className="w-3 h-3" />
                {pred.suggestions.length} improvement{pred.suggestions.length > 1 ? "s" : ""}
                <ChevronDown className="w-3 h-3 ml-1" />
              </summary>
              <ul className="mt-1.5 pl-4 space-y-0.5">
                {pred.suggestions.map((s, i) => (
                  <li
                    key={i}
                    className="text-xs list-disc"
                    style={{ color: "var(--color-text)" }}
                  >
                    {s}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </div>
  );
}
