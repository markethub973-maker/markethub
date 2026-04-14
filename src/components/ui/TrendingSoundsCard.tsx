"use client";
import { useState, useEffect, useRef } from "react";
import { formatNumber } from "@/lib/utils";
import { Globe, ChevronDown } from "lucide-react";

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

const ALL_COUNTRIES = [
  { code: "US", label: "🇺🇸 United States" },
  { code: "GB", label: "🇬🇧 United Kingdom" },
  { code: "RO", label: "🇷🇴 Romania" },
  { code: "DE", label: "🇩🇪 Germany" },
  { code: "FR", label: "🇫🇷 France" },
  { code: "IT", label: "🇮🇹 Italy" },
  { code: "ES", label: "🇪🇸 Spain" },
  { code: "BR", label: "🇧🇷 Brazil" },
  { code: "MX", label: "🇲🇽 Mexico" },
  { code: "AR", label: "🇦🇷 Argentina" },
  { code: "CO", label: "🇨🇴 Colombia" },
  { code: "PT", label: "🇵🇹 Portugal" },
  { code: "NL", label: "🇳🇱 Netherlands" },
  { code: "PL", label: "🇵🇱 Poland" },
  { code: "SE", label: "🇸🇪 Sweden" },
  { code: "NO", label: "🇳🇴 Norway" },
  { code: "DK", label: "🇩🇰 Denmark" },
  { code: "FI", label: "🇫🇮 Finland" },
  { code: "TR", label: "🇹🇷 Turkey" },
  { code: "SA", label: "🇸🇦 Saudi Arabia" },
  { code: "AE", label: "🇦🇪 UAE" },
  { code: "EG", label: "🇪🇬 Egypt" },
  { code: "IN", label: "🇮🇳 India" },
  { code: "JP", label: "🇯🇵 Japan" },
  { code: "KR", label: "🇰🇷 South Korea" },
  { code: "PH", label: "🇵🇭 Philippines" },
  { code: "ID", label: "🇮🇩 Indonesia" },
  { code: "TH", label: "🇹🇭 Thailand" },
  { code: "SG", label: "🇸🇬 Singapore" },
  { code: "MY", label: "🇲🇾 Malaysia" },
  { code: "VN", label: "🇻🇳 Vietnam" },
  { code: "TW", label: "🇹🇼 Taiwan" },
  { code: "AU", label: "🇦🇺 Australia" },
  { code: "CA", label: "🇨🇦 Canada" },
  { code: "ZA", label: "🇿🇦 South Africa" },
  { code: "NG", label: "🇳🇬 Nigeria" },
  { code: "KE", label: "🇰🇪 Kenya" },
  { code: "GH", label: "🇬🇭 Ghana" },
  { code: "RU", label: "🇷🇺 Russia" },
  { code: "UA", label: "🇺🇦 Ukraine" },
  { code: "CZ", label: "🇨🇿 Czech Republic" },
  { code: "HU", label: "🇭🇺 Hungary" },
  { code: "GR", label: "🇬🇷 Greece" },
  { code: "AT", label: "🇦🇹 Austria" },
  { code: "CH", label: "🇨🇭 Switzerland" },
  { code: "BE", label: "🇧🇪 Belgium" },
  { code: "SK", label: "🇸🇰 Slovakia" },
  { code: "BG", label: "🇧🇬 Bulgaria" },
  { code: "HR", label: "🇭🇷 Croatia" },
  { code: "RS", label: "🇷🇸 Serbia" },
];

export default function TrendingSoundsCard() {
  const [sounds, setSounds] = useState<Sound[]>([]);
  const [loading, setLoading] = useState(true);
  const [region, setRegion] = useState("US");
  const [isGlobal, setIsGlobal] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState<{ code: string; label: string } | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<"native" | "search_fallback" | undefined>(undefined);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleGlobal = () => {
    setIsGlobal(true);
    setSelectedCountry(null);
    setRegion("US");
    setDropdownOpen(false);
  };

  const handleSelectCountry = (c: { code: string; label: string }) => {
    setSelectedCountry(c);
    setIsGlobal(false);
    setRegion(c.code);
    setDropdownOpen(false);
  };

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

  const title = source === "search_fallback" ? "Trending Music Videos" : "Trending Sounds";

  return (
    <div className="bg-white border border-[#E8D9C5] rounded-xl p-4">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex items-center gap-2 mr-1">
          <span className="text-lg">🎵</span>
          <h3 className="font-semibold text-[#292524] text-sm">{title}</h3>
          <span className="text-xs text-[#C4AA8A]">TikTok</span>
        </div>

        {/* Global button */}
        <button
          type="button"
          onClick={handleGlobal}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all"
          style={isGlobal
            ? { backgroundColor: "var(--color-primary)", color: "#1C1814", border: "1px solid #F59E0B" }
            : { backgroundColor: "var(--color-bg-secondary)", color: "#78614E", border: "1px solid rgba(245,215,160,0.35)" }}
        >
          <Globe className="w-3 h-3" /> Global
        </button>

        {/* International dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen(prev => !prev)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all"
            style={!isGlobal
              ? { backgroundColor: "var(--color-primary)", color: "#1C1814", border: "1px solid #F59E0B" }
              : { backgroundColor: "var(--color-bg-secondary)", color: "#78614E", border: "1px solid rgba(245,215,160,0.35)" }}
          >
            {!isGlobal ? selectedCountry?.label : "🗺️ International"}
            <ChevronDown className={`w-3 h-3 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
          </button>
          {dropdownOpen && (
            <div
              className="absolute top-full left-0 mt-1 z-50 rounded-xl overflow-hidden overflow-y-auto"
              style={{ backgroundColor: "var(--color-bg-secondary)", border: "1px solid rgba(245,215,160,0.4)", boxShadow: "0 8px 24px rgba(120,97,78,0.15)", maxHeight: "300px", minWidth: "200px" }}
            >
              {ALL_COUNTRIES.map(c => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => handleSelectCountry(c)}
                  className="w-full text-left px-4 py-2.5 text-xs transition-colors"
                  style={{
                    color: selectedCountry?.code === c.code ? "var(--color-primary-hover)" : "#5C4A35",
                    backgroundColor: selectedCountry?.code === c.code ? "rgba(245,158,11,0.08)" : "transparent",
                    fontWeight: selectedCountry?.code === c.code ? "600" : "400",
                  }}
                  onMouseEnter={e => { if (selectedCountry?.code !== c.code) e.currentTarget.style.backgroundColor = "rgba(245,215,160,0.2)"; }}
                  onMouseLeave={e => { if (selectedCountry?.code !== c.code) e.currentTarget.style.backgroundColor = "transparent"; }}
                >
                  {c.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Fallback info */}
      {source === "search_fallback" && sounds.length > 0 && (
        <p className="text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded-lg p-2 mb-3">
          Showing trending music videos — native sounds data requires a higher RapidAPI plan.
        </p>
      )}

      {error && sounds.length === 0 && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-2 mb-3">
          {error}
        </p>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-12 bg-[#F5D7A0]/20 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : sounds.length === 0 ? (
        <p className="text-xs text-[#C4AA8A] text-center py-6">No trending sounds available for {selectedCountry?.label.split(" ").slice(1).join(" ") || "this region"}.</p>
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
