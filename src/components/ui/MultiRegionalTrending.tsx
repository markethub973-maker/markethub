"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { formatNumber } from "@/lib/utils";
import { Search, Plus, X, ChevronDown } from "lucide-react";

interface Video {
  id: string;
  title: string;
  channel: string;
  thumbnail: string;
  views: number;
  likes: number;
  url: string;
}

interface RegionData {
  region: string;
  videos: Video[];
  error?: string;
}

// Full international country list
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
  { code: "CL", label: "🇨🇱 Chile" },
  { code: "PE", label: "🇵🇪 Peru" },
  { code: "PT", label: "🇵🇹 Portugal" },
  { code: "NL", label: "🇳🇱 Netherlands" },
  { code: "PL", label: "🇵🇱 Poland" },
  { code: "SE", label: "🇸🇪 Sweden" },
  { code: "NO", label: "🇳🇴 Norway" },
  { code: "DK", label: "🇩🇰 Denmark" },
  { code: "FI", label: "🇫🇮 Finland" },
  { code: "BE", label: "🇧🇪 Belgium" },
  { code: "AT", label: "🇦🇹 Austria" },
  { code: "CH", label: "🇨🇭 Switzerland" },
  { code: "CZ", label: "🇨🇿 Czech Republic" },
  { code: "HU", label: "🇭🇺 Hungary" },
  { code: "GR", label: "🇬🇷 Greece" },
  { code: "SK", label: "🇸🇰 Slovakia" },
  { code: "BG", label: "🇧🇬 Bulgaria" },
  { code: "HR", label: "🇭🇷 Croatia" },
  { code: "RS", label: "🇷🇸 Serbia" },
  { code: "UA", label: "🇺🇦 Ukraine" },
  { code: "RU", label: "🇷🇺 Russia" },
  { code: "TR", label: "🇹🇷 Turkey" },
  { code: "SA", label: "🇸🇦 Saudi Arabia" },
  { code: "AE", label: "🇦🇪 UAE" },
  { code: "EG", label: "🇪🇬 Egypt" },
  { code: "NG", label: "🇳🇬 Nigeria" },
  { code: "KE", label: "🇰🇪 Kenya" },
  { code: "GH", label: "🇬🇭 Ghana" },
  { code: "ZA", label: "🇿🇦 South Africa" },
  { code: "MA", label: "🇲🇦 Morocco" },
  { code: "DZ", label: "🇩🇿 Algeria" },
  { code: "TN", label: "🇹🇳 Tunisia" },
  { code: "IN", label: "🇮🇳 India" },
  { code: "PK", label: "🇵🇰 Pakistan" },
  { code: "BD", label: "🇧🇩 Bangladesh" },
  { code: "JP", label: "🇯🇵 Japan" },
  { code: "KR", label: "🇰🇷 South Korea" },
  { code: "CN", label: "🇨🇳 China" },
  { code: "TW", label: "🇹🇼 Taiwan" },
  { code: "HK", label: "🇭🇰 Hong Kong" },
  { code: "SG", label: "🇸🇬 Singapore" },
  { code: "MY", label: "🇲🇾 Malaysia" },
  { code: "ID", label: "🇮🇩 Indonesia" },
  { code: "PH", label: "🇵🇭 Philippines" },
  { code: "TH", label: "🇹🇭 Thailand" },
  { code: "VN", label: "🇻🇳 Vietnam" },
  { code: "AU", label: "🇦🇺 Australia" },
  { code: "NZ", label: "🇳🇿 New Zealand" },
  { code: "CA", label: "🇨🇦 Canada" },
  { code: "IL", label: "🇮🇱 Israel" },
  { code: "IR", label: "🇮🇷 Iran" },
  { code: "IQ", label: "🇮🇶 Iraq" },
  { code: "LB", label: "🇱🇧 Lebanon" },
  { code: "JO", label: "🇯🇴 Jordan" },
  { code: "KW", label: "🇰🇼 Kuwait" },
  { code: "QA", label: "🇶🇦 Qatar" },
];

const countryMap = Object.fromEntries(ALL_COUNTRIES.map((c) => [c.code, c.label]));

