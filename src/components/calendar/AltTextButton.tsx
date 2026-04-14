"use client";

/**
 * AltTextButton — inline widget shown next to the image preview in the
 * Calendar form. One click calls /api/ai/alt-text and shows the result
 * (copied to clipboard too).
 */

import { useState } from "react";
import { Sparkles, Loader2, Check, Copy } from "lucide-react";

interface Props {
  imageUrl: string;
  caption?: string;
}

export default function AltTextButton({ imageUrl, caption }: Props) {
  const [loading, setLoading] = useState(false);
  const [alt, setAlt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/ai/alt-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_url: imageUrl, context: caption?.slice(0, 300) }),
      });
      const d = await res.json();
      if (res.ok && d.alt_text) {
        setAlt(d.alt_text);
        try {
          await navigator.clipboard.writeText(d.alt_text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch { /* no-op */ }
      }
    } finally {
      setLoading(false);
    }
  };

  const recopy = async () => {
    if (!alt) return;
    try {
      await navigator.clipboard.writeText(alt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* no-op */ }
  };

  return (
    <div className="flex-1 min-w-0">
      <button
        type="button"
        onClick={generate}
        disabled={loading}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-bold disabled:opacity-50"
        style={{ backgroundColor: "rgba(139,92,246,0.12)", color: "#8B5CF6" }}
        title="Generate accessibility alt-text for this image"
      >
        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
        {alt ? "Regenerate alt" : "Generate alt-text"}
      </button>
      {alt && (
        <div
          className="mt-1.5 rounded-md p-2 flex items-start gap-2"
          style={{ backgroundColor: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.25)" }}
        >
          <p className="text-[11px] flex-1" style={{ color: "var(--color-text)", lineHeight: 1.35 }}>
            {alt}
          </p>
          <button
            type="button"
            onClick={recopy}
            className="text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1"
            style={{ color: copied ? "#10B981" : "#8B5CF6", backgroundColor: "white" }}
            title="Copy alt-text"
          >
            {copied ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      )}
    </div>
  );
}
