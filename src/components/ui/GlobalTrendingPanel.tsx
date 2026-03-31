"use client";

import { useState, useEffect, useCallback } from "react";
import { TrendingUp, Eye, ThumbsUp, MessageCircle, Globe, ChevronRight, Download, ExternalLink } from "lucide-react";
import { formatNumber, exportCSV, exportJSON } from "@/lib/utils";

const cardStyle = { backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" };
const YT = "#F59E0B";
const GT = "#4285F4";

const CONTINENTS: { label: string; emoji: string; countries: { code: string; name: string; flag: string }[] }[] = [
  {
    label: "Europe", emoji: "🇪🇺",
    countries: [
      { code: "RO", name: "Romania", flag: "🇷🇴" },
      { code: "GB", name: "UK", flag: "🇬🇧" },
      { code: "DE", name: "Germany", flag: "🇩🇪" },
      { code: "FR", name: "France", flag: "🇫🇷" },
      { code: "IT", name: "Italy", flag: "🇮🇹" },
      { code: "ES", name: "Spain", flag: "🇪🇸" },
      { code: "NL", name: "Netherlands", flag: "🇳🇱" },
      { code: "PL", name: "Poland", flag: "🇵🇱" },
      { code: "SE", name: "Sweden", flag: "🇸🇪" },
      { code: "NO", name: "Norway", flag: "🇳🇴" },
      { code: "DK", name: "Denmark", flag: "🇩🇰" },
      { code: "FI", name: "Finland", flag: "🇫🇮" },
      { code: "PT", name: "Portugal", flag: "🇵🇹" },
      { code: "GR", name: "Greece", flag: "🇬🇷" },
      { code: "AT", name: "Austria", flag: "🇦🇹" },
      { code: "BE", name: "Belgium", flag: "🇧🇪" },
      { code: "CH", name: "Switzerland", flag: "🇨🇭" },
      { code: "HU", name: "Hungary", flag: "🇭🇺" },
      { code: "CZ", name: "Czech Republic", flag: "🇨🇿" },
      { code: "SK", name: "Slovakia", flag: "🇸🇰" },
      { code: "BG", name: "Bulgaria", flag: "🇧🇬" },
      { code: "HR", name: "Croatia", flag: "🇭🇷" },
      { code: "RS", name: "Serbia", flag: "🇷🇸" },
      { code: "UA", name: "Ukraine", flag: "🇺🇦" },
      { code: "LT", name: "Lithuania", flag: "🇱🇹" },
      { code: "LV", name: "Latvia", flag: "🇱🇻" },
      { code: "EE", name: "Estonia", flag: "🇪🇪" },
      { code: "SI", name: "Slovenia", flag: "🇸🇮" },
    ],
  },
  {
    label: "Americas", emoji: "🌎",
    countries: [
      { code: "US", name: "USA", flag: "🇺🇸" },
      { code: "CA", name: "Canada", flag: "🇨🇦" },
      { code: "BR", name: "Brazil", flag: "🇧🇷" },
      { code: "MX", name: "Mexico", flag: "🇲🇽" },
      { code: "AR", name: "Argentina", flag: "🇦🇷" },
      { code: "CO", name: "Colombia", flag: "🇨🇴" },
      { code: "CL", name: "Chile", flag: "🇨🇱" },
      { code: "PE", name: "Peru", flag: "🇵🇪" },
      { code: "VE", name: "Venezuela", flag: "🇻🇪" },
    ],
  },
  {
    label: "Asia & Pacific", emoji: "🌏",
    countries: [
      { code: "JP", name: "Japan", flag: "🇯🇵" },
      { code: "KR", name: "South Korea", flag: "🇰🇷" },
      { code: "IN", name: "India", flag: "🇮🇳" },
      { code: "PH", name: "Philippines", flag: "🇵🇭" },
      { code: "TH", name: "Thailand", flag: "🇹🇭" },
      { code: "SG", name: "Singapore", flag: "🇸🇬" },
      { code: "TW", name: "Taiwan", flag: "🇹🇼" },
      { code: "HK", name: "Hong Kong", flag: "🇭🇰" },
      { code: "ID", name: "Indonesia", flag: "🇮🇩" },
      { code: "MY", name: "Malaysia", flag: "🇲🇾" },
      { code: "VN", name: "Vietnam", flag: "🇻🇳" },
      { code: "AU", name: "Australia", flag: "🇦🇺" },
      { code: "NZ", name: "New Zealand", flag: "🇳🇿" },
    ],
  },
  {
    label: "Middle East & Africa", emoji: "🌍",
    countries: [
      { code: "SA", name: "Saudi Arabia", flag: "🇸🇦" },
      { code: "AE", name: "UAE", flag: "🇦🇪" },
      { code: "TR", name: "Turkey", flag: "🇹🇷" },
      { code: "EG", name: "Egypt", flag: "🇪🇬" },
      { code: "IL", name: "Israel", flag: "🇮🇱" },
      { code: "ZA", name: "South Africa", flag: "🇿🇦" },
      { code: "NG", name: "Nigeria", flag: "🇳🇬" },
      { code: "KE", name: "Kenya", flag: "🇰🇪" },
    ],
  },
];

export default function GlobalTrendingPanel() {
  const [selectedCountry, setSelectedCountry] = useState({ code: "US", name: "USA", flag: "🇺🇸" });
  const [activeContinent, setActiveContinent] = useState("Americas");
  const [platform, setPlatform] = useState<"youtube" | "trends">("youtube");

  const [videos, setVideos] = useState<any[]>([]);
  const [ytLoading, setYtLoading] = useState(false);
  const [ytCache, setYtCache] = useState<Record<string, any[]>>({});

  const [trends, setTrends] = useState<any[]>([]);
  const [trendsLoading, setTrendsLoading] = useState(false);
  const [trendsCache, setTrendsCache] = useState<Record<string, any[]>>({});
  const [trendsError, setTrendsError] = useState("");

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
    if (platform === "youtube") loadYoutube(selectedCountry.code);
    else loadTrends(selectedCountry.code);
  }, [selectedCountry.code, platform]);

  const accentColor = platform === "youtube" ? YT : GT;

  return (
    <div className="rounded-xl overflow-hidden" style={cardStyle}>
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-3" style={{ borderBottom: "1px solid rgba(245,215,160,0.2)" }}>
        <Globe className="w-4 h-4" style={{ color: YT }} />
        <span className="font-semibold text-sm" style={{ color: "#292524" }}>Global Trending</span>
        <span className="text-xs ml-1 px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(245,158,11,0.12)", color: "#D97706" }}>
          {selectedCountry.flag} {selectedCountry.name}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3">
        {/* Left: Country Selector */}
        <div style={{ borderRight: "1px solid rgba(245,215,160,0.2)" }}>
          {/* Continent tabs */}
          <div className="flex flex-wrap gap-1 p-3" style={{ borderBottom: "1px solid rgba(245,215,160,0.2)" }}>
            {CONTINENTS.map(c => (
              <button key={c.label} type="button"
                onClick={() => setActiveContinent(c.label)}
                className="px-2 py-1 text-xs font-medium rounded-md transition-colors"
                style={activeContinent === c.label
                  ? { backgroundColor: YT, color: "#1C1814" }
                  : { color: "#78614E", backgroundColor: "rgba(245,215,160,0.1)" }}>
                {c.emoji} {c.label}
              </button>
            ))}
          </div>
          {/* Countries list */}
          <div className="overflow-y-auto" style={{ maxHeight: "380px" }}>
            {CONTINENTS.find(c => c.label === activeContinent)?.countries.map(country => (
              <button key={country.code} type="button"
                onClick={() => setSelectedCountry(country)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                style={selectedCountry.code === country.code
                  ? { backgroundColor: "rgba(245,158,11,0.12)", borderLeft: `3px solid ${YT}` }
                  : { borderLeft: "3px solid transparent" }}
                onMouseEnter={e => { if (selectedCountry.code !== country.code) e.currentTarget.style.backgroundColor = "rgba(245,215,160,0.07)"; }}
                onMouseLeave={e => { if (selectedCountry.code !== country.code) e.currentTarget.style.backgroundColor = "transparent"; }}>
                <span className="text-lg">{country.flag}</span>
                <span className="text-sm font-medium" style={{ color: selectedCountry.code === country.code ? YT : "#292524" }}>
                  {country.name}
                </span>
                <span className="ml-auto text-xs font-mono" style={{ color: "#C4AA8A" }}>{country.code}</span>
                {selectedCountry.code === country.code && <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: YT }} />}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Data Panel */}
        <div className="lg:col-span-2">
          {/* Platform switcher */}
          <div className="flex items-center gap-3 px-5 py-3" style={{ borderBottom: "1px solid rgba(245,215,160,0.2)" }}>
            <div className="flex gap-1 p-0.5 rounded-lg" style={{ backgroundColor: "rgba(245,215,160,0.15)", border: "1px solid rgba(245,215,160,0.25)" }}>
              <button type="button" onClick={() => setPlatform("youtube")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all"
                style={platform === "youtube" ? { backgroundColor: YT, color: "white" } : { color: "#78614E" }}>
                ▶ YouTube
              </button>
              <button type="button" onClick={() => setPlatform("trends")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all"
                style={platform === "trends" ? { backgroundColor: GT, color: "white" } : { color: "#78614E" }}>
                🔍 Google Trends
              </button>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {(platform === "youtube" ? ytLoading : trendsLoading) && (
                <span className="text-xs" style={{ color: "#C4AA8A" }}>Loading...</span>
              )}
              {platform === "youtube" && videos.length > 0 && (
                <>
                  <button type="button" onClick={() => exportCSV(
                    `youtube-trending-${selectedCountry.code}`,
                    ["#", "Title", "Channel", "Views", "Likes", "Comments"],
                    videos.map((v, i) => [i + 1, v.title, v.channel, v.views, v.likes, v.comments])
                  )} className="flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold"
                    style={{ backgroundColor: "rgba(245,215,160,0.15)", color: "#78614E" }}>
                    <Download className="w-3 h-3" />CSV
                  </button>
                  <button type="button" onClick={() => exportJSON(
                    `youtube-trending-${selectedCountry.code}`, { country: selectedCountry, videos }
                  )} className="flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold"
                    style={{ backgroundColor: "rgba(245,215,160,0.15)", color: "#78614E" }}>
                    <Download className="w-3 h-3" />JSON
                  </button>
                </>
              )}
              {platform === "trends" && trends.length > 0 && (
                <button type="button" onClick={() => exportCSV(
                  `google-trends-${selectedCountry.code}`,
                  ["#", "Topic", "Traffic"],
                  trends.map((t, i) => [i + 1, t.title, t.traffic])
                )} className="flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold"
                  style={{ backgroundColor: "rgba(66,133,244,0.1)", color: GT }}>
                  <Download className="w-3 h-3" />CSV
                </button>
              )}
            </div>
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
                      <p className="text-sm font-semibold leading-snug line-clamp-2 group-hover:underline" style={{ color: "#292524" }}>{v.title}</p>
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
                        <span className="text-sm font-semibold" style={{ color: "#292524" }}>{trend.title}</span>
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
      </div>
    </div>
  );
}
