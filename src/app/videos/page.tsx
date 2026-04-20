"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/layout/Header";
import PlatformBadge from "@/components/ui/PlatformBadge";
import MultiRegionalTrending from "@/components/ui/MultiRegionalTrending";
import { formatNumber, formatDate } from "@/lib/utils";
import { MessageCircle, ThumbsUp, Eye, Search, Loader2, TrendingUp, Globe, ChevronDown, LayoutGrid } from "lucide-react";
import type { YTVideo } from "@/lib/youtube";

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

const SORTS = [
  { label: "Most Views", value: "views" },
  { label: "Most Liked", value: "likes" },
  { label: "Most Comments", value: "comments" },
  { label: "Newest", value: "date" },
];

export default function VideosPage() {
  const searchParams = useSearchParams();
  const [videos, setVideos] = useState<YTVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [region, setRegion] = useState("US");
  const [isGlobal, setIsGlobal] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState<{ code: string; label: string } | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [sort, setSort] = useState("views");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [mode, setMode] = useState<"trending" | "search">("trending");
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

  const fetchTrending = useCallback(async (r: string) => {
    setLoading(true);
    setMode("trending");
    const res = await fetch(`/api/youtube/trending?region=${r}&max=12`);
    const data = await res.json();
    setVideos(data);
    setLoading(false);
  }, []);

  const fetchSearch = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setMode("search");
    setSearch(q);
    const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(q)}&max=12`);
    const data = await res.json();
    setVideos(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) {
      setSearchInput(q);
      fetchSearch(q);
    } else {
      fetchTrending(region);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { if (!searchParams.get("q")) fetchTrending(region); }, [region, fetchTrending, searchParams]);

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

  const currentLabel = isGlobal ? "🌍 Global" : (selectedCountry?.label ?? "🌍 Global");

  const sorted = [...videos].sort((a, b) => {
    if (sort === "views") return b.views - a.views;
    if (sort === "likes") return b.likes - a.likes;
    if (sort === "comments") return b.comments - a.comments;
    if (sort === "date") return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    return 0;
  });

  const engagementRate = (v: YTVideo) =>
    v.views > 0 ? (((v.likes + v.comments) / v.views) * 100).toFixed(1) : "0.0";

  return (
    <div>
      <Header title="Top Videos" subtitle="Real YouTube data — updated every hour" />

      <div className="p-6 space-y-5">
        {/* Search Bar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#C4AA8A" }} />
            <input
              type="text"
              placeholder="Search YouTube videos (e.g.: football, gaming, music...)"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchSearch(searchInput)}
              className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg focus:outline-none"
              style={{ border: "1px solid rgba(245,215,160,0.35)", backgroundColor: "var(--color-bg-secondary)", color: "var(--color-text)" }}
            />
          </div>
          <button
            onClick={() => fetchSearch(searchInput)}
            className="px-4 py-2.5 text-sm font-semibold rounded-lg transition-colors"
            style={{ backgroundColor: "var(--color-primary)", color: "#1C1814" }}
            type="button"
          >
            Search
          </button>
          {mode === "search" && (
            <button
              type="button"
              onClick={() => { setSearchInput(""); fetchTrending(region); }}
              className="px-4 py-2.5 text-sm font-semibold rounded-lg btn-pill"
            >
              Trending
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">

          {/* Global Button */}
          <button
            type="button"
            onClick={handleGlobal}
            disabled={mode === "search"}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg transition-all ${isGlobal && mode !== "search" ? "btn-3d-active" : "btn-3d"}`}
            style={mode === "search" ? { opacity: 0.5 } : undefined}
          >
            <Globe className="w-4 h-4" />
            Global
          </button>

          {/* International Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => mode !== "search" && setDropdownOpen(prev => !prev)}
              disabled={mode === "search"}
              className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-all ${!isGlobal && mode !== "search" ? "btn-3d-active" : "btn-3d"}`}
              style={mode === "search" ? { opacity: 0.5 } : undefined}
            >
              {!isGlobal ? selectedCountry?.label : "🗺️ International"}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {dropdownOpen && (
              <div
                className="absolute top-full left-0 mt-1 z-50 rounded-xl overflow-hidden overflow-y-auto"
                style={{
                  backgroundColor: "var(--color-bg-secondary)",
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
                    className="w-full text-left px-4 py-2.5 text-sm transition-colors"
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

          {/* Sort */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg focus:outline-none btn-3d"
            title="Sort by"
            aria-label="Sort by"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>

          <div className="ml-auto flex items-center gap-2">
            {mode === "trending" && (
              <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: "rgba(245,158,11,0.12)", color: "var(--color-primary-hover)" }}>
                <TrendingUp className="w-3 h-3" /> Trending {currentLabel}
              </span>
            )}
            {mode === "search" && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: "rgba(245,158,11,0.12)", color: "var(--color-primary-hover)" }}>
                Results for: &quot;{search}&quot;
              </span>
            )}
            <span className="text-sm" style={{ color: "#C4AA8A" }}>{sorted.length} videos</span>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--color-primary)" }} />
            <span className="ml-3" style={{ color: "#A8967E" }}>Loading YouTube data...</span>
          </div>
        )}

        {/* Video Grid */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {sorted.map((v, i) => (
              <a
                key={v.id}
                href={`https://youtube.com/watch?v=${v.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl overflow-hidden group block transition-shadow hover:shadow-md"
                style={{ backgroundColor: "var(--color-bg-secondary)", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" }}
              >
                {/* Thumbnail */}
                <div className="relative h-44 overflow-hidden" style={{ backgroundColor: "#EDE0C8" }}>
                  <img
                    src={v.thumbnail}
                    alt={v.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded font-bold">
                    #{i + 1}
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <PlatformBadge platform="youtube" />
                  </div>
                  <h3 className="font-semibold text-sm leading-tight line-clamp-2 mb-1" style={{ color: "var(--color-text)" }}>
                    {v.title}
                  </h3>
                  <p className="text-xs mb-3" style={{ color: "#C4AA8A" }}>{v.channel} · {formatDate(v.publishedAt)}</p>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-1 pt-3" style={{ borderTop: "1px solid rgba(245,215,160,0.2)" }}>
                    <div className="flex flex-col items-center gap-0.5">
                      <Eye className="w-3.5 h-3.5" style={{ color: "#C4AA8A" }} />
                      <span className="text-xs font-semibold" style={{ color: "#5C4A35" }}>{formatNumber(v.views)}</span>
                    </div>
                    <div className="flex flex-col items-center gap-0.5">
                      <ThumbsUp className="w-3.5 h-3.5" style={{ color: "#C4AA8A" }} />
                      <span className="text-xs font-semibold" style={{ color: "#5C4A35" }}>{formatNumber(v.likes)}</span>
                    </div>
                    <div className="flex flex-col items-center gap-0.5">
                      <MessageCircle className="w-3.5 h-3.5" style={{ color: "#C4AA8A" }} />
                      <span className="text-xs font-semibold" style={{ color: "#5C4A35" }}>{formatNumber(v.comments)}</span>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs" style={{ color: "#A8967E" }}>Engagement Rate</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(245,158,11,0.12)", color: "var(--color-primary-hover)" }}>
                      {engagementRate(v)}%
                    </span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}

        {!loading && sorted.length === 0 && (
          <div className="text-center py-16" style={{ color: "#C4AA8A" }}>
            <p>No results found.</p>
          </div>
        )}
      </div>

      {/* Multi-Regional Trending Section */}
      <div className="px-6 pb-8 space-y-3">
        <div className="flex items-center gap-2 pt-2">
          <LayoutGrid className="w-4 h-4" style={{ color: "var(--color-primary)" }} />
          <h2 className="font-bold text-sm" style={{ color: "var(--color-text)" }}>Compare Trends Across Regions</h2>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: "rgba(245,158,11,0.1)", color: "var(--color-primary-hover)" }}>
            RO · US · GB · DE
          </span>
        </div>
        <div
          className="rounded-xl p-4"
          style={{ backgroundColor: "var(--color-bg-secondary)", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" }}
        >
          <MultiRegionalTrending />
        </div>
      </div>
    </div>
  );
}
