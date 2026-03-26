"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/layout/Header";
import PlatformBadge from "@/components/ui/PlatformBadge";
import ChannelAnalyticsModal from "@/components/ui/ChannelAnalyticsModal";
import CompareModal from "@/components/ui/CompareModal";
import type { Channel } from "@/lib/mockData";
import { formatNumber } from "@/lib/utils";
import { Users, TrendingUp, PlayCircle, Eye, Search, Download, ArrowLeftRight, Globe, ChevronDown } from "lucide-react";

function exportCSV(channels: Channel[]) {
  const headers = ["Name", "Platform", "Category", "Subscribers", "Total Views", "Avg Views", "Engagement %", "Videos"];
  const rows = channels.map(c => [
    c.name, c.platform, c.category,
    c.subscribers, c.totalViews, c.avgViews,
    c.engagementRate, c.videoCount,
  ]);
  const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "markethub-channels.csv";
  a.click();
  URL.revokeObjectURL(url);
}

const ALL_COUNTRIES = [
  { code: "AF", label: "🇦🇫 Afghanistan" }, { code: "AL", label: "🇦🇱 Albania" },
  { code: "DZ", label: "🇩🇿 Algeria" }, { code: "AR", label: "🇦🇷 Argentina" },
  { code: "AM", label: "🇦🇲 Armenia" }, { code: "AU", label: "🇦🇺 Australia" },
  { code: "AT", label: "🇦🇹 Austria" }, { code: "AZ", label: "🇦🇿 Azerbaijan" },
  { code: "BH", label: "🇧🇭 Bahrain" }, { code: "BD", label: "🇧🇩 Bangladesh" },
  { code: "BY", label: "🇧🇾 Belarus" }, { code: "BE", label: "🇧🇪 Belgium" },
  { code: "BO", label: "🇧🇴 Bolivia" }, { code: "BA", label: "🇧🇦 Bosnia & Herzegovina" },
  { code: "BW", label: "🇧🇼 Botswana" }, { code: "BR", label: "🇧🇷 Brazil" },
  { code: "BG", label: "🇧🇬 Bulgaria" }, { code: "KH", label: "🇰🇭 Cambodia" },
  { code: "CM", label: "🇨🇲 Cameroon" }, { code: "CA", label: "🇨🇦 Canada" },
  { code: "CL", label: "🇨🇱 Chile" }, { code: "CN", label: "🇨🇳 China" },
  { code: "CO", label: "🇨🇴 Colombia" }, { code: "CR", label: "🇨🇷 Costa Rica" },
  { code: "HR", label: "🇭🇷 Croatia" }, { code: "CY", label: "🇨🇾 Cyprus" },
  { code: "CZ", label: "🇨🇿 Czech Republic" }, { code: "DK", label: "🇩🇰 Denmark" },
  { code: "DO", label: "🇩🇴 Dominican Republic" }, { code: "EC", label: "🇪🇨 Ecuador" },
  { code: "EG", label: "🇪🇬 Egypt" }, { code: "SV", label: "🇸🇻 El Salvador" },
  { code: "EE", label: "🇪🇪 Estonia" }, { code: "ET", label: "🇪🇹 Ethiopia" },
  { code: "FI", label: "🇫🇮 Finland" }, { code: "FR", label: "🇫🇷 France" },
  { code: "GE", label: "🇬🇪 Georgia" }, { code: "DE", label: "🇩🇪 Germany" },
  { code: "GH", label: "🇬🇭 Ghana" }, { code: "GR", label: "🇬🇷 Greece" },
  { code: "GT", label: "🇬🇹 Guatemala" }, { code: "HN", label: "🇭🇳 Honduras" },
  { code: "HK", label: "🇭🇰 Hong Kong" }, { code: "HU", label: "🇭🇺 Hungary" },
  { code: "IS", label: "🇮🇸 Iceland" }, { code: "IN", label: "🇮🇳 India" },
  { code: "ID", label: "🇮🇩 Indonesia" }, { code: "IQ", label: "🇮🇶 Iraq" },
  { code: "IE", label: "🇮🇪 Ireland" }, { code: "IL", label: "🇮🇱 Israel" },
  { code: "IT", label: "🇮🇹 Italy" }, { code: "JP", label: "🇯🇵 Japan" },
  { code: "JO", label: "🇯🇴 Jordan" }, { code: "KZ", label: "🇰🇿 Kazakhstan" },
  { code: "KE", label: "🇰🇪 Kenya" }, { code: "KW", label: "🇰🇼 Kuwait" },
  { code: "LV", label: "🇱🇻 Latvia" }, { code: "LB", label: "🇱🇧 Lebanon" },
  { code: "LT", label: "🇱🇹 Lithuania" }, { code: "LU", label: "🇱🇺 Luxembourg" },
  { code: "MY", label: "🇲🇾 Malaysia" }, { code: "MT", label: "🇲🇹 Malta" },
  { code: "MX", label: "🇲🇽 Mexico" }, { code: "MD", label: "🇲🇩 Moldova" },
  { code: "MN", label: "🇲🇳 Mongolia" }, { code: "ME", label: "🇲🇪 Montenegro" },
  { code: "MA", label: "🇲🇦 Morocco" }, { code: "MM", label: "🇲🇲 Myanmar" },
  { code: "NP", label: "🇳🇵 Nepal" }, { code: "NL", label: "🇳🇱 Netherlands" },
  { code: "NZ", label: "🇳🇿 New Zealand" }, { code: "NI", label: "🇳🇮 Nicaragua" },
  { code: "NG", label: "🇳🇬 Nigeria" }, { code: "MK", label: "🇲🇰 North Macedonia" },
  { code: "NO", label: "🇳🇴 Norway" }, { code: "OM", label: "🇴🇲 Oman" },
  { code: "PK", label: "🇵🇰 Pakistan" }, { code: "PA", label: "🇵🇦 Panama" },
  { code: "PY", label: "🇵🇾 Paraguay" }, { code: "PE", label: "🇵🇪 Peru" },
  { code: "PH", label: "🇵🇭 Philippines" }, { code: "PL", label: "🇵🇱 Poland" },
  { code: "PT", label: "🇵🇹 Portugal" }, { code: "QA", label: "🇶🇦 Qatar" },
  { code: "RO", label: "🇷🇴 Romania" }, { code: "RU", label: "🇷🇺 Russia" },
  { code: "SA", label: "🇸🇦 Saudi Arabia" }, { code: "SN", label: "🇸🇳 Senegal" },
  { code: "RS", label: "🇷🇸 Serbia" }, { code: "SG", label: "🇸🇬 Singapore" },
  { code: "SK", label: "🇸🇰 Slovakia" }, { code: "SI", label: "🇸🇮 Slovenia" },
  { code: "ZA", label: "🇿🇦 South Africa" }, { code: "ES", label: "🇪🇸 Spain" },
  { code: "LK", label: "🇱🇰 Sri Lanka" }, { code: "SE", label: "🇸🇪 Sweden" },
  { code: "CH", label: "🇨🇭 Switzerland" }, { code: "TW", label: "🇹🇼 Taiwan" },
  { code: "TZ", label: "🇹🇿 Tanzania" }, { code: "TH", label: "🇹🇭 Thailand" },
  { code: "TN", label: "🇹🇳 Tunisia" }, { code: "TR", label: "🇹🇷 Turkey" },
  { code: "UG", label: "🇺🇬 Uganda" }, { code: "UA", label: "🇺🇦 Ukraine" },
  { code: "AE", label: "🇦🇪 UAE" }, { code: "GB", label: "🇬🇧 United Kingdom" },
  { code: "US", label: "🇺🇸 United States" }, { code: "UY", label: "🇺🇾 Uruguay" },
  { code: "UZ", label: "🇺🇿 Uzbekistan" }, { code: "VE", label: "🇻🇪 Venezuela" },
  { code: "VN", label: "🇻🇳 Vietnam" }, { code: "YE", label: "🇾🇪 Yemen" },
  { code: "ZM", label: "🇿🇲 Zambia" }, { code: "ZW", label: "🇿🇼 Zimbabwe" },
];

