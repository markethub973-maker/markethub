"use client";
import { useState, useEffect } from "react";
import { formatNumber } from "@/lib/utils";

interface Sound {
  id: string;
  title: string;
  author: string;
  duration: number;
  uses: number;
  cover: string | null;
  tiktok_url: string;
  trend: string;
}

interface SoundsResponse {
  sounds: Sound[];
  region: string;
  count: number;
  error?: string;
  source?: "native" | "search_fallback";
}

const REGIONS = [
  { code: "US", label: "🇺🇸 US" },
  { code: "GB", label: "🇬🇧 UK" },
  { code: "RO", label: "🇷🇴 RO" },
  { code: "DE", label: "🇩🇪 DE" },
  { code: "FR", label: "🇫🇷 FR" },
];

export default function TrendingSoundsCard() {
  const [sounds, setSounds] = useState<Sound[]>([]);
  const [loading, setLoading] = useState(true);
  const [region, setRegion] = useState("US");
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<"native" | "search_fallback" | undefined>(undefined);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/tiktok/trending-sounds?region=${region}&count=20`);
        const data: SoundsResponse = await res.json();
        setSounds(data.sounds || []);
        setSource(data.source);
        if (data.error && (data.sounds || []).length === 0) setError(data.error);
      } catch {
        setError("Failed to load trending sounds");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [region]);

  return (
    <div className="bg-white border border-[#E8D9C5] rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎵</span>
          <h3 className="font-semibold text-[#292524] text-sm">
            {source === "search_fallback" ? "Trending Music Videos" : "Trending Sounds"}
          </h3>
          <span className="text-xs text-[#C4AA8A]">TikTok</span>
        </div>
        <div className="flex gap-1">
          {REGIONS.map(r => (
            <button
              key={r.code}
              onClick={() => setRegion(r.code)}
              className={`text-xs px-2 py-1 rounded-lg transition-colors ${region === r.code ? "bg-[#F59E0B] text-white" : "bg-[#F5D7A0]/30 text-[#78614E] hover:bg-[#F5D7A0]/60"}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {source === "search_fallback" && sounds.length > 0 && (
        <p className="text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded-lg p-2 mb-3">
          Showing trending music videos — native sounds data requires a higher RapidAPI plan.
        </p>
      )}

      {error && sounds.length === 0 && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-2 mb-3">
          {error} — TikTok trending sounds may not be available on your RapidAPI plan.
        </p>
      )}

      {loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-12 bg-[#F5D7A0]/20 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : sounds.length === 0 ? (
        <p className="text-xs text-[#C4AA8A] text-center py-6">No trending sounds available for {region}.</p>
      ) : (
        <div className="space-y-1.5">
          {sounds.slice(0, 15).map((s, i) => (
            <a
              key={s.id || i}
              href={s.tiktok_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-[#FFF8F0] transition-colors group"
            >
              <span className="text-xs font-bold text-[#C4AA8A] w-5 text-center shrink-0">{i + 1}</span>
              {s.cover ? (
                <img src={s.cover} alt={s.title} className="w-8 h-8 rounded object-cover shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded bg-[#F5D7A0]/40 flex items-center justify-center shrink-0">
                  <span className="text-sm">🎵</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[#292524] truncate">{s.title}</p>
                <p className="text-xs text-[#C4AA8A] truncate">{s.author}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-semibold text-[#292524]">{formatNumber(s.uses)}</p>
                <p className="text-xs text-[#C4AA8A]">{source === "search_fallback" ? "views" : "uses"}</p>
              </div>
              <svg className="w-3.5 h-3.5 text-[#C4AA8A] group-hover:text-[#F59E0B] transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
