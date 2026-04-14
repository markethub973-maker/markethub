"use client";

/**
 * Caption A/B variants picker. User clicks "Try variants" next to the
 * caption field; modal shows 3 angles (punchy / story / question);
 * click one → replaces the form caption.
 */

import { useState } from "react";
import { Sparkles, Loader2, X, AlertCircle, Wand2 } from "lucide-react";

interface Variant {
  angle: string;
  caption: string;
}

interface Props {
  caption: string;
  platform: string;
  onPick: (caption: string) => void;
}

const ANGLE_COLOR: Record<string, string> = {
  punchy:   "#F59E0B",
  story:    "#8B5CF6",
  question: "#10B981",
};

export default function CaptionVariants({ caption, platform, onPick }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const generate = async () => {
    if (!caption.trim() || caption.trim().length < 10) {
      setErr("Write a caption first (min 10 chars)");
      setOpen(true);
      return;
    }
    setOpen(true);
    setLoading(true);
    setErr(null);
    setVariants([]);
    try {
      const res = await fetch("/api/ai/caption-variants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caption, platform }),
      });
      const d = await res.json();
      if (!res.ok || !d.ok) {
        setErr(d.error ?? "Failed");
      } else {
        setVariants(d.variants ?? []);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  const pick = (caption: string) => {
    onPick(caption);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={generate}
        className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-md"
        style={{
          backgroundColor: "rgba(245,158,11,0.12)",
          color: "#D97706",
        }}
        title="Generate 3 caption alternatives"
      >
        <Wand2 className="w-3 h-3" />
        Try variants
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            className="w-full max-w-2xl rounded-2xl overflow-hidden flex flex-col"
            style={{ backgroundColor: "#FFFCF7", maxHeight: "85dvh" }}
          >
            <div
              className="flex items-center gap-3 px-5 py-3 border-b"
              style={{
                borderColor: "rgba(245,158,11,0.2)",
                background: "linear-gradient(135deg, rgba(245,158,11,0.06), rgba(139,92,246,0.06))",
              }}
            >
              <Sparkles className="w-5 h-5" style={{ color: "#F59E0B" }} />
              <p className="flex-1 text-sm font-bold" style={{ color: "#292524" }}>
                Caption variants ({platform})
              </p>
              <button type="button" onClick={() => setOpen(false)} style={{ color: "#78614E" }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1">
              {loading && (
                <div className="py-8 text-center">
                  <Loader2 className="w-5 h-5 animate-spin inline" style={{ color: "#F59E0B" }} />
                  <p className="text-xs mt-2" style={{ color: "#78614E" }}>
                    Spinning up 3 angles...
                  </p>
                </div>
              )}
              {err && (
                <div className="rounded-lg p-3 flex items-center gap-2 text-xs"
                  style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", color: "#B91C1C" }}>
                  <AlertCircle className="w-3.5 h-3.5" />
                  {err}
                </div>
              )}
              {variants.length > 0 && (
                <div className="space-y-3">
                  {variants.map((v) => {
                    const color = ANGLE_COLOR[v.angle] ?? "#78614E";
                    return (
                      <div
                        key={v.angle}
                        className="rounded-xl p-3"
                        style={{
                          backgroundColor: "white",
                          border: `1px solid ${color}33`,
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: `${color}1A`, color }}
                          >
                            {v.angle}
                          </span>
                          <button
                            type="button"
                            onClick={() => pick(v.caption)}
                            className="text-[11px] font-bold px-3 py-1 rounded-md"
                            style={{
                              background: `linear-gradient(135deg, ${color}, ${color}DD)`,
                              color: "white",
                            }}
                          >
                            Use this
                          </button>
                        </div>
                        <p
                          className="text-sm whitespace-pre-wrap"
                          style={{ color: "#292524", lineHeight: 1.5 }}
                        >
                          {v.caption}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
