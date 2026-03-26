"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/layout/Header";
import { Newspaper, Globe, ExternalLink, Clock, Download, ChevronDown, Search } from "lucide-react";
import { exportCSV, exportJSON } from "@/lib/utils";

const cardStyle = { backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" };

// All supported countries — hardcoded on frontend (same as Trending page pattern)
const ALL_NEWS_COUNTRIES = [
  // Americas
  { code: "us", flag: "🇺🇸", name: "United States" },
  { code: "ca", flag: "🇨🇦", name: "Canada" },
  { code: "mx", flag: "🇲🇽", name: "México" },
  { code: "br", flag: "🇧🇷", name: "Brasil" },
  { code: "ar", flag: "🇦🇷", name: "Argentina" },
  { code: "co", flag: "🇨🇴", name: "Colombia" },
  { code: "cl", flag: "🇨🇱", name: "Chile" },
  { code: "pe", flag: "🇵🇪", name: "Perú" },
  { code: "ve", flag: "🇻🇪", name: "Venezuela" },
  { code: "cu", flag: "🇨🇺", name: "Cuba" },
  // Europe
  { code: "uk", flag: "🇬🇧", name: "United Kingdom" },
  { code: "de", flag: "🇩🇪", name: "Deutschland" },
  { code: "fr", flag: "🇫🇷", name: "France" },
  { code: "es", flag: "🇪🇸", name: "España" },
  { code: "it", flag: "🇮🇹", name: "Italia" },
  { code: "ro", flag: "🇷🇴", name: "România" },
  { code: "pl", flag: "🇵🇱", name: "Polska" },
  { code: "nl", flag: "🇳🇱", name: "Nederland" },
  { code: "be", flag: "🇧🇪", name: "Belgique" },
  { code: "se", flag: "🇸🇪", name: "Sverige" },
  { code: "no", flag: "🇳🇴", name: "Norge" },
  { code: "dk", flag: "🇩🇰", name: "Danmark" },
  { code: "fi", flag: "🇫🇮", name: "Suomi" },
  { code: "ch", flag: "🇨🇭", name: "Schweiz" },
  { code: "at", flag: "🇦🇹", name: "Österreich" },
  { code: "pt", flag: "🇵🇹", name: "Portugal" },
  { code: "gr", flag: "🇬🇷", name: "Ελλάδα" },
  { code: "cz", flag: "🇨🇿", name: "Česko" },
  { code: "hu", flag: "🇭🇺", name: "Magyarország" },
  { code: "sk", flag: "🇸🇰", name: "Slovensko" },
  { code: "bg", flag: "🇧🇬", name: "България" },
  { code: "rs", flag: "🇷🇸", name: "Srbija" },
  { code: "hr", flag: "🇭🇷", name: "Hrvatska" },
  { code: "si", flag: "🇸🇮", name: "Slovenija" },
  { code: "lt", flag: "🇱🇹", name: "Lietuva" },
  { code: "lv", flag: "🇱🇻", name: "Latvija" },
  { code: "ee", flag: "🇪🇪", name: "Eesti" },
  { code: "ru", flag: "🇷🇺", name: "Россия" },
  { code: "ua", flag: "🇺🇦", name: "Україна" },
  // Middle East & Africa
  { code: "tr", flag: "🇹🇷", name: "Türkiye" },
  { code: "il", flag: "🇮🇱", name: "ישראל" },
  { code: "sa", flag: "🇸🇦", name: "السعودية" },
  { code: "ae", flag: "🇦🇪", name: "الإمارات" },
  { code: "eg", flag: "🇪🇬", name: "مصر" },
  { code: "lb", flag: "🇱🇧", name: "لبنان" },
  { code: "ma", flag: "🇲🇦", name: "المغرب" },
  { code: "ng", flag: "🇳🇬", name: "Nigeria" },
  { code: "za", flag: "🇿🇦", name: "South Africa" },
  { code: "ke", flag: "🇰🇪", name: "Kenya" },
  { code: "gh", flag: "🇬🇭", name: "Ghana" },
  { code: "tz", flag: "🇹🇿", name: "Tanzania" },
  { code: "et", flag: "🇪🇹", name: "Ethiopia" },
  // Asia & Oceania
  { code: "in", flag: "🇮🇳", name: "India" },
  { code: "jp", flag: "🇯🇵", name: "日本" },
  { code: "cn", flag: "🇨🇳", name: "中国" },
  { code: "kr", flag: "🇰🇷", name: "한국" },
  { code: "tw", flag: "🇹🇼", name: "台灣" },
  { code: "hk", flag: "🇭🇰", name: "香港" },
  { code: "sg", flag: "🇸🇬", name: "Singapore" },
  { code: "my", flag: "🇲🇾", name: "Malaysia" },
  { code: "ph", flag: "🇵🇭", name: "Philippines" },
  { code: "id", flag: "🇮🇩", name: "Indonesia" },
  { code: "th", flag: "🇹🇭", name: "ประเทศไทย" },
  { code: "vn", flag: "🇻🇳", name: "Việt Nam" },
  { code: "bd", flag: "🇧🇩", name: "Bangladesh" },
  { code: "pk", flag: "🇵🇰", name: "پاکستان" },
  { code: "lk", flag: "🇱🇰", name: "Sri Lanka" },
  { code: "np", flag: "🇳🇵", name: "Nepal" },
  { code: "kz", flag: "🇰🇿", name: "Қазақстан" },
  { code: "au", flag: "🇦🇺", name: "Australia" },
  { code: "nz", flag: "🇳🇿", name: "New Zealand" },
];

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor(diff / 60000);
  if (h >= 24) return `${Math.floor(h / 24)}d`;
  if (h >= 1) return `${h}h`;
  return `${m}m`;
}

