"use client";

/**
 * Inline AI image generator for the Calendar create/edit form.
 *
 * Sits next to the "Image URL" input. User clicks ✨, a small popover
 * opens with a prompt textarea + aspect picker (defaults to 1:1 which
 * matches IG feed). Generate → image URL auto-filled into the parent
 * form via onGenerated callback.
 */

import { useState } from "react";
import { Sparkles, Loader2, X, AlertCircle, Check } from "lucide-react";

interface Props {
  /** Current caption, used to prefill prompt if empty */
  caption?: string;
  /** Called with the generated image URL when ready */
  onGenerated: (url: string) => void;
}

type Aspect = "1:1" | "16:9" | "9:16" | "4:5";

const ASPECTS: { value: Aspect; label: string }[] = [
  { value: "1:1", label: "Feed 1:1" },
  { value: "4:5", label: "Portrait 4:5" },
  { value: "9:16", label: "Story 9:16" },
  { value: "16:9", label: "Wide 16:9" },
];

export default function AiImageQuickGen({ caption, onGenerated }: Props) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [aspect, setAspect] = useState<Aspect>("1:1");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const openPopover = () => {
    // Prefill: use caption if prompt is empty and caption is concise
    if (!prompt && caption && caption.length > 5 && caption.length < 300) {
      setPrompt(caption);
    }
    setOpen(true);
    setErr(null);
    setSuccess(false);
  };

  const generate = async () => {
    if (!prompt.trim() || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/studio/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), aspect_ratio: aspect }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErr(data.error ?? "Generation failed");
        return;
      }
      if (data.image_url) {
        onGenerated(data.image_url);
        setSuccess(true);
        setTimeout(() => {
          setOpen(false);
          setSuccess(false);
        }, 800);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={openPopover}
        className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-md transition-all hover:scale-105"
        style={{
          backgroundColor: "rgba(139,92,246,0.12)",
          color: "#8B5CF6",
        }}
        title="Generate image with AI"
      >
        <Sparkles className="w-3 h-3" />
        Generate with AI
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !busy) setOpen(false);
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl overflow-hidden flex flex-col"
            style={{ backgroundColor: "#FFFCF7", maxHeight: "90dvh" }}
          >
            {/* Header */}
            <div
              className="flex items-center gap-3 px-5 py-3 border-b"
              style={{
                borderColor: "rgba(139,92,246,0.2)",
                background: "linear-gradient(135deg, rgba(139,92,246,0.06), rgba(245,158,11,0.06))",
              }}
            >
              <Sparkles className="w-5 h-5" style={{ color: "#8B5CF6" }} />
              <p className="flex-1 text-sm font-bold" style={{ color: "#292524" }}>
                Generate image with AI
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={busy}
                className="p-1 rounded"
                style={{ color: "#78614E" }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              <div>
                <label
                  className="block text-[10px] font-bold uppercase tracking-wider mb-1"
                  style={{ color: "#78614E" }}
                >
                  Prompt
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe the image you want..."
                  rows={4}
                  className="w-full rounded-lg px-3 py-2 text-sm resize-none"
                  style={{
                    backgroundColor: "white",
                    border: "1px solid rgba(245,215,160,0.4)",
                    color: "#292524",
                    outline: "none",
                  }}
                />
                <p className="text-[10px] mt-1" style={{ color: "#A8967E" }}>
                  Tip: include style (cinematic, flat illustration, 3D render) and mood (bright, dramatic).
                </p>
              </div>

              <div>
                <label
                  className="block text-[10px] font-bold uppercase tracking-wider mb-1"
                  style={{ color: "#78614E" }}
                >
                  Aspect
                </label>
                <div className="flex gap-2 flex-wrap">
                  {ASPECTS.map((a) => (
                    <button
                      key={a.value}
                      type="button"
                      onClick={() => setAspect(a.value)}
                      className="px-2.5 py-1.5 rounded-md text-[11px] font-bold"
                      style={{
                        backgroundColor: aspect === a.value ? "#292524" : "rgba(0,0,0,0.04)",
                        color: aspect === a.value ? "white" : "#292524",
                      }}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>

              {err && (
                <div
                  className="rounded-lg p-2.5 flex items-start gap-2 text-xs"
                  style={{
                    backgroundColor: "rgba(239,68,68,0.08)",
                    border: "1px solid rgba(239,68,68,0.3)",
                    color: "#B91C1C",
                  }}
                >
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  {err}
                </div>
              )}

              {success && (
                <div
                  className="rounded-lg p-2.5 flex items-center gap-2 text-xs"
                  style={{
                    backgroundColor: "rgba(16,185,129,0.08)",
                    border: "1px solid rgba(16,185,129,0.3)",
                    color: "#065F46",
                    fontWeight: 700,
                  }}
                >
                  <Check className="w-3.5 h-3.5" />
                  Image attached to the post!
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              className="px-5 py-3 border-t flex items-center justify-between gap-3"
              style={{ borderColor: "rgba(245,215,160,0.3)", backgroundColor: "#FFF8F0" }}
            >
              <p className="text-[10px]" style={{ color: "#A8967E" }}>
                ~$0.003 · 2-3 sec
              </p>
              <button
                type="button"
                onClick={generate}
                disabled={busy || !prompt.trim() || success}
                className="px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 disabled:opacity-40"
                style={{
                  background: "linear-gradient(135deg, #8B5CF6, #6D28D9)",
                  color: "white",
                }}
              >
                {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                {busy ? "Generating..." : "Generate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