export default function ChannelsPage() {
  const searchParams = useSearchParams();
  const [sort, setSort] = useState("subscribers");
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("US");
  const [isGlobal, setIsGlobal] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState<{ code: string; label: string } | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyticsChannel, setAnalyticsChannel] = useState<Channel | null>(null);
  const [compareList, setCompareList] = useState<Channel[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [ytResults, setYtResults] = useState<any[]>([]);
  const [ytLoading, setYtLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Handle ?q= from header search
  useEffect(() => {
    const q = searchParams.get("q");
    if (q) setSearch(q);
  }, [searchParams]);

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

  const currentLabel = isGlobal ? "🌍 Global" : (selectedCountry?.label ?? "🌍 Global");

  // Load real channels from YouTube trending
  useEffect(() => {
    setLoading(true);
    fetch(`/api/youtube/top-channels?region=${region}`)
      .then(r => r.json())
      .then(d => setChannels(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, [region]);

  // YouTube channel search
  useEffect(() => {
    if (search.trim().length < 2) { setYtResults([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setYtLoading(true);
      fetch(`/api/youtube/channel-search?q=${encodeURIComponent(search)}&max=8`)
        .then(r => r.json())
        .then(d => setYtResults(Array.isArray(d) ? d : []))
        .finally(() => setYtLoading(false));
    }, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  const filtered = [...channels].sort((a, b) => {
    if (sort === "subscribers") return b.subscribers - a.subscribers;
    if (sort === "views") return b.totalViews - a.totalViews;
    if (sort === "er") return b.engagementRate - a.engagementRate;
    return 0;
  });

  const toggleCompare = (ch: Channel) => {
    if (compareList.find(c => c.id === ch.id)) {
      setCompareList(compareList.filter(c => c.id !== ch.id));
    } else if (compareList.length < 2) {
      setCompareList([...compareList, ch]);
    }
  };

  return (
    <div>
      <Header title="Channels" subtitle="Top YouTube channels from trending — real data" />

      {analyticsChannel && (
        <ChannelAnalyticsModal channel={analyticsChannel} onClose={() => setAnalyticsChannel(null)} />
      )}
      {showCompare && compareList.length === 2 && (
        <CompareModal channels={compareList} onClose={() => { setShowCompare(false); setCompareList([]); }} />
      )}

      <div className="p-6 space-y-5">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#C4AA8A" }} />
          <input
            type="text"
            placeholder="Search any YouTube channel (ex: MrBeast, PewDiePie...)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg focus:outline-none"
            style={{ border: "1px solid rgba(245,215,160,0.35)", backgroundColor: "#FFFCF7", color: "#292524" }}
          />
        </div>

        {/* YouTube Search Results */}
        {search.trim().length >= 2 && (
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" }}>
            <div className="px-5 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid rgba(245,215,160,0.15)" }}>
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="#FF0000"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
              <span className="text-xs font-semibold" style={{ color: "#292524" }}>Results for "{search}"</span>
              {ytLoading && <span className="text-xs ml-auto" style={{ color: "#C4AA8A" }}>Searching...</span>}
            </div>
            <div className="divide-y" style={{ borderColor: "rgba(245,215,160,0.1)" }}>
              {ytResults.length === 0 && !ytLoading ? (
                <p className="px-5 py-4 text-xs" style={{ color: "#C4AA8A" }}>No channels found.</p>
              ) : ytResults.map((ch: any) => (
                <div key={ch.id} className="flex items-center gap-4 px-5 py-3">
                  {ch.thumbnail && <img src={ch.thumbnail} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: "#292524" }}>{ch.name}</p>
                    <p className="text-xs truncate" style={{ color: "#A8967E" }}>{ch.description}</p>
                  </div>
                  <div className="text-right flex-shrink-0 space-y-0.5">
                    <p className="text-xs font-bold" style={{ color: "#292524" }}>{formatNumber(ch.subscribers)} sub</p>
                    <p className="text-xs" style={{ color: "#C4AA8A" }}>{formatNumber(ch.videoCount)} videos</p>
                  </div>
                  <a href={ch.permalink} target="_blank" rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: "#FF0000", color: "white" }}>
                    View →
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Region + Sort + Actions */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Global Button */}
          <button type="button" onClick={handleGlobal}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-all"
            style={isGlobal ? { backgroundColor: "#F59E0B", color: "#1C1814", border: "1px solid #F59E0B" } : { backgroundColor: "#FFFCF7", color: "#78614E", border: "1px solid rgba(245,215,160,0.35)" }}
          >
            <Globe className="w-3 h-3" /> Global
          </button>

          {/* International Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button type="button" onClick={() => setDropdownOpen(prev => !prev)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-all"
              style={!isGlobal ? { backgroundColor: "#F59E0B", color: "#1C1814", border: "1px solid #F59E0B" } : { backgroundColor: "#FFFCF7", color: "#78614E", border: "1px solid rgba(245,215,160,0.35)" }}
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
                    style={{ color: selectedCountry?.code === c.code ? "#D97706" : "#5C4A35", backgroundColor: selectedCountry?.code === c.code ? "rgba(245,158,11,0.08)" : "transparent", fontWeight: selectedCountry?.code === c.code ? "600" : "400" }}
                    onMouseEnter={e => { if (selectedCountry?.code !== c.code) e.currentTarget.style.backgroundColor = "rgba(245,215,160,0.2)"; }}
                    onMouseLeave={e => { if (selectedCountry?.code !== c.code) e.currentTarget.style.backgroundColor = "transparent"; }}
                  >{c.label}</button>
                ))}
              </div>
            )}
          </div>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            title="Sort channels"
            aria-label="Sort channels"
            className="px-3 py-2 text-sm rounded-lg focus:outline-none"
            style={{ border: "1px solid rgba(245,215,160,0.35)", backgroundColor: "#FFFCF7", color: "#5C4A35" }}
          >
            <option value="subscribers">Most Subscribers</option>
            <option value="views">Most Views</option>
            <option value="er">Highest ER</option>
          </select>

          <div className="ml-auto flex items-center gap-2">
            {compareList.length > 0 && (
              <button
                type="button"
                onClick={() => compareList.length === 2 ? setShowCompare(true) : null}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-colors"
                style={compareList.length === 2
                  ? { backgroundColor: "#F59E0B", color: "#1C1814" }
                  : { backgroundColor: "rgba(245,158,11,0.12)", color: "#D97706", border: "1px solid rgba(245,158,11,0.25)" }}
              >
                <ArrowLeftRight className="w-4 h-4" />
                {compareList.length === 2 ? "Compare now!" : `Selected ${compareList.length}/2`}
              </button>
            )}
            <button
              type="button"
              onClick={() => exportCSV(filtered)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold"
              style={{ backgroundColor: "rgba(245,215,160,0.15)", color: "#78614E", border: "1px solid rgba(245,215,160,0.35)" }}
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {compareList.length === 1 && (
          <p className="text-xs" style={{ color: "#F59E0B" }}>
            ✓ <b>{compareList[0].name}</b> selected — choose another channel to compare
          </p>
        )}

        {/* Channels Grid */}
        {loading ? (
          <div className="py-12 text-center text-sm" style={{ color: "#C4AA8A" }}>Loading...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((ch, i) => {
              const isSelected = compareList.some(c => c.id === ch.id);
              return (
                <div key={ch.id} className="rounded-xl p-5 transition-shadow hover:shadow-md"
                  style={{
                    backgroundColor: "#FFFCF7",
                    border: isSelected ? "2px solid #F59E0B" : "1px solid rgba(245,215,160,0.25)",
                    boxShadow: "0 1px 3px rgba(120,97,78,0.08)"
                  }}
                >
                  <div className="flex items-start gap-4">
                    <div className="relative">
                      {ch.avatar ? (
                        <img src={ch.avatar} alt={ch.name} className="w-14 h-14 rounded-full object-cover" style={{ border: "2px solid rgba(245,215,160,0.4)" }} />
                      ) : (
                        <div className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold" style={{ backgroundColor: "rgba(245,215,160,0.2)", color: "#78614E", border: "2px solid rgba(245,215,160,0.4)" }}>
                          {ch.name[0]}
                        </div>
                      )}
                      <span className="absolute -top-1 -left-1 w-5 h-5 text-white text-xs font-bold rounded-full flex items-center justify-center" style={{ backgroundColor: "#FF0000" }}>
                        {i + 1}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-bold truncate" style={{ color: "#292524" }}>{ch.name}</h3>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <PlatformBadge platform="youtube" />
                        <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "rgba(245,158,11,0.1)", color: "#D97706" }}>Trending {currentLabel}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-4 pt-4" style={{ borderTop: "1px solid rgba(245,215,160,0.2)" }}>
                    {[
                      { icon: <Users className="w-3 h-3" />, label: "Subscribers", val: formatNumber(ch.subscribers) },
                      { icon: <Eye className="w-3 h-3" />, label: "Total Views", val: formatNumber(ch.totalViews) },
                      { icon: <PlayCircle className="w-3 h-3" />, label: "Videos", val: formatNumber(ch.videoCount) },
                      { icon: <TrendingUp className="w-3 h-3" />, label: "ER Trending", val: ch.engagementRate + "%" },
                    ].map(s => (
                      <div key={s.label} className="rounded-lg p-3" style={{ backgroundColor: "rgba(245,215,160,0.1)" }}>
                        <div className="flex items-center gap-1.5 text-xs mb-1" style={{ color: "#C4AA8A" }}>
                          {s.icon}{s.label}
                        </div>
                        <p className="text-base font-bold" style={{ color: s.label === "ER Trending" ? "#16a34a" : "#292524" }}>{s.val}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 flex items-center justify-end gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => toggleCompare(ch)}
                      className="font-semibold transition-colors px-2 py-1 rounded"
                      style={isSelected
                        ? { color: "#F59E0B", backgroundColor: "rgba(245,158,11,0.1)" }
                        : { color: "#A8967E" }
                      }
                    >
                      {isSelected ? "✓ Selected" : "Compare"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAnalyticsChannel(ch)}
                      className="font-semibold hover:underline"
                      style={{ color: "#F59E0B" }}
                    >
                      Analytics →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