type Country = { code: string; name: string; flag: string };
type Article = { title: string; description: string; url: string; thumbnail: string | null; source: string; publishedAt: string };

export default function NewsPage() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<{ country: Country; countries: Country[]; headlines: Article[]; social: Article[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState("us");
  const [isGlobal, setIsGlobal] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [newsFilter, setNewsFilter] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle ?q= from header search
  useEffect(() => {
    const q = searchParams.get("q");
    if (q) setNewsFilter(q.toLowerCase());
    else setNewsFilter("");
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
    setSelectedCountry("us");
    setDropdownOpen(false);
  };

  const handleSelectCountry = (code: string) => {
    setIsGlobal(false);
    setSelectedCountry(code);
    setDropdownOpen(false);
    setCountrySearch("");
  };

  const handleGlobalClick = () => {
    handleGlobal();
    setCountrySearch("");
  };

  const currentCountry = ALL_NEWS_COUNTRIES.find(c => c.code === selectedCountry);
  const filteredCountries = countrySearch.trim()
    ? ALL_NEWS_COUNTRIES.filter(c =>
        c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
        c.code.toLowerCase().includes(countrySearch.toLowerCase())
      )
    : ALL_NEWS_COUNTRIES;

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/news?country=${selectedCountry}`)
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d); })
      .catch(() => setError("Connection error"))
      .finally(() => setLoading(false));
  }, [selectedCountry]);

  return (
    <div>
      <Header title="News" subtitle="News from around the world + Creator Economy — each country in its own language" />
      <div className="p-6 space-y-6">

        {/* Country selector — always visible, hardcoded list */}
        <div className="flex items-center gap-2 flex-wrap">

          {/* Global Button */}
          <button type="button" onClick={handleGlobalClick}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={isGlobal
              ? { backgroundColor: "rgba(245,158,11,0.15)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.3)" }
              : { backgroundColor: "#FFFCF7", color: "#78614E", border: "1px solid rgba(245,215,160,0.25)" }
            }
          >
            <Globe className="w-4 h-4" /> Global
          </button>

          {/* International Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button type="button" onClick={() => setDropdownOpen(prev => !prev)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={!isGlobal
                ? { backgroundColor: "rgba(245,158,11,0.15)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.3)" }
                : { backgroundColor: "#FFFCF7", color: "#78614E", border: "1px solid rgba(245,215,160,0.25)" }
              }
            >
              {!isGlobal && currentCountry
                ? <><span>{currentCountry.flag}</span><span>{currentCountry.name}</span></>
                : "🗺️ International"
              }
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {dropdownOpen && (
              <div className="absolute top-full left-0 mt-1 z-50 rounded-xl overflow-hidden flex flex-col"
                style={{ backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.4)", boxShadow: "0 8px 24px rgba(120,97,78,0.15)", width: "240px" }}
              >
                {/* Search inside dropdown */}
                <div className="p-2 flex-shrink-0" style={{ borderBottom: "1px solid rgba(245,215,160,0.2)" }}>
                  <input
                    type="text"
                    autoFocus
                    value={countrySearch}
                    onChange={e => setCountrySearch(e.target.value)}
                    placeholder="Search country..."
                    className="w-full px-3 py-1.5 text-sm rounded-lg focus:outline-none"
                    style={{ backgroundColor: "rgba(245,215,160,0.12)", color: "#292524", border: "1px solid rgba(245,215,160,0.25)" }}
                  />
                </div>
                {/* Scrollable list */}
                <div className="overflow-y-auto" style={{ maxHeight: "280px" }}>
                  {filteredCountries.length === 0 && (
                    <p className="px-4 py-3 text-sm" style={{ color: "#A8967E" }}>No results</p>
                  )}
                  {filteredCountries.map(c => (
                    <button key={c.code} type="button" onClick={() => handleSelectCountry(c.code)}
                      className="w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2"
                      style={{
                        color: selectedCountry === c.code && !isGlobal ? "#F59E0B" : "#5C4A35",
                        backgroundColor: selectedCountry === c.code && !isGlobal ? "rgba(245,158,11,0.08)" : "transparent",
                        fontWeight: selectedCountry === c.code && !isGlobal ? "600" : "400",
                      }}
                      onMouseEnter={e => { if (!(selectedCountry === c.code && !isGlobal)) e.currentTarget.style.backgroundColor = "rgba(245,215,160,0.2)"; }}
                      onMouseLeave={e => { if (!(selectedCountry === c.code && !isGlobal)) e.currentTarget.style.backgroundColor = "transparent"; }}
                    >
                      <span>{c.flag}</span><span>{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Export buttons */}
        {data && (
          <div className="flex items-center justify-end gap-2">
            <button type="button" onClick={() => exportCSV(`news-${selectedCountry}`, ["Title", "Source", "Date", "URL"],
              (data.headlines || []).map(a => [a.title, a.source, a.publishedAt, a.url])
            )} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ backgroundColor: "rgba(245,215,160,0.15)", color: "#78614E", border: "1px solid rgba(245,215,160,0.35)" }}>
              <Download className="w-3 h-3" />CSV {data.country.name}
            </button>
            <button type="button" onClick={() => exportCSV("news-creator", ["Title", "Source", "Date", "URL"],
              (data.social || []).map(a => [a.title, a.source, a.publishedAt, a.url])
            )} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ backgroundColor: "rgba(245,215,160,0.15)", color: "#78614E", border: "1px solid rgba(245,215,160,0.35)" }}>
              <Download className="w-3 h-3" />CSV Creator Economy
            </button>
            <button type="button" onClick={() => exportJSON("news-all", { exportedAt: new Date().toISOString(), ...data })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ backgroundColor: "rgba(245,215,160,0.15)", color: "#78614E", border: "1px solid rgba(245,215,160,0.35)" }}>
              <Download className="w-3 h-3" />Full JSON
            </button>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center h-40">
            <p style={{ color: "#C4AA8A" }}>Loading news...</p>
          </div>
        )}

        {error && (
          <div className="rounded-xl p-5" style={cardStyle}>
            <p className="text-sm" style={{ color: "#dc2626" }}>Error: {error}</p>
          </div>
        )}

        {data && !loading && (
          <>
            {/* Filter indicator */}
            {newsFilter && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm" style={{ backgroundColor: "rgba(245,158,11,0.1)", color: "#D97706", border: "1px solid rgba(245,158,11,0.2)" }}>
                <Search className="w-3.5 h-3.5" />
                Filtering by: <strong>&quot;{newsFilter}&quot;</strong>
                <button type="button" onClick={() => setNewsFilter("")} className="ml-auto text-xs underline">Clear</button>
              </div>
            )}

            {/* Country Headlines */}
            {data.headlines?.length > 0 && (
              <div className="rounded-xl overflow-hidden" style={cardStyle}>
                <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: "1px solid rgba(245,215,160,0.2)" }}>
                  <span className="text-base">{data.country.flag}</span>
                  <h3 className="font-semibold" style={{ color: "#292524" }}>Top Headlines — {data.country.name}</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x" style={{ borderColor: "rgba(245,215,160,0.15)" }}>
                  {data.headlines.filter(a => !newsFilter || a.title.toLowerCase().includes(newsFilter) || (a.description || "").toLowerCase().includes(newsFilter)).map((a, i) => (
                    <a key={i} href={a.url} target="_blank" rel="noopener noreferrer"
                      className="flex flex-col p-5 transition-colors group"
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(245,215,160,0.07)")}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(245,158,11,0.12)", color: "#D97706" }}>
                          {a.source}
                        </span>
                        <span className="flex items-center gap-1 text-xs" style={{ color: "#C4AA8A" }}>
                          <Clock className="w-3 h-3" />{timeAgo(a.publishedAt)}
                        </span>
                      </div>
                      <p className="text-sm font-semibold leading-snug group-hover:underline line-clamp-3" style={{ color: "#292524" }}>{a.title}</p>
                      {a.description && (
                        <p className="text-xs mt-2 line-clamp-2" style={{ color: "#A8967E" }}>{a.description}</p>
                      )}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Creator Economy / Social Media News */}
            {data.social?.length > 0 && (
              <div className="rounded-xl overflow-hidden" style={cardStyle}>
                <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: "1px solid rgba(245,215,160,0.2)" }}>
                  <Globe className="w-4 h-4" style={{ color: "#F59E0B" }} />
                  <h3 className="font-semibold" style={{ color: "#292524" }}>Creator Economy & Social Media — Global</h3>
                </div>
                <div className="divide-y" style={{ borderColor: "rgba(245,215,160,0.1)" }}>
                  {data.social.filter(a => !newsFilter || a.title.toLowerCase().includes(newsFilter) || (a.description || "").toLowerCase().includes(newsFilter)).map((a, i) => (
                    <a key={i} href={a.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-start gap-4 px-5 py-4 transition-colors group"
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(245,215,160,0.07)")}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}>
                      <div className="w-20 h-14 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: "rgba(245,215,160,0.1)" }}>
                        <Newspaper className="w-5 h-5" style={{ color: "#C4AA8A" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(245,158,11,0.12)", color: "#D97706" }}>
                            {a.source}
                          </span>
                          <span className="flex items-center gap-1 text-xs" style={{ color: "#C4AA8A" }}>
                            <Clock className="w-3 h-3" />{timeAgo(a.publishedAt)}
                          </span>
                        </div>
                        <p className="text-sm font-semibold leading-snug group-hover:underline line-clamp-2" style={{ color: "#292524" }}>{a.title}</p>
                        {a.description && (
                          <p className="text-xs mt-1 line-clamp-1" style={{ color: "#A8967E" }}>{a.description}</p>
                        )}
                      </div>
                      <ExternalLink className="w-4 h-4 flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "#C4AA8A" }} />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
