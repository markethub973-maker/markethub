"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { TrendingUp, Eye, ThumbsUp, MessageCircle, Globe, Download, ExternalLink, ChevronDown } from "lucide-react";
import { formatNumber, exportCSV, exportJSON } from "@/lib/utils";

const cardStyle = { backgroundColor: "var(--color-bg-secondary)", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" };
const YT = "var(--color-primary)";
const GT = "#4285F4";

const ALL_COUNTRIES = [
  { code: "AF", label: "🇦🇫 Afghanistan" }, { code: "AL", label: "🇦🇱 Albania" },
  { code: "DZ", label: "🇩🇿 Algeria" }, { code: "AR", label: "🇦🇷 Argentina" },
  { code: "AM", label: "🇦🇲 Armenia" }, { code: "AU", label: "🇦🇺 Australia" },
  { code: "AT", label: "🇦🇹 Austria" }, { code: "AZ", label: "🇦🇿 Azerbaijan" },
  { code: "BH", label: "🇧🇭 Bahrain" }, { code: "BD", label: "🇧🇩 Bangladesh" },
  { code: "BY", label: "🇧🇾 Belarus" }, { code: "BE", label: "🇧🇪 Belgium" },
  { code: "BO", label: "🇧🇴 Bolivia" }, { code: "BA", label: "🇧🇦 Bosnia & Herzegovina" },
  { code: "BR", label: "🇧🇷 Brazil" }, { code: "BG", label: "🇧🇬 Bulgaria" },
  { code: "CA", label: "🇨🇦 Canada" }, { code: "CL", label: "🇨🇱 Chile" },
  { code: "CN", label: "🇨🇳 China" }, { code: "CO", label: "🇨🇴 Colombia" },
  { code: "HR", label: "🇭🇷 Croatia" }, { code: "CZ", label: "🇨🇿 Czech Republic" },
  { code: "DK", label: "🇩🇰 Denmark" }, { code: "DO", label: "🇩🇴 Dominican Republic" },
  { code: "EC", label: "🇪🇨 Ecuador" }, { code: "EG", label: "🇪🇬 Egypt" },
  { code: "EE", label: "🇪🇪 Estonia" }, { code: "FI", label: "🇫🇮 Finland" },
  { code: "FR", label: "🇫🇷 France" }, { code: "DE", label: "🇩🇪 Germany" },
  { code: "GH", label: "🇬🇭 Ghana" }, { code: "GR", label: "🇬🇷 Greece" },
  { code: "HK", label: "🇭🇰 Hong Kong" }, { code: "HU", label: "🇭🇺 Hungary" },
  { code: "IN", label: "🇮🇳 India" }, { code: "ID", label: "🇮🇩 Indonesia" },
  { code: "IE", label: "🇮🇪 Ireland" }, { code: "IL", label: "🇮🇱 Israel" },
  { code: "IT", label: "🇮🇹 Italy" }, { code: "JP", label: "🇯🇵 Japan" },
  { code: "KZ", label: "🇰🇿 Kazakhstan" }, { code: "KE", label: "🇰🇪 Kenya" },
  { code: "KW", label: "🇰🇼 Kuwait" }, { code: "LV", label: "🇱🇻 Latvia" },
  { code: "LT", label: "🇱🇹 Lithuania" }, { code: "MY", label: "🇲🇾 Malaysia" },
  { code: "MX", label: "🇲🇽 Mexico" }, { code: "MA", label: "🇲🇦 Morocco" },
  { code: "NL", label: "🇳🇱 Netherlands" }, { code: "NZ", label: "🇳🇿 New Zealand" },
  { code: "NG", label: "🇳🇬 Nigeria" }, { code: "NO", label: "🇳🇴 Norway" },
  { code: "PK", label: "🇵🇰 Pakistan" }, { code: "PE", label: "🇵🇪 Peru" },
  { code: "PH", label: "🇵🇭 Philippines" }, { code: "PL", label: "🇵🇱 Poland" },
  { code: "PT", label: "🇵🇹 Portugal" }, { code: "QA", label: "🇶🇦 Qatar" },
  { code: "RO", label: "🇷🇴 Romania" }, { code: "RU", label: "🇷🇺 Russia" },
  { code: "SA", label: "🇸🇦 Saudi Arabia" }, { code: "RS", label: "🇷🇸 Serbia" },
  { code: "SG", label: "🇸🇬 Singapore" }, { code: "SK", label: "🇸🇰 Slovakia" },
  { code: "SI", label: "🇸🇮 Slovenia" }, { code: "ZA", label: "🇿🇦 South Africa" },
  { code: "KR", label: "🇰🇷 South Korea" }, { code: "ES", label: "🇪🇸 Spain" },
  { code: "SE", label: "🇸🇪 Sweden" }, { code: "CH", label: "🇨🇭 Switzerland" },
  { code: "TW", label: "🇹🇼 Taiwan" }, { code: "TH", label: "🇹🇭 Thailand" },
  { code: "TR", label: "🇹🇷 Turkey" }, { code: "UA", label: "🇺🇦 Ukraine" },
  { code: "AE", label: "🇦🇪 UAE" }, { code: "GB", label: "🇬🇧 United Kingdom" },
  { code: "US", label: "🇺🇸 United States" }, { code: "UY", label: "🇺🇾 Uruguay" },
  { code: "UZ", label: "🇺🇿 Uzbekistan" }, { code: "VE", label: "🇻🇪 Venezuela" },
  { code: "VN", label: "🇻🇳 Vietnam" },
];

export default function GlobalTrendingPanel() {
  const [region, setRegion] = useState("US");
  const [isGlobal, setIsGlobal] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState<{ code: string; label: string } | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [platform, setPlatform] = useState<"youtube" | "trends">("youtube");

  const [videos, setVideos] = useState<any[]>([]);
  const [ytLoading, setYtLoading] = useState(false);
  const [ytCache, setYtCache] = useState<Record<string, any[]>>({});

  const [trends, setTrends] = useState<any[]>([]);
  const [trendsLoading, setTrendsLoading] = useState(false);
  const [trendsCache, setTrendsCache] = useState<Record<string, any[]>>({});
  const [trendsError, setTrendsError] = useState("");

  // Close dropdown on outside click
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

  const loadYoutube = useCallback((code: string) => {
    if (ytCache[code]) { setVideos(ytCache[code]); return; }
    setYtLoading(true);
    fetch(`/api/youtube/global-trending?region=${code}&max=10`)
      .then(r => r.json())
      .then(d => {
        if (d.videos) {
          setVideos(d.videos);
          setYtCache(prev => ({ ...prev, [code]: d.videos }));
        }
      })
      .finally(() => setYtLoading(false));
  }, [ytCache]);

  const loadTrends = useCallback((code: string) => {
    if (trendsCache[code]) { setTrends(trendsCache[code]); return; }
    setTrendsLoading(true);
    setTrendsError("");
    fetch(`/api/trends?type=daily&geo=${code}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setTrendsError(d.error); return; }
        setTrends(d.trends || []);
        setTrendsCache(prev => ({ ...prev, [code]: d.trends || [] }));
      })
      .catch(() => setTrendsError("Network error"))
      .finally(() => setTrendsLoading(false));
  }, [trendsCache]);

  useEffect(() => {
    if (platform === "youtube") loadYoutube(region);
    else loadTrends(region);
  }, [region, platform]);

  const countryFlag = selectedCountry?.label.split(" ")[0] ?? "🇺🇸";

  return (
    <div className="rounded-xl overflow-hidden" style={cardStyle}>
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 px-5 py-3" style={{ borderBottom: "1px solid rgba(245,215,160,0.2)" }}>
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4" style={{ color: YT }} />
          <span className="font-semibold text-sm" style={{ color: "var(--color-text)" }}>Global Trending</span>
          {!isGlobal && selectedCountry && (
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(245,158,11,0.12)", color: "var(--color-primary-hover)" }}>
              {countryFlag} {selectedCountry.label.split(" ").slice(1).join(" ")}
            </span>
          )}
        </div>

        {/* Global button */}
        <button type="button" onClick={handleGlobal}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-all ${isGlobal ? "btn-3d-active" : "btn-3d"}`}>
          <Globe className="w-4 h-4" /> Global
        </button>

        {/* International dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button type="button" onClick={() => setDropdownOpen(prev => !prev)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-all ${!isGlobal ? "btn-3d-active" : "btn-3d"}`}>
            {!isGlobal ? selectedCountry?.label : "🗺️ International"}
            <ChevronDown className={`w-4 h-4 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
          </button>
          {dropdownOpen && (
            <div className="absolute top-full left-0 mt-1 z-50 rounded-xl overflow-hidden overflow-y-auto"
              style={{ backgroundColor: "var(--color-bg-secondary)", border: "1px solid rgba(245,215,160,0.4)", boxShadow: "0 8px 24px rgba(120,97,78,0.15)", maxHeight: "300px", minWidth: "200px" }}>
              {ALL_COUNTRIES.map(c => (
                <button key={c.code} type="button" onClick={() => handleSelectCountry(c)}
                  className="w-full text-left px-4 py-2.5 text-xs transition-colors"
                  style={{
                    color: selectedCountry?.code === c.code ? "var(--color-primary-hover)" : "#5C4A35",
                    backgroundColor: selectedCountry?.code === c.code ? "rgba(245,158,11,0.08)" : "transparent",
                    fontWeight: selectedCountry?.code === c.code ? "600" : "400",
                  }}
                  onMouseEnter={e => { if (selectedCountry?.code !== c.code) e.currentTarget.style.backgroundColor = "rgba(245,215,160,0.2)"; }}
                  onMouseLeave={e => { if (selectedCountry?.code !== c.code) e.currentTarget.style.backgroundColor = "transparent"; }}>
                  {c.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Platform switcher */}
        <div className="flex gap-1 p-0.5 rounded-lg ml-auto" style={{ backgroundColor: "rgba(245,215,160,0.15)", border: "1px solid rgba(245,215,160,0.25)" }}>
          <button type="button" onClick={() => setPlatform("youtube")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-bold transition-all ${platform === "youtube" ? "btn-3d-active" : "btn-3d"}`}>
            ▶ YouTube
          </button>
          <button type="button" onClick={() => setPlatform("trends")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-bold transition-all ${platform === "trends" ? "btn-3d-active" : "btn-3d"}`}>
            🔍 Google Trends
          </button>
        </div>

        {/* Export */}
        {platform === "youtube" && videos.length > 0 && (
          <>
            <button type="button" onClick={() => exportCSV(
              `youtube-trending-${region}`,
              ["#", "Title", "Channel", "Views", "Likes", "Comments"],
              videos.map((v, i) => [i + 1, v.title, v.channel, v.views, v.likes, v.comments])
            )} className="btn-3d flex items-center gap-1 px-3 py-1.5 rounded text-sm font-semibold">
              <Download className="w-4 h-4" />CSV
            </button>
            <button type="button" onClick={() => exportJSON(
              `youtube-trending-${region}`, { region, videos }
            )} className="btn-3d flex items-center gap-1 px-3 py-1.5 rounded text-sm font-semibold">
              <Download className="w-4 h-4" />JSON
            </button>
          </>
        )}
        {platform === "trends" && trends.length > 0 && (
          <button type="button" onClick={() => exportCSV(
            `google-trends-${region}`,
            ["#", "Topic", "Traffic"],
            trends.map((t, i) => [i + 1, t.title, t.traffic])
          )} className="btn-3d flex items-center gap-1 px-3 py-1.5 rounded text-sm font-semibold">
            <Download className="w-4 h-4" />CSV
          </button>
        )}
        {(platform === "youtube" ? ytLoading : trendsLoading) && (
          <span className="text-xs" style={{ color: "#C4AA8A" }}>Loading...</span>
        )}
      </div>

      {/* YouTube Panel */}
      {platform === "youtube" && (
        ytLoading && videos.length === 0 ? (
          <div className="flex items-center justify-center h-48">
            <p className="text-sm" style={{ color: "#C4AA8A" }}>Loading YouTube data...</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "rgba(245,215,160,0.1)" }}>
            {videos.map((v, i) => (
              <a key={v.id} href={`https://www.youtube.com/watch?v=${v.id}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-start gap-3 px-5 py-3 transition-colors group"
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(245,215,160,0.07)")}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}>
                <span className="w-6 text-xs font-bold text-center flex-shrink-0 mt-1" style={{ color: i < 3 ? YT : "#C4AA8A" }}>
                  {i + 1}
                </span>
                <img src={v.thumbnail} alt="" className="w-24 h-14 rounded-lg object-cover flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold leading-snug line-clamp-2 group-hover:underline" style={{ color: "var(--color-text)" }}>{v.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: "#A8967E" }}>{v.channel}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="flex items-center gap-1 text-xs" style={{ color: YT }}>
                      <Eye className="w-3 h-3" />{formatNumber(v.views)}
                    </span>
                    <span className="flex items-center gap-1 text-xs" style={{ color: "#A8967E" }}>
                      <ThumbsUp className="w-3 h-3" />{formatNumber(v.likes)}
                    </span>
                    <span className="flex items-center gap-1 text-xs" style={{ color: "#A8967E" }}>
                      <MessageCircle className="w-3 h-3" />{formatNumber(v.comments)}
                    </span>
                  </div>
                </div>
              </a>
            ))}
            {videos.length === 0 && !ytLoading && (
              <div className="flex items-center justify-center h-32">
                <p className="text-sm" style={{ color: "#C4AA8A" }}>No YouTube data available for this country.</p>
              </div>
            )}
          </div>
        )
      )}

      {/* Google Trends Panel */}
      {platform === "trends" && (
        trendsLoading && trends.length === 0 ? (
          <div className="flex items-center justify-center h-48">
            <p className="text-sm" style={{ color: "#C4AA8A" }}>Loading Google Trends...</p>
          </div>
        ) : trendsError ? (
          <div className="p-5">
            <p className="text-sm" style={{ color: "#dc2626" }}>Error: {trendsError}</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "rgba(245,215,160,0.1)" }}>
            {trends.slice(0, 15).map((trend, i) => (
              <div key={i} className="flex items-start gap-3 px-5 py-3 transition-colors"
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(245,215,160,0.07)")}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}>
                <span className="w-6 text-xs font-bold text-center flex-shrink-0 mt-0.5" style={{ color: i < 3 ? GT : "#C4AA8A" }}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>{trend.title}</span>
                    <span className="text-xs font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: "rgba(66,133,244,0.1)", color: GT }}>
                      {trend.traffic}
                    </span>
                  </div>
                  {trend.articles?.[0] && (
                    <a href={trend.articles[0].url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 mt-1 group">
                      <span className="text-xs line-clamp-1 group-hover:underline" style={{ color: "#A8967E" }}>
                        {trend.articles[0].title}
                      </span>
                      <ExternalLink className="w-2.5 h-2.5 flex-shrink-0 opacity-0 group-hover:opacity-60" style={{ color: GT }} />
                    </a>
                  )}
                </div>
              </div>
            ))}
            {trends.length === 0 && !trendsLoading && (
              <div className="flex items-center justify-center h-32">
                <p className="text-sm" style={{ color: "#C4AA8A" }}>No Google Trends data for this country.</p>
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
}
