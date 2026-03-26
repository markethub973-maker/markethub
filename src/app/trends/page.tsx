"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/layout/Header";
import { Search, TrendingUp, BarChart2, ArrowUpRight, Plus, X, ExternalLink, Globe, ChevronDown } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const A = "#F5A623";
const COLORS = ["#F5A623", "#1DB954", "#3B82F6", "#EF4444", "#8B5CF6"];
const cardStyle = { backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" };

const ALL_COUNTRIES = [
  { code: "AF", label: "🇦🇫 Afghanistan" },
  { code: "AL", label: "🇦🇱 Albania" },
  { code: "DZ", label: "🇩🇿 Algeria" },
  { code: "AD", label: "🇦🇩 Andorra" },
  { code: "AO", label: "🇦🇴 Angola" },
  { code: "AG", label: "🇦🇬 Antigua & Barbuda" },
  { code: "AR", label: "🇦🇷 Argentina" },
  { code: "AM", label: "🇦🇲 Armenia" },
  { code: "AU", label: "🇦🇺 Australia" },
  { code: "AT", label: "🇦🇹 Austria" },
  { code: "AZ", label: "🇦🇿 Azerbaijan" },
  { code: "BS", label: "🇧🇸 Bahamas" },
  { code: "BH", label: "🇧🇭 Bahrain" },
  { code: "BD", label: "🇧🇩 Bangladesh" },
  { code: "BB", label: "🇧🇧 Barbados" },
  { code: "BY", label: "🇧🇾 Belarus" },
  { code: "BE", label: "🇧🇪 Belgium" },
  { code: "BZ", label: "🇧🇿 Belize" },
  { code: "BJ", label: "🇧🇯 Benin" },
  { code: "BT", label: "🇧🇹 Bhutan" },
  { code: "BO", label: "🇧🇴 Bolivia" },
  { code: "BA", label: "🇧🇦 Bosnia & Herzegovina" },
  { code: "BW", label: "🇧🇼 Botswana" },
  { code: "BR", label: "🇧🇷 Brazil" },
  { code: "BN", label: "🇧🇳 Brunei" },
  { code: "BG", label: "🇧🇬 Bulgaria" },
  { code: "BF", label: "🇧🇫 Burkina Faso" },
  { code: "BI", label: "🇧🇮 Burundi" },
  { code: "CV", label: "🇨🇻 Cape Verde" },
  { code: "KH", label: "🇰🇭 Cambodia" },
  { code: "CM", label: "🇨🇲 Cameroon" },
  { code: "CA", label: "🇨🇦 Canada" },
  { code: "CF", label: "🇨🇫 Central African Republic" },
  { code: "TD", label: "🇹🇩 Chad" },
  { code: "CL", label: "🇨🇱 Chile" },
  { code: "CN", label: "🇨🇳 China" },
  { code: "CO", label: "🇨🇴 Colombia" },
  { code: "KM", label: "🇰🇲 Comoros" },
  { code: "CG", label: "🇨🇬 Congo" },
  { code: "CR", label: "🇨🇷 Costa Rica" },
  { code: "HR", label: "🇭🇷 Croatia" },
  { code: "CU", label: "🇨🇺 Cuba" },
  { code: "CY", label: "🇨🇾 Cyprus" },
  { code: "CZ", label: "🇨🇿 Czech Republic" },
  { code: "DK", label: "🇩🇰 Denmark" },
  { code: "DJ", label: "🇩🇯 Djibouti" },
  { code: "DO", label: "🇩🇴 Dominican Republic" },
  { code: "EC", label: "🇪🇨 Ecuador" },
  { code: "EG", label: "🇪🇬 Egypt" },
  { code: "SV", label: "🇸🇻 El Salvador" },
  { code: "GQ", label: "🇬🇶 Equatorial Guinea" },
  { code: "ER", label: "🇪🇷 Eritrea" },
  { code: "EE", label: "🇪🇪 Estonia" },
  { code: "SZ", label: "🇸🇿 Eswatini" },
  { code: "ET", label: "🇪🇹 Ethiopia" },
  { code: "FJ", label: "🇫🇯 Fiji" },
  { code: "FI", label: "🇫🇮 Finland" },
  { code: "FR", label: "🇫🇷 France" },
  { code: "GA", label: "🇬🇦 Gabon" },
  { code: "GM", label: "🇬🇲 Gambia" },
  { code: "GE", label: "🇬🇪 Georgia" },
  { code: "DE", label: "🇩🇪 Germany" },
  { code: "GH", label: "🇬🇭 Ghana" },
  { code: "GR", label: "🇬🇷 Greece" },
  { code: "GT", label: "🇬🇹 Guatemala" },
  { code: "GN", label: "🇬🇳 Guinea" },
  { code: "GW", label: "🇬🇼 Guinea-Bissau" },
  { code: "GY", label: "🇬🇾 Guyana" },
  { code: "HT", label: "🇭🇹 Haiti" },
  { code: "HN", label: "🇭🇳 Honduras" },
  { code: "HK", label: "🇭🇰 Hong Kong" },
  { code: "HU", label: "🇭🇺 Hungary" },
  { code: "IS", label: "🇮🇸 Iceland" },
  { code: "IN", label: "🇮🇳 India" },
  { code: "ID", label: "🇮🇩 Indonesia" },
  { code: "IQ", label: "🇮🇶 Iraq" },
  { code: "IE", label: "🇮🇪 Ireland" },
  { code: "IL", label: "🇮🇱 Israel" },
  { code: "IT", label: "🇮🇹 Italy" },
  { code: "CI", label: "🇨🇮 Ivory Coast" },
  { code: "JM", label: "🇯🇲 Jamaica" },
  { code: "JP", label: "🇯🇵 Japan" },
  { code: "JO", label: "🇯🇴 Jordan" },
  { code: "KZ", label: "🇰🇿 Kazakhstan" },
  { code: "KE", label: "🇰🇪 Kenya" },
  { code: "KW", label: "🇰🇼 Kuwait" },
  { code: "KG", label: "🇰🇬 Kyrgyzstan" },
  { code: "LA", label: "🇱🇦 Laos" },
  { code: "LV", label: "🇱🇻 Latvia" },
  { code: "LB", label: "🇱🇧 Lebanon" },
  { code: "LS", label: "🇱🇸 Lesotho" },
  { code: "LR", label: "🇱🇷 Liberia" },
  { code: "LY", label: "🇱🇾 Libya" },
  { code: "LI", label: "🇱🇮 Liechtenstein" },
  { code: "LT", label: "🇱🇹 Lithuania" },
  { code: "LU", label: "🇱🇺 Luxembourg" },
  { code: "MG", label: "🇲🇬 Madagascar" },
  { code: "MW", label: "🇲🇼 Malawi" },
  { code: "MY", label: "🇲🇾 Malaysia" },
  { code: "MV", label: "🇲🇻 Maldives" },
  { code: "ML", label: "🇲🇱 Mali" },
  { code: "MT", label: "🇲🇹 Malta" },
  { code: "MR", label: "🇲🇷 Mauritania" },
  { code: "MU", label: "🇲🇺 Mauritius" },
  { code: "MX", label: "🇲🇽 Mexico" },
  { code: "MD", label: "🇲🇩 Moldova" },
  { code: "MC", label: "🇲🇨 Monaco" },
  { code: "MN", label: "🇲🇳 Mongolia" },
  { code: "ME", label: "🇲🇪 Montenegro" },
  { code: "MA", label: "🇲🇦 Morocco" },
  { code: "MZ", label: "🇲🇿 Mozambique" },
  { code: "MM", label: "🇲🇲 Myanmar" },
  { code: "NA", label: "🇳🇦 Namibia" },
  { code: "NP", label: "🇳🇵 Nepal" },
  { code: "NL", label: "🇳🇱 Netherlands" },
  { code: "NZ", label: "🇳🇿 New Zealand" },
  { code: "NI", label: "🇳🇮 Nicaragua" },
  { code: "NE", label: "🇳🇪 Niger" },
  { code: "NG", label: "🇳🇬 Nigeria" },
  { code: "MK", label: "🇲🇰 North Macedonia" },
  { code: "NO", label: "🇳🇴 Norway" },
  { code: "OM", label: "🇴🇲 Oman" },
  { code: "PK", label: "🇵🇰 Pakistan" },
  { code: "PA", label: "🇵🇦 Panama" },
  { code: "PG", label: "🇵🇬 Papua New Guinea" },
  { code: "PY", label: "🇵🇾 Paraguay" },
  { code: "PE", label: "🇵🇪 Peru" },
  { code: "PH", label: "🇵🇭 Philippines" },
  { code: "PL", label: "🇵🇱 Poland" },
  { code: "PT", label: "🇵🇹 Portugal" },
  { code: "QA", label: "🇶🇦 Qatar" },
  { code: "RO", label: "🇷🇴 Romania" },
  { code: "RU", label: "🇷🇺 Russia" },
  { code: "RW", label: "🇷🇼 Rwanda" },
  { code: "WS", label: "🇼🇸 Samoa" },
  { code: "SA", label: "🇸🇦 Saudi Arabia" },
  { code: "SN", label: "🇸🇳 Senegal" },
  { code: "RS", label: "🇷🇸 Serbia" },
  { code: "SL", label: "🇸🇱 Sierra Leone" },
  { code: "SG", label: "🇸🇬 Singapore" },
  { code: "SK", label: "🇸🇰 Slovakia" },
  { code: "SI", label: "🇸🇮 Slovenia" },
  { code: "SO", label: "🇸🇴 Somalia" },
  { code: "ZA", label: "🇿🇦 South Africa" },
  { code: "SS", label: "🇸🇸 South Sudan" },
  { code: "ES", label: "🇪🇸 Spain" },
  { code: "LK", label: "🇱🇰 Sri Lanka" },
  { code: "SD", label: "🇸🇩 Sudan" },
  { code: "SR", label: "🇸🇷 Suriname" },
  { code: "SE", label: "🇸🇪 Sweden" },
  { code: "CH", label: "🇨🇭 Switzerland" },
  { code: "TW", label: "🇹🇼 Taiwan" },
  { code: "TJ", label: "🇹🇯 Tajikistan" },
  { code: "TZ", label: "🇹🇿 Tanzania" },
  { code: "TH", label: "🇹🇭 Thailand" },
  { code: "TG", label: "🇹🇬 Togo" },
  { code: "TT", label: "🇹🇹 Trinidad & Tobago" },
  { code: "TN", label: "🇹🇳 Tunisia" },
  { code: "TR", label: "🇹🇷 Turkey" },
  { code: "TM", label: "🇹🇲 Turkmenistan" },
  { code: "UG", label: "🇺🇬 Uganda" },
  { code: "UA", label: "🇺🇦 Ukraine" },
  { code: "AE", label: "🇦🇪 UAE" },
  { code: "GB", label: "🇬🇧 United Kingdom" },
  { code: "US", label: "🇺🇸 United States" },
  { code: "UY", label: "🇺🇾 Uruguay" },
  { code: "UZ", label: "🇺🇿 Uzbekistan" },
  { code: "VE", label: "🇻🇪 Venezuela" },
  { code: "VN", label: "🇻🇳 Vietnam" },
  { code: "YE", label: "🇾🇪 Yemen" },
  { code: "ZM", label: "🇿🇲 Zambia" },
  { code: "ZW", label: "🇿🇼 Zimbabwe" },
];

export default function TrendsPage() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<"daily" | "compare" | "related">("daily");
  const [geo, setGeo] = useState("US");
  const [isGlobal, setIsGlobal] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState<{ code: string; label: string } | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
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
    setGeo("US");
    setDropdownOpen(false);
  };

  const handleSelectCountry = (country: { code: string; label: string }) => {
    setSelectedCountry(country);
    setIsGlobal(false);
    setGeo(country.code);
    setDropdownOpen(false);
  };

  const currentLabel = isGlobal ? "🌍 Global" : (selectedCountry?.label ?? "🌍 Global");

  // Daily trends state
  const [daily, setDaily] = useState<any[]>([]);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [dailyError, setDailyError] = useState("");

  // Compare state
  const [kwInput, setKwInput] = useState("");
  const [keywords, setKeywords] = useState<string[]>(["marketing", "social media"]);

  // Handle ?q= from header search → add as keyword in Compare tab
  useEffect(() => {
    const q = searchParams.get("q");
    if (q && !keywords.includes(q) && keywords.length < 5) {
      setKeywords(prev => [...prev, q]);
      setTab("compare");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  const [compareData, setCompareData] = useState<any>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState("");

  // Related state
  const [relQuery, setRelQuery] = useState("");
  const [relData, setRelData] = useState<any>(null);
  const [relLoading, setRelLoading] = useState(false);
  const [relError, setRelError] = useState("");

  const loadDaily = useCallback((g: string) => {
    setDailyLoading(true);
    setDailyError("");
    fetch(`/api/trends?type=daily&geo=${g}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setDailyError(d.error);
        else setDaily(d.trends || []);
      })
      .catch(() => setDailyError("Network error"))
      .finally(() => setDailyLoading(false));
  }, []);

  useEffect(() => {
    if (tab === "daily") loadDaily(geo);
  }, [tab, geo, loadDaily]);

  const addKeyword = () => {
    const kw = kwInput.trim();
    if (!kw || keywords.includes(kw) || keywords.length >= 5) return;
    setKeywords(prev => [...prev, kw]);
    setKwInput("");
  };

  const loadCompare = () => {
    if (!keywords.length) return;
    setCompareLoading(true);
    setCompareError("");
    fetch(`/api/trends?type=interest&keywords=${encodeURIComponent(keywords.join(","))}&geo=${geo}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setCompareError(d.error);
        else setCompareData(d);
      })
      .catch(() => setCompareError("Network error"))
      .finally(() => setCompareLoading(false));
  };

  const loadRelated = () => {
    if (!relQuery.trim()) return;
    setRelLoading(true);
    setRelError("");
    fetch(`/api/trends?type=related&keyword=${encodeURIComponent(relQuery.trim())}&geo=${geo}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setRelError(d.error);
        else setRelData(d);
      })
      .catch(() => setRelError("Network error"))
      .finally(() => setRelLoading(false));
  };

  const chartData = compareData?.timeline?.map((point: any) => {
    const obj: Record<string, any> = { date: point.date };
    compareData.keywords.forEach((kw: string, i: number) => {
      obj[kw] = point.values[i] ?? 0;
    });
    return obj;
  }) || [];

  return (
    <div>
      <Header title="Google Trends" subtitle="Trending searches, compare keywords, related queries" />
      <div className="p-6 space-y-5">

        {/* Country selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold" style={{ color: "#A8967E" }}>Country:</span>

          {/* Global Button */}
          <button type="button" onClick={handleGlobal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={isGlobal ? { backgroundColor: A, color: "white" } : { backgroundColor: "#FFFCF7", color: "#78614E", border: "1px solid rgba(245,215,160,0.35)" }}
          >
            <Globe className="w-3 h-3" /> Global
          </button>

          {/* International Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button type="button" onClick={() => setDropdownOpen(prev => !prev)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={!isGlobal ? { backgroundColor: A, color: "white" } : { backgroundColor: "#FFFCF7", color: "#78614E", border: "1px solid rgba(245,215,160,0.35)" }}
            >
              {!isGlobal ? selectedCountry?.label : "🗺️ International"}
              <ChevronDown className={`w-3 h-3 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
            </button>
            {dropdownOpen && (
              <div className="absolute top-full left-0 mt-1 z-50 rounded-xl overflow-hidden overflow-y-auto"
                style={{ backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.4)", boxShadow: "0 8px 24px rgba(120,97,78,0.15)", maxHeight: "300px", minWidth: "200px" }}
              >
                {ALL_COUNTRIES.map(c => (
                  <button key={c.code} type="button" onClick={() => handleSelectCountry(c)}
                    className="w-full text-left px-4 py-2.5 text-xs transition-colors"
                    style={{ color: selectedCountry?.code === c.code ? A : "#5C4A35", backgroundColor: selectedCountry?.code === c.code ? "rgba(245,166,35,0.08)" : "transparent", fontWeight: selectedCountry?.code === c.code ? "600" : "400" }}
                    onMouseEnter={e => { if (selectedCountry?.code !== c.code) e.currentTarget.style.backgroundColor = "rgba(245,215,160,0.2)"; }}
                    onMouseLeave={e => { if (selectedCountry?.code !== c.code) e.currentTarget.style.backgroundColor = "transparent"; }}
                  >{c.label}</button>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ backgroundColor: "rgba(245,215,160,0.1)", border: "1px solid rgba(245,215,160,0.25)" }}>
          {([
            ["daily", "🔥 Trending Today"],
            ["compare", "📈 Compare Keywords"],
            ["related", "🔍 Related Queries"],
          ] as const).map(([t, label]) => (
            <button key={t} type="button" onClick={() => setTab(t)}
              className="px-5 py-2 text-sm font-semibold rounded-lg transition-all"
              style={tab === t ? { backgroundColor: A, color: "white" } : { color: "#78614E" }}>
              {label}
            </button>
          ))}
        </div>

        {/* ─── DAILY TRENDS ─── */}
        {tab === "daily" && (
          <div>
            {dailyLoading && (
              <div className="flex items-center justify-center h-40 rounded-xl" style={cardStyle}>
                <p className="text-sm" style={{ color: "#C4AA8A" }}>Loading trends...</p>
              </div>
            )}
            {dailyError && (
              <div className="rounded-xl p-5" style={cardStyle}>
                <p className="text-sm font-semibold" style={{ color: "#dc2626" }}>Error: {dailyError}</p>
              </div>
            )}
            {!dailyLoading && !dailyError && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {daily.map((trend, i) => (
                  <div key={i} className="rounded-xl p-4 space-y-2" style={cardStyle}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold w-5 text-center flex-shrink-0"
                          style={{ color: i < 3 ? A : "#C4AA8A" }}>{i + 1}</span>
                        <span className="text-sm font-bold" style={{ color: "#292524" }}>{trend.title}</span>
                      </div>
                      <span className="text-xs font-semibold flex-shrink-0 px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: "rgba(245,166,35,0.1)", color: A }}>
                        {trend.traffic}
                      </span>
                    </div>
                    {trend.relatedQueries?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {trend.relatedQueries.slice(0, 3).map((q: string, j: number) => (
                          <span key={j} className="text-xs px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: "rgba(245,215,160,0.15)", color: "#78614E" }}>{q}</span>
                        ))}
                      </div>
                    )}
                    {trend.articles?.map((a: any, j: number) => (
                      <a key={j} href={a.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 group">
                        {a.thumbnail && (
                          <img src={a.thumbnail} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-medium leading-tight line-clamp-2 group-hover:underline"
                            style={{ color: "#292524" }}>{a.title}</p>
                          <p className="text-xs mt-0.5" style={{ color: "#C4AA8A" }}>{a.source}</p>
                        </div>
                        <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-0 group-hover:opacity-100" style={{ color: A }} />
                      </a>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── COMPARE KEYWORDS ─── */}
        {tab === "compare" && (
          <div className="space-y-4">
            <div className="rounded-xl p-4 space-y-3" style={cardStyle}>
              <p className="text-xs font-semibold" style={{ color: "#A8967E" }}>Keywords (max 5)</p>
              <div className="flex flex-wrap gap-2">
                {keywords.map((kw, i) => (
                  <span key={kw} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold"
                    style={{ backgroundColor: COLORS[i] + "20", color: COLORS[i], border: `1px solid ${COLORS[i]}40` }}>
                    {kw}
                    <button type="button" onClick={() => setKeywords(prev => prev.filter(k => k !== kw))}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add keyword..."
                  value={kwInput}
                  onChange={e => setKwInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addKeyword()}
                  disabled={keywords.length >= 5}
                  className="flex-1 px-3 py-2 text-sm rounded-lg focus:outline-none"
                  style={{ border: "1px solid rgba(245,215,160,0.3)", backgroundColor: "#FFFCF7", color: "#292524" }}
                />
                <button type="button" onClick={addKeyword} disabled={keywords.length >= 5}
                  className="px-3 py-2 rounded-lg"
                  style={{ backgroundColor: "rgba(245,166,35,0.1)", color: A }}>
                  <Plus className="w-4 h-4" />
                </button>
                <button type="button" onClick={loadCompare} disabled={compareLoading || !keywords.length}
                  className="px-5 py-2 rounded-lg text-sm font-bold"
                  style={{ backgroundColor: A, color: "white" }}>
                  {compareLoading ? "..." : "Compare"}
                </button>
              </div>
            </div>

            {compareError && (
              <div className="rounded-xl p-4" style={cardStyle}>
                <p className="text-sm" style={{ color: "#dc2626" }}>Error: {compareError}</p>
              </div>
            )}

            {compareData && chartData.length > 0 && (
              <div className="rounded-xl p-5" style={cardStyle}>
                <p className="text-sm font-semibold mb-4" style={{ color: "#292524" }}>
                  Interest over time — last 90 days ({ALL_COUNTRIES.find(c => c.code === geo)?.label ?? geo})
                </p>
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(245,215,160,0.2)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#C4AA8A" }} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 10, fill: "#C4AA8A" }} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.3)", borderRadius: 8, fontSize: 12 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    {compareData.keywords.map((kw: string, i: number) => (
                      <Line key={kw} type="monotone" dataKey={kw} stroke={COLORS[i]} strokeWidth={2} dot={false} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {!compareData && !compareLoading && (
              <div className="rounded-xl p-12 text-center" style={cardStyle}>
                <BarChart2 className="w-10 h-10 mx-auto mb-3" style={{ color: "rgba(245,166,35,0.3)" }} />
                <p className="font-semibold" style={{ color: "#292524" }}>Compare up to 5 keywords</p>
                <p className="text-sm mt-1" style={{ color: "#A8967E" }}>Add keywords and press "Compare" to see interest over time</p>
              </div>
            )}
          </div>
        )}

        {/* ─── RELATED QUERIES ─── */}
        {tab === "related" && (
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: A }} />
                <input
                  type="text"
                  placeholder="Enter a keyword (ex: digital marketing, influencer...)"
                  value={relQuery}
                  onChange={e => setRelQuery(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && loadRelated()}
                  className="w-full pl-9 pr-4 py-3 text-sm rounded-xl focus:outline-none"
                  style={{ border: "1px solid rgba(245,166,35,0.3)", backgroundColor: "#FFFCF7", color: "#292524" }}
                />
              </div>
              <button type="button" onClick={loadRelated} disabled={relLoading || !relQuery.trim()}
                className="px-6 py-3 rounded-xl text-sm font-bold"
                style={{ backgroundColor: A, color: "white" }}>
                {relLoading ? "..." : "Search"}
              </button>
            </div>

            {relError && (
              <div className="rounded-xl p-4" style={cardStyle}>
                <p className="text-sm" style={{ color: "#dc2626" }}>Error: {relError}</p>
              </div>
            )}

            {relData && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Top Queries */}
                <div className="rounded-xl overflow-hidden" style={cardStyle}>
                  <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(245,215,160,0.2)" }}>
                    <h3 className="font-semibold" style={{ color: "#292524" }}>Top Queries</h3>
                    <p className="text-xs mt-0.5" style={{ color: "#A8967E" }}>Most frequent related searches</p>
                  </div>
                  <div className="divide-y" style={{ borderColor: "rgba(245,215,160,0.1)" }}>
                    {(!relData.top || relData.top.length === 0) && (
                      <p className="px-5 py-4 text-sm" style={{ color: "#C4AA8A" }}>No data — try another keyword.</p>
                    )}
                    {relData.top?.map((item: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 px-5 py-3">
                        <span className="text-xs font-bold w-5 text-center" style={{ color: i < 3 ? A : "#C4AA8A" }}>{i + 1}</span>
                        <span className="flex-1 text-sm" style={{ color: "#292524" }}>{item.query}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(245,166,35,0.15)" }}>
                            <div className="h-full rounded-full" style={{ width: `${item.value}%`, backgroundColor: A }} />
                          </div>
                          <span className="text-xs w-6 text-right" style={{ color: "#C4AA8A" }}>{item.value}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Rising Queries */}
                <div className="rounded-xl overflow-hidden" style={cardStyle}>
                  <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(245,215,160,0.2)" }}>
                    <h3 className="font-semibold" style={{ color: "#292524" }}>Rising Queries</h3>
                    <p className="text-xs mt-0.5" style={{ color: "#A8967E" }}>Rapidly growing searches — future opportunities</p>
                  </div>
                  <div className="divide-y" style={{ borderColor: "rgba(245,215,160,0.1)" }}>
                    {(!relData.rising || relData.rising.length === 0) && (
                      <p className="px-5 py-4 text-sm" style={{ color: "#C4AA8A" }}>No data — try another keyword.</p>
                    )}
                    {relData.rising?.map((item: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 px-5 py-3">
                        <span className="text-xs font-bold w-5 text-center" style={{ color: "#1DB954" }}>{i + 1}</span>
                        <span className="flex-1 text-sm" style={{ color: "#292524" }}>{item.query}</span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: "rgba(29,185,84,0.1)", color: "#1DB954" }}>
                          {item.formattedValue}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {!relData && !relLoading && (
              <div className="rounded-xl p-8" style={cardStyle}>
                <div className="text-center mb-6">
                  <TrendingUp className="w-10 h-10 mx-auto mb-3" style={{ color: "rgba(245,166,35,0.3)" }} />
                  <p className="font-semibold" style={{ color: "#292524" }}>Discover related queries</p>
                  <p className="text-sm mt-1" style={{ color: "#A8967E" }}>
                    Enter a brand, product or niche and find out what people search for related to it
                  </p>
                </div>
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-center" style={{ color: "#C4AA8A" }}>Example keywords</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {["marketing", "nike", "iphone", "vacation", "diet", "crypto", "influencer", "amazon"].map(kw => (
                      <button key={kw} type="button"
                        onClick={() => { setRelQuery(kw); setTimeout(loadRelated, 50); }}
                        className="px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
                        style={{ backgroundColor: "rgba(245,166,35,0.1)", color: A, border: `1px solid rgba(245,166,35,0.25)` }}>
                        {kw}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-center mt-2" style={{ color: "#C4AA8A" }}>
                    <strong>Top Queries</strong> = what people search for with your keyword<br/>
                    <strong>Rising Queries</strong> = rapidly growing searches = SEO / content opportunities
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
