"use client";
import { useState } from "react";
import { Library, Sparkles, PlayCircle } from "lucide-react";

interface PlaylistItem {
  id: string;
  title: string;
  description?: string;
  videoCount: number;
  thumbnail?: string | null;
}

interface StrategyResult {
  strategy_type: string;
  strengths: string[];
  weaknesses: string[];
  missing_playlists: string[];
  seo_score: number;
  recommendations: Array<{ priority: number; action: string; example: string }>;
  top_playlist: string;
  executive_summary: string;
}

interface Props {
  channelId?: string;
}

export default function PlaylistStrategyCard({ channelId }: Props) {
  const [playlists, setPlaylists] = useState<PlaylistItem[]>([]);
  const [strategy, setStrategy] = useState<StrategyResult | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customChannelId, setCustomChannelId] = useState(channelId || "");

  const fetchPlaylists = async () => {
    const cid = customChannelId.trim();
    if (!cid) { setError("Channel ID required"); return; }
    setLoadingData(true);
    setError(null);
    setStrategy(null);
    try {
      const res = await fetch(`/api/youtube/playlists?channelId=${encodeURIComponent(cid)}`);
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      setPlaylists(data.playlists || []);
    } catch {
      setError("Failed to load playlists");
    } finally {
      setLoadingData(false);
    }
  };

  const runAIAnalysis = async () => {
    if (!playlists.length) return;
    setLoadingAI(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/playlist-strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playlists: playlists.map(p => ({ title: p.title, videoCount: p.videoCount, description: p.description }))
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || data.error || "AI analysis failed"); return; }
      setStrategy(data);
    } catch {
      setError("Connection error");
    } finally {
      setLoadingAI(false);
    }
  };

  const seoColor = (score: number) => {
    if (score >= 75) return "text-green-600";
    if (score >= 50) return "text-amber-600";
    return "text-red-500";
  };

  const STRATEGY_LABEL: Record<string, string> = {
    educational: "Educational",
    entertainment: "Entertainment",
    product: "Product",
    series: "Series",
    mixed: "Mixed",
    none: "No Strategy",
  };

  return (
    <div className="bg-white border border-[#E8D9C5] rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Library className="w-4 h-4 text-[#F59E0B]" />
        <h3 className="font-semibold text-[#292524]">Playlist Strategy Analyzer</h3>
      </div>

      {/* Channel ID input */}
      <div className="flex gap-2">
        <input
          value={customChannelId}
          onChange={e => setCustomChannelId(e.target.value)}
          onKeyDown={e => e.key === "Enter" && fetchPlaylists()}
          placeholder="YouTube Channel ID (e.g. UCxxxxxx)"
          className="flex-1 text-sm px-3 py-2 border border-[#E8D9C5] rounded-lg focus:outline-none focus:border-[#F59E0B] bg-[#FFFCF7] text-[#292524] placeholder:text-[#C4AA8A]"
        />
        <button onClick={fetchPlaylists} disabled={loadingData}
          className="btn-3d px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50 transition-colors">
          {loadingData ? "Loading..." : "Fetch"}
        </button>
      </div>

      {error && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">{error}</div>}

      {/* Playlists list */}
      {playlists.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-[#292524]">{playlists.length} playlists found</p>
            <button onClick={runAIAnalysis} disabled={loadingAI}
              className="btn-3d-active flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50 transition-colors">
              <Sparkles className="w-3 h-3" />
              {loadingAI ? "Analyzing..." : "AI Strategy"}
            </button>
          </div>
          <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto pr-1">
            {playlists.map(p => (
              <div key={p.id} className="flex items-center gap-2.5 bg-[#FFFCF7] border border-[#F5D7A0]/30 rounded-lg p-2">
                {p.thumbnail ? (
                  <img src={p.thumbnail} alt="" className="w-12 h-7 object-cover rounded shrink-0" />
                ) : (
                  <div className="w-12 h-7 bg-[#F5EDE0] rounded flex items-center justify-center shrink-0">
                    <PlayCircle className="w-4 h-4 text-[#C4AA8A]" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[#292524] truncate">{p.title}</p>
                </div>
                <span className="text-xs text-[#C4AA8A] shrink-0">{p.videoCount} videos</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Strategy result */}
      {strategy && (
        <div className="bg-[#FFFCF7] border border-[#F5D7A0]/50 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 font-medium">
                {STRATEGY_LABEL[strategy.strategy_type] || strategy.strategy_type}
              </span>
            </div>
            <div className="text-right">
              <p className="text-xs text-[#A8967E]">SEO Score</p>
              <p className={`text-lg font-bold ${seoColor(strategy.seo_score)}`}>{strategy.seo_score}/100</p>
            </div>
          </div>

          <p className="text-sm text-[#292524] leading-relaxed">{strategy.executive_summary}</p>

          {strategy.top_playlist && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5">
              <p className="text-xs font-semibold text-[#D97706] mb-0.5">Top Playlist</p>
              <p className="text-xs text-[#292524]">{strategy.top_playlist}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {strategy.strengths?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-green-700 mb-1">Strengths</p>
                <ul className="space-y-0.5">
                  {strategy.strengths.map((s, i) => (
                    <li key={i} className="text-xs text-[#78614E] flex gap-1"><span className="text-green-500 shrink-0">+</span>{s}</li>
                  ))}
                </ul>
              </div>
            )}
            {strategy.weaknesses?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-red-600 mb-1">Weaknesses</p>
                <ul className="space-y-0.5">
                  {strategy.weaknesses.map((w, i) => (
                    <li key={i} className="text-xs text-[#78614E] flex gap-1"><span className="text-red-400 shrink-0">−</span>{w}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {strategy.missing_playlists?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[#292524] mb-1">Missing Playlists to Create</p>
              <div className="flex flex-wrap gap-1">
                {strategy.missing_playlists.map((m, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-[#F5EDE0] text-[#78614E] border border-[#E8D9C5]">{m}</span>
                ))}
              </div>
            </div>
          )}

          {strategy.recommendations?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[#292524] mb-1.5">Action Plan</p>
              {strategy.recommendations.map((r, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <span className="w-4 h-4 rounded-full bg-[#F59E0B] text-white text-xs font-bold flex items-center justify-center shrink-0">{r.priority}</span>
                  <div>
                    <p className="text-xs text-[#292524]">{r.action}</p>
                    <p className="text-xs text-[#A8967E] italic">{r.example}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