const CATEGORIES: Array<{ id: string; label: string }> = [
  { id: "", label: "All" },
  { id: "10", label: "🎵 Music" },
  { id: "20", label: "🎮 Gaming" },
  { id: "22", label: "👤 People" },
  { id: "23", label: "😂 Comedy" },
  { id: "24", label: "🎬 Entertainment" },
  { id: "25", label: "📰 News" },
  { id: "26", label: "💅 Style" },
  { id: "27", label: "📚 Education" },
  { id: "28", label: "🔬 Sci & Tech" },
  { id: "17", label: "⚽ Sports" },
];

const MAX_REGIONS = 10;
const DEFAULT_REGIONS = ["US", "GB", "RO", "DE", "FR", "BR", "IN", "JP"];

export default function MultiRegionalTrending() {
  const [selectedRegions, setSelectedRegions] = useState<string[]>(DEFAULT_REGIONS);
  const [data, setData] = useState<Record<string, RegionData>>({});
  const [loading, setLoading] = useState(true);
  const [activeRegion, setActiveRegion] = useState("US");
  const [categoryId, setCategoryId] = useState("");
  const [keyword, setKeyword] = useState("");
  const [keywordInput, setKeywordInput] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownSearch, setDropdownSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
        setDropdownSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const load = useCallback(async (regions: string[], catId: string) => {
    if (regions.length === 0) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ regions: regions.join(","), max: "10" });
      if (catId) params.set("categoryId", catId);
      const res = await fetch(`/api/youtube/multi-regional?${params}`);
      const json = await res.json();
      setData(json.regions || {});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(selectedRegions, categoryId);
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const addRegion = (code: string) => {
    if (selectedRegions.includes(code) || selectedRegions.length >= MAX_REGIONS) return;
    const next = [...selectedRegions, code];
    setSelectedRegions(next);
    setActiveRegion(code);
    setDropdownOpen(false);
    setDropdownSearch("");
    load(next, categoryId);
  };

  const removeRegion = (code: string) => {
    const next = selectedRegions.filter((r) => r !== code);
    if (next.length === 0) return;
    setSelectedRegions(next);
    if (activeRegion === code) setActiveRegion(next[0]);
    load(next, categoryId);
  };

  const changeCategory = (catId: string) => {
    setCategoryId(catId);
    load(selectedRegions, catId);
  };

  const applyKeyword = () => setKeyword(keywordInput);

  const current = data[activeRegion];
  const filteredVideos = keyword
    ? (current?.videos || []).filter(
        (v) =>
          v.title.toLowerCase().includes(keyword.toLowerCase()) ||
          v.channel.toLowerCase().includes(keyword.toLowerCase())
      )
    : current?.videos || [];

  const availableToAdd = ALL_COUNTRIES.filter(
    (c) => !selectedRegions.includes(c.code)
  ).filter(
    (c) =>
      !dropdownSearch ||
      c.label.toLowerCase().includes(dropdownSearch.toLowerCase()) ||
      c.code.toLowerCase().includes(dropdownSearch.toLowerCase())
  );

  return (
    <div>
      {/* Header row: title + Add Country */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <h3 className="font-bold text-sm flex items-center gap-1.5" style={{ color: "var(--color-text)" }}>
          <span>🌍</span> Multi-Regional Trending
          <span className="text-xs font-normal" style={{ color: "var(--color-text-secondary, #78614E)" }}>YouTube</span>
        </h3>

        <span className="text-xs font-medium" style={{ color: "var(--color-text-secondary, #78614E)" }}>
          {selectedRegions.length}/{MAX_REGIONS} countries · {ALL_COUNTRIES.length} available
        </span>

        {/* Add country dropdown */}
        {selectedRegions.length < MAX_REGIONS && (
          <div className="relative ml-auto" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen((p) => !p)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg transition-all ${dropdownOpen ? "btn-3d-active" : "btn-3d"}`}
            >
              <Plus className="w-4 h-4" />
              Add Country
              <ChevronDown className={`w-4 h-4 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {dropdownOpen && (
              <div
                className="absolute top-full right-0 mt-1 z-50 rounded-xl overflow-hidden"
                style={{
                  backgroundColor: "var(--color-bg-secondary)",
                  border: "1px solid rgba(245,215,160,0.4)",
                  boxShadow: "0 8px 24px rgba(120,97,78,0.15)",
                  width: "220px",
                }}
              >
                {/* Search inside dropdown */}
                <div className="p-2 border-b" style={{ borderColor: "rgba(245,215,160,0.3)" }}>
                  <input
                    type="text"
                    value={dropdownSearch}
                    onChange={(e) => setDropdownSearch(e.target.value)}
                    placeholder="Search country..."
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg focus:outline-none"
                    style={{
                      backgroundColor: "rgba(245,215,160,0.15)",
                      color: "var(--color-text)",
                      border: "1px solid rgba(245,215,160,0.3)",
                    }}
                    autoFocus
                  />
                </div>
                <div className="overflow-y-auto" style={{ maxHeight: "240px" }}>
                  {availableToAdd.length === 0 ? (
                    <p className="text-xs text-[#C4AA8A] text-center py-4">No results</p>
                  ) : (
                    availableToAdd.map((c) => (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => addRegion(c.code)}
                        className="w-full text-left px-4 py-2 text-xs transition-colors"
                        style={{ color: "#5C4A35" }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(245,215,160,0.2)")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                      >
                        {c.label}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => changeCategory(cat.id)}
            className={`text-sm px-3.5 py-2 rounded-lg transition-all ${categoryId === cat.id ? "btn-3d-active" : "btn-3d"}`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Region tabs (selected countries, each removable) */}
      <div className="flex gap-1.5 mb-3 flex-wrap">
        {selectedRegions.map((code) => {
          const isActive = activeRegion === code;
          return (
            <div
              key={code}
              className={`flex items-center gap-1 overflow-hidden rounded-lg ${isActive ? "btn-3d-active" : "btn-3d"}`}
            >
              <button
                type="button"
                onClick={() => setActiveRegion(code)}
                className="text-sm px-3.5 py-2"
                style={{
                  color: isActive ? "#1C1814" : "#4A3F35",
                  fontWeight: isActive ? 800 : 600,
                  background: "transparent", border: "none", boxShadow: "none",
                  minHeight: "auto",
                }}
              >
                {countryMap[code]?.split(" ")[0]} {code}
              </button>
              {selectedRegions.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRegion(code)}
                  aria-label={`Remove ${code}`}
                  className="pr-2 py-2 transition-colors"
                  style={{
                    color: isActive ? "rgba(28,24,20,0.6)" : "#7A6E60",
                    background: "transparent", border: "none", boxShadow: "none",
                    minHeight: "auto",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#EF4444")}
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = isActive ? "rgba(28,24,20,0.6)" : "#7A6E60")
                  }
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Keyword filter */}
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A8967E]" />
          <input
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyKeyword()}
            placeholder="Filter by keyword..."
            className="w-full text-sm pl-9 pr-3 py-2 rounded-lg focus:outline-none"
            style={{
              backgroundColor: "var(--color-bg-secondary)",
              color: "var(--color-text)",
              border: "1px solid rgba(245,215,160,0.35)",
            }}
          />
        </div>
        <button
          type="button"
          onClick={applyKeyword}
          className="px-4 py-2 text-sm rounded-lg transition-all btn-3d-active"
        >
          Filter
        </button>
        {keyword && (
          <button
            type="button"
            onClick={() => { setKeyword(""); setKeywordInput(""); }}
            className="px-3 py-2 text-sm rounded-lg transition-all btn-3d"
          >
            Clear
          </button>
        )}
      </div>

      {/* Video list */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 rounded-lg animate-pulse" style={{ backgroundColor: "rgba(245,215,160,0.15)" }} />
          ))}
        </div>
      ) : current?.error ? (
        <p className="text-xs text-red-500 text-center py-4">{current.error}</p>
      ) : !filteredVideos.length ? (
        <p className="text-xs text-[#C4AA8A] text-center py-6">
          {keyword ? `No results for "${keyword}"` : `No trending data for ${countryMap[activeRegion]?.split(" ").slice(1).join(" ") || activeRegion}.`}
        </p>
      ) : (
        <div className="space-y-1.5">
          {filteredVideos.map((v, i) => (
            <a
              key={v.id}
              href={v.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-2.5 rounded-lg transition-colors group"
              style={{ backgroundColor: "transparent" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--color-bg)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              <span className="text-xs font-bold text-[#C4AA8A] w-5 text-center shrink-0">{i + 1}</span>
              {v.thumbnail && (
                <img src={v.thumbnail} alt={v.title} className="w-16 h-10 rounded object-cover shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[#292524] line-clamp-2 leading-snug">{v.title}</p>
                <p className="text-xs text-[#C4AA8A] truncate mt-0.5">{v.channel}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-semibold text-[#292524]">{formatNumber(v.views)}</p>
                <p className="text-xs text-[#C4AA8A]">views</p>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
