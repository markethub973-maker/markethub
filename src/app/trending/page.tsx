"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/layout/Header";
import PlatformBadge from "@/components/ui/PlatformBadge";
import MultiRegionalTrending from "@/components/ui/MultiRegionalTrending";
import ExportButtons from "@/components/ui/ExportButtons";
import { formatNumber, formatDate, exportCSV, exportJSON } from "@/lib/utils";
import { TrendingUp, Flame, Globe, ChevronDown, ChevronUp, Clock, Search, Download, ThumbsUp, MessageCircle } from "lucide-react";

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

type Tab = "recent" | "popular" | "search";

export default function TrendingPage() {
  const searchParams = useSearchParams();
  const [region, setRegion] = useState("US");
  const [isGlobal, setIsGlobal] = useState(true);
  const [ytVideos, setYtVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<{ code: string; label: string } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Table state
  const [tab, setTab] = useState<Tab>("recent");
  const [sortKey, setSortKey] = useState<string>("publishedAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [searchInput, setSearchInput] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // When searchQ changes, fetch real YouTube search results
  useEffect(() => {
    if (!searchQ.trim()) { setSearchResults([]); return; }
    setSearchLoading(true);
    fetch(`/api/youtube/search?q=${encodeURIComponent(searchQ.trim())}&max=12`)
      .then(r => r.json())
      .then(d => setSearchResults(Array.isArray(d) ? d : []))
      .catch(() => setSearchResults([]))
      .finally(() => setSearchLoading(false));
  }, [searchQ]);

  // Handle ?q= from header search
  useEffect(() => {
    const q = searchParams.get("q");
    if (q) {
      setTab("search");
      setSearchInput(q);
      setSearchQ(q);
    }
  }, [searchParams]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/youtube/trending?region=${region}&max=12`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setYtVideos(d); else setYtVideos([]); })
      .finally(() => setLoading(false));
  }, [region]);

  const handleGlobal = () => {
    setIsGlobal(true);
    setSelectedCountry(null);
    setRegion("US");
    setDropdownOpen(false);
  };

  const handleSelectCountry = (country: { code: string; label: string }) => {
    setSelectedCountry(country);
    setIsGlobal(false);
    setRegion(country.code);
    setDropdownOpen(false);
  };

  const switchTab = (t: Tab) => {
    setTab(t);
    if (t === "recent") { setSortKey("publishedAt"); setSortDir("desc"); }
    else if (t === "popular") { setSortKey("views"); setSortDir("desc"); }
    else { setSortKey("publishedAt"); setSortDir("desc"); setSearchQ(""); setSearchInput(""); }
  };

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sortKey !== col) return <ChevronUp className="w-3 h-3 opacity-20" />;
    return sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  };

  const top3 = ytVideos.slice(0, 3);
  const currentLabel = isGlobal ? "🌍 Global" : (selectedCountry?.label ?? "🌍 Global");

  // In Search tab → use real YouTube search results; otherwise use trending
  const baseVideos = tab === "search" ? searchResults : ytVideos;
  const processedVideos = baseVideos
    .map(v => ({ ...v, _er: v.views > 0 ? ((v.likes + v.comments) / v.views) * 100 : 0 }))
    .sort((a, b) => {
      const val = (x: any) => sortKey === "er" ? x._er : sortKey === "publishedAt" ? new Date(x.publishedAt).getTime() : x[sortKey];
      return sortDir === "asc" ? val(a) - val(b) : val(b) - val(a);
    });

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "recent", label: "Recent", icon: <Clock className="w-3.5 h-3.5" /> },
    { key: "popular", label: "Most Viewed", icon: <Flame className="w-3.5 h-3.5" /> },
    { key: "search", label: "Search", icon: <Search className="w-3.5 h-3.5" /> },
  ];

  return (
    <div>
      <Header title="Trending Discovery" subtitle="Most watched videos in real-time, by region" />

      <div className="p-6 space-y-6">

        {/* Region Selector */}
        <div className="flex items-center gap-3">
          <Globe className="w-4 h-4" style={{ color: "#A8967E" }} />
          <div className="flex items-center gap-2">

            {/* Global Button */}
            <button
              type="button"
              onClick={handleGlobal}
              className="px-4 py-2 text-sm font-medium rounded-lg transition-all"
              style={isGlobal
                ? { backgroundColor: "#FF0000", color: "white", border: "1px solid #FF0000" }
                : { backgroundColor: "#FFFCF7", color: "#78614E", border: "1px solid rgba(245,215,160,0.35)" }
              }
            >
              🌍 Global
            </button>

            {/* International Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen(prev => !prev)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all"
                style={!isGlobal
                  ? { backgroundColor: "#FF0000", color: "white", border: "1px solid #FF0000" }
                  : { backgroundColor: "#FFFCF7", color: "#78614E", border: "1px solid rgba(245,215,160,0.35)" }
                }
              >
                {!isGlobal ? selectedCountry?.label : "🗺️ International"}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {dropdownOpen && (
                <div
                  className="absolute top-full left-0 mt-1 z-50 rounded-xl overflow-hidden overflow-y-auto"
                  style={{
                    backgroundColor: "#FFFCF7",
                    border: "1px solid rgba(245,215,160,0.4)",
                    boxShadow: "0 8px 24px rgba(120,97,78,0.15)",
                    maxHeight: "300px",
                    minWidth: "200px",
                  }}
                >
                  {ALL_COUNTRIES.map(c => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => handleSelectCountry(c)}
                      className="w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2"
                      style={{
                        color: selectedCountry?.code === c.code ? "#FF0000" : "#5C4A35",
                        backgroundColor: selectedCountry?.code === c.code ? "rgba(255,0,0,0.06)" : "transparent",
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
        </div>

        {/* Hot Topics — Top 3 real videos */}
        {!loading && top3.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {top3.map((v, i) => {
              const er = v.views > 0 ? Math.round(((v.likes + v.comments) / v.views) * 10000) / 100 : 0;
              return (
                <a
                  key={v.id}
                  href={`https://www.youtube.com/watch?v=${v.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl p-5 block hover:opacity-90 transition-opacity"
                  style={i === 0
                    ? { background: "linear-gradient(135deg, #FF0000, #cc0000)", color: "white", boxShadow: "0 4px 12px rgba(255,0,0,0.25)" }
                    : { backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" }
                  }
                >
                  <div className="flex items-center gap-2 mb-3">
                    {i === 0 ? (
                      <Flame className="w-5 h-5" style={{ color: "rgba(255,255,255,0.9)" }} />
                    ) : (
                      <TrendingUp className="w-4 h-4" style={{ color: "#C4AA8A" }} />
                    )}
                    <span className="text-xs font-semibold" style={{ color: i === 0 ? "rgba(255,255,255,0.8)" : "#A8967E" }}>
                      #{i + 1} Trending {currentLabel}
                    </span>
                    <div className="ml-auto">
                      <PlatformBadge platform="youtube" />
                    </div>
                  </div>
                  <div className="mb-3">
                    <img src={v.thumbnail} alt="" className="w-full rounded-lg object-cover" style={{ aspectRatio: "16/9" }} />
                  </div>
                  <h3 className="text-sm font-bold leading-tight line-clamp-2 mb-1" style={{ color: i === 0 ? "white" : "#292524" }}>
                    {v.title}
                  </h3>
                  <p className="text-xs mb-3" style={{ color: i === 0 ? "rgba(255,255,255,0.7)" : "#A8967E" }}>
                    {v.channel}
                  </p>
                  <div className="flex justify-between text-sm" style={{ borderTop: i === 0 ? "1px solid rgba(255,255,255,0.2)" : "1px solid rgba(245,215,160,0.2)", paddingTop: "12px" }}>
                    <div>
                      <p className="text-xs" style={{ color: i === 0 ? "rgba(255,255,255,0.6)" : "#C4AA8A" }}>Views</p>
                      <p className="font-bold" style={{ color: i === 0 ? "white" : "#292524" }}>{formatNumber(v.views)}</p>
                    </div>
                    <div>
                      <p className="text-xs" style={{ color: i === 0 ? "rgba(255,255,255,0.6)" : "#C4AA8A" }}>Likes</p>
                      <p className="font-bold" style={{ color: i === 0 ? "white" : "#292524" }}>{formatNumber(v.likes)}</p>
                    </div>
                    <div>
                      <p className="text-xs" style={{ color: i === 0 ? "rgba(255,255,255,0.6)" : "#C4AA8A" }}>ER</p>
                      <p className="font-bold" style={{ color: i === 0 ? "rgba(255,255,200,1)" : "#16a34a" }}>
                        {er}%
                      </p>
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        )}

        {/* Videos Table with Tabs */}
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" }}>

          {/* Tab Bar */}
          <div className="flex items-center gap-1 px-4 pt-4 pb-0" style={{ borderBottom: "1px solid rgba(245,215,160,0.2)" }}>
            {tabs.map(t => (
              <button key={t.key} type="button" onClick={() => switchTab(t.key)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors"
                style={tab === t.key
                  ? { backgroundColor: "#FFFCF7", color: "#FF0000", borderBottom: "2px solid #FF0000" }
                  : { color: "#A8967E" }}>
                {t.icon}{t.label}
              </button>
            ))}
            {processedVideos.length > 0 && (
              <div className="ml-auto flex items-center gap-1 pr-2 pb-1">
                <button type="button" onClick={() => exportCSV(
                  `trending-${region}`,
                  ["#", "Title", "Channel", "Views", "Likes", "Comments", "ER%", "Published", "URL"],
                  processedVideos.map((v, i) => [i + 1, v.title, v.channel, v.views, v.likes, v.comments, v._er?.toFixed(2), v.publishedAt, `https://youtube.com/watch?v=${v.id}`])
                )} className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-semibold"
                  style={{ backgroundColor: "rgba(255,0,0,0.08)", color: "#FF0000" }}>
                  <Download className="w-3 h-3" />CSV
                </button>
                <button type="button" onClick={() => exportJSON(`trending-${region}`, { region, exportedAt: new Date().toISOString(), videos: processedVideos })}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-semibold"
                  style={{ backgroundColor: "rgba(255,0,0,0.08)", color: "#FF0000" }}>
                  <Download className="w-3 h-3" />JSON
                </button>
              </div>
            )}
          </div>

          {/* Search input */}
          {tab === "search" && (
            <div className="px-5 py-3 flex gap-2" style={{ borderBottom: "1px solid rgba(245,215,160,0.15)" }}>
              <input
                type="text"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && setSearchQ(searchInput)}
                placeholder="Search by title or channel..."
                className="flex-1 px-3 py-2 text-sm rounded-lg focus:outline-none"
                style={{ border: "1px solid rgba(245,215,160,0.35)", backgroundColor: "#FFF8F0", color: "#292524" }}
              />
              <button type="button" onClick={() => setSearchQ(searchInput)}
                className="px-4 py-2 rounded-lg text-sm font-bold"
                style={{ backgroundColor: "#FF0000", color: "white" }}>
                Search
              </button>
            </div>
          )}

          {(loading && tab !== "search") || searchLoading ? (
            <div className="py-12 text-center text-sm" style={{ color: "#C4AA8A" }}>
              {searchLoading ? `Searching for "${searchQ}"...` : "Loading..."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide" style={{ backgroundColor: "rgba(245,215,160,0.1)", color: "#A8967E" }}>
                    <th className="text-left px-5 py-3">#</th>
                    <th className="text-left px-3 py-3">Video / Channel</th>
                    <th className="text-left px-3 py-3">Platform</th>
                    {[
                      { key: "views", label: "Views" },
                      { key: "likes", label: "Likes" },
                      { key: "comments", label: "Comments" },
                      { key: "er", label: "ER" },
                    ].map(col => (
                      <th key={col.key} className="text-right px-3 py-3 cursor-pointer select-none" onClick={() => handleSort(col.key)}>
                        <div className="flex items-center justify-end gap-1">{col.label}<SortIcon col={col.key} /></div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {processedVideos.length === 0 ? (
                    <tr><td colSpan={7} className="px-5 py-8 text-center text-xs" style={{ color: "#C4AA8A" }}>No results</td></tr>
                  ) : processedVideos.map((v, i) => {
                    const er = v._er.toFixed(2);
                    return (
                      <tr key={v.id} className="transition-colors" style={{ borderTop: "1px solid rgba(245,215,160,0.15)" }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(245,215,160,0.07)")}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
                      >
                        <td className="px-5 py-3">
                          <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: i < 3 ? "rgba(255,0,0,0.1)" : "rgba(245,215,160,0.2)", color: i < 3 ? "#cc0000" : "#78614E" }}>
                            {i + 1}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <a href={`https://www.youtube.com/watch?v=${v.id}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 group">
                            <img src={v.thumbnail} alt="" className="w-16 h-9 rounded object-cover flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs font-semibold truncate max-w-[200px] group-hover:underline" style={{ color: "#3D2E1E" }}>{v.title}</p>
                              <p className="text-xs" style={{ color: "#C4AA8A" }}>{v.channel}</p>
                            </div>
                          </a>
                        </td>
                        <td className="px-3 py-3"><PlatformBadge platform="youtube" /></td>
                        <td className="px-3 py-3 text-right font-medium text-xs" style={{ color: "#5C4A35" }}>
                          {formatNumber(v.views)}
                        </td>
                        <td className="px-3 py-3 text-right text-xs" style={{ color: "#A8967E" }}>
                          <div className="flex items-center justify-end gap-1"><ThumbsUp className="w-3 h-3" />{formatNumber(v.likes)}</div>
                        </td>
                        <td className="px-3 py-3 text-right text-xs" style={{ color: "#A8967E" }}>
                          <div className="flex items-center justify-end gap-1"><MessageCircle className="w-3 h-3" />{formatNumber(v.comments)}</div>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <span className="text-xs font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: "rgba(245,158,11,0.12)", color: "#D97706" }}>
                            {er}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!loading && !searchLoading && tab !== "search" && ytVideos.length === 0 && (
            <div className="text-center py-12 text-sm" style={{ color: "#C4AA8A" }}>
              No trending videos found for this region.
            </div>
          )}
          {!searchLoading && tab === "search" && searchQ && searchResults.length === 0 && (
            <div className="text-center py-12 text-sm" style={{ color: "#C4AA8A" }}>
              No results found for &quot;{searchQ}&quot;.
            </div>
          )}
          {tab === "search" && !searchQ && (
            <div className="text-center py-12 text-sm" style={{ color: "#C4AA8A" }}>
              Type a name or keyword and press Search.
            </div>
          )}
        </div>

        {/* Multi-Regional Trending */}
        <MultiRegionalTrending />

        {/* Export */}
        {processedVideos.length > 0 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#C4AA8A]">{processedVideos.length} videos loaded</p>
            <ExportButtons
              filename={`trending-youtube-${region}`}
              sheets={[{
                name: "Trending Videos",
                headers: ["Title", "Channel", "Views", "Likes", "Comments", "Published"],
                rows: processedVideos.map(v => [v.title, v.channel, v.views, v.likes, v.comments, v.publishedAt]),
              }]}
            />
          </div>
        )}

      </div>
    </div>
  );
}
