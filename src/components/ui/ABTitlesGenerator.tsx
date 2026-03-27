"use client";
import { useState } from "react";

interface TitleVariant {
  title: string;
  strategy: string;
  estimated_ctr_boost: "low" | "medium" | "high";
  hook_element: string;
}

interface ABResult {
  titles: TitleVariant[];
  top_pick: number;
  reasoning: string;
}

interface ABTitlesGeneratorProps {
  defaultTitle?: string;
  defaultNiche?: string;
  platform?: string;
}

const CTR_BADGE: Record<string, string> = {
  high: "bg-green-100 text-green-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-gray-100 text-[#78614E]",
};

export default function ABTitlesGenerator({ defaultTitle = "", defaultNiche = "", platform = "YouTube" }: ABTitlesGeneratorProps) {
  const [title, setTitle] = useState(defaultTitle);
  const [description, setDescription] = useState("");
  const [niche, setNiche] = useState(defaultNiche);
  const [result, setResult] = useState<ABResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<number | null>(null);

  const generate = async () => {
    if (!title.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/ab-titles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, niche, platform }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || data.error || "Generation failed");
        return;
      }
      setResult(data);
    } catch {
      setError("Failed to connect to AI");
    } finally {
      setLoading(false);
    }
  };

  const copyTitle = (t: string, idx: number) => {
    navigator.clipboard.writeText(t);
    setCopied(idx);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="bg-white border border-[#E8D9C5] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">🧪</span>
        <h3 className="font-semibold text-[#292524] text-sm">A/B Title Generator</h3>
        <span className="text-xs text-[#C4AA8A]">{platform}</span>
      </div>

      <div className="space-y-2.5 mb-4">
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Original title..."
          className="w-full text-sm px-3 py-2 border border-[#E8D9C5] rounded-lg focus:outline-none focus:border-[#F59E0B] bg-[#FFFCF7] text-[#292524] placeholder:text-[#C4AA8A]"
        />
        <div className="flex gap-2">
          <input
            value={niche}
            onChange={e => setNiche(e.target.value)}
            placeholder="Niche (e.g. fitness, finance, tech)"
            className="flex-1 text-sm px-3 py-2 border border-[#E8D9C5] rounded-lg focus:outline-none focus:border-[#F59E0B] bg-[#FFFCF7] text-[#292524] placeholder:text-[#C4AA8A]"
          />
          <button
            onClick={generate}
            disabled={loading || !title.trim()}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#F59E0B] text-white hover:bg-[#D97706] transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {loading ? "Generating..." : "Generate 10"}
          </button>
        </div>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Video description (optional, improves quality)"
          rows={2}
          className="w-full text-sm px-3 py-2 border border-[#E8D9C5] rounded-lg focus:outline-none focus:border-[#F59E0B] bg-[#FFFCF7] text-[#292524] placeholder:text-[#C4AA8A] resize-none"
        />
      </div>

      {error && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 mb-3">{error}</div>
      )}

      {result && (
        <div className="space-y-2">
          {result.reasoning && (
            <p className="text-xs text-[#78614E] bg-[#FFFCF7] p-3 rounded-lg border border-[#F5D7A0]/50 mb-3">
              <strong>Top pick reasoning:</strong> {result.reasoning}
            </p>
          )}
          {result.titles.map((t, i) => (
            <div
              key={i}
              className={`p-3 rounded-lg border transition-colors ${i === result.top_pick ? "border-[#F59E0B] bg-[#FFFCF7]" : "border-[#E8D9C5] bg-white"}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    {i === result.top_pick && (
                      <span className="text-xs bg-[#F59E0B] text-white px-1.5 py-0.5 rounded font-semibold">TOP</span>
                    )}
                    <span className="text-xs capitalize text-[#C4AA8A]">{t.strategy}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${CTR_BADGE[t.estimated_ctr_boost]}`}>
                      {t.estimated_ctr_boost} CTR
                    </span>
                  </div>
                  <p className="text-sm font-medium text-[#292524] leading-snug">{t.title}</p>
                  <p className="text-xs text-[#C4AA8A] mt-0.5">{t.hook_element}</p>
                </div>
                <button
                  onClick={() => copyTitle(t.title, i)}
                  className="shrink-0 p-1.5 rounded text-[#78614E] hover:bg-[#F5D7A0]/30 transition-colors"
                  title="Copy title"
                >
                  {copied === i ? (
                    <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
