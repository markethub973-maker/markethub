"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import Header from "@/components/layout/Header";
import { formatNumber } from "@/lib/utils";
import { TrendingUp, Eye, ThumbsUp, MessageCircle, Globe, ChevronRight } from "lucide-react";

// Lazy load map to avoid SSR issues
const WorldMap = dynamic(() => import("@/components/ui/WorldMap"), { ssr: false, loading: () => (
  <div className="flex items-center justify-center h-64" style={{ color: "#C4AA8A" }}>Se incarca harta...</div>
)});

const cardStyle = { backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" };

export const CONTINENTS: { label: string; emoji: string; countries: { code: string; name: string; flag: string }[] }[] = [
  {
    label: "Europa", emoji: "🇪🇺",
    countries: [
      { code: "RO", name: "România", flag: "🇷🇴" },
      { code: "GB", name: "UK", flag: "🇬🇧" },
      { code: "DE", name: "Germania", flag: "🇩🇪" },
      { code: "FR", name: "Franța", flag: "🇫🇷" },
      { code: "IT", name: "Italia", flag: "🇮🇹" },
      { code: "ES", name: "Spania", flag: "🇪🇸" },
      { code: "NL", name: "Olanda", flag: "🇳🇱" },
      { code: "PL", name: "Polonia", flag: "🇵🇱" },
      { code: "SE", name: "Suedia", flag: "🇸🇪" },
      { code: "NO", name: "Norvegia", flag: "🇳🇴" },
      { code: "DK", name: "Danemarca", flag: "🇩🇰" },
      { code: "FI", name: "Finlanda", flag: "🇫🇮" },
      { code: "PT", name: "Portugalia", flag: "🇵🇹" },
      { code: "GR", name: "Grecia", flag: "🇬🇷" },
      { code: "AT", name: "Austria", flag: "🇦🇹" },
      { code: "BE", name: "Belgia", flag: "🇧🇪" },
      { code: "CH", name: "Elveția", flag: "🇨🇭" },
      { code: "HU", name: "Ungaria", flag: "🇭🇺" },
      { code: "CZ", name: "Cehia", flag: "🇨🇿" },
      { code: "SK", name: "Slovacia", flag: "🇸🇰" },
      { code: "BG", name: "Bulgaria", flag: "🇧🇬" },
      { code: "HR", name: "Croația", flag: "🇭🇷" },
      { code: "RS", name: "Serbia", flag: "🇷🇸" },
      { code: "UA", name: "Ucraina", flag: "🇺🇦" },
      { code: "LT", name: "Lituania", flag: "🇱🇹" },
      { code: "LV", name: "Letonia", flag: "🇱🇻" },
      { code: "EE", name: "Estonia", flag: "🇪🇪" },
      { code: "SI", name: "Slovenia", flag: "🇸🇮" },
    ],
  },
  {
    label: "Americas", emoji: "🌎",
    countries: [
      { code: "US", name: "SUA", flag: "🇺🇸" },
      { code: "CA", name: "Canada", flag: "🇨🇦" },
      { code: "BR", name: "Brazilia", flag: "🇧🇷" },
      { code: "MX", name: "Mexic", flag: "🇲🇽" },
      { code: "AR", name: "Argentina", flag: "🇦🇷" },
      { code: "CO", name: "Columbia", flag: "🇨🇴" },
      { code: "CL", name: "Chile", flag: "🇨🇱" },
      { code: "PE", name: "Peru", flag: "🇵🇪" },
      { code: "VE", name: "Venezuela", flag: "🇻🇪" },
      { code: "EC", name: "Ecuador", flag: "🇪🇨" },
      { code: "DO", name: "Rep. Dominicana", flag: "🇩🇴" },
      { code: "PR", name: "Puerto Rico", flag: "🇵🇷" },
      { code: "GT", name: "Guatemala", flag: "🇬🇹" },
    ],
  },
  {
    label: "Asia & Pacific", emoji: "🌏",
    countries: [
      { code: "JP", name: "Japonia", flag: "🇯🇵" },
      { code: "KR", name: "Coreea de Sud", flag: "🇰🇷" },
      { code: "IN", name: "India", flag: "🇮🇳" },
      { code: "PH", name: "Filipine", flag: "🇵🇭" },
      { code: "TH", name: "Thailanda", flag: "🇹🇭" },
      { code: "SG", name: "Singapore", flag: "🇸🇬" },
      { code: "TW", name: "Taiwan", flag: "🇹🇼" },
      { code: "HK", name: "Hong Kong", flag: "🇭🇰" },
      { code: "ID", name: "Indonezia", flag: "🇮🇩" },
      { code: "MY", name: "Malaysia", flag: "🇲🇾" },
      { code: "VN", name: "Vietnam", flag: "🇻🇳" },
      { code: "BD", name: "Bangladesh", flag: "🇧🇩" },
      { code: "PK", name: "Pakistan", flag: "🇵🇰" },
      { code: "NP", name: "Nepal", flag: "🇳🇵" },
      { code: "AU", name: "Australia", flag: "🇦🇺" },
      { code: "NZ", name: "Noua Zeelandă", flag: "🇳🇿" },
    ],
  },
  {
    label: "Orientul Mijlociu", emoji: "🌍",
    countries: [
      { code: "SA", name: "Arabia Saudită", flag: "🇸🇦" },
      { code: "AE", name: "EAU", flag: "🇦🇪" },
      { code: "EG", name: "Egipt", flag: "🇪🇬" },
      { code: "IL", name: "Israel", flag: "🇮🇱" },
      { code: "TR", name: "Turcia", flag: "🇹🇷" },
      { code: "KW", name: "Kuwait", flag: "🇰🇼" },
      { code: "QA", name: "Qatar", flag: "🇶🇦" },
      { code: "IQ", name: "Irak", flag: "🇮🇶" },
      { code: "JO", name: "Iordania", flag: "🇯🇴" },
      { code: "LB", name: "Liban", flag: "🇱🇧" },
      { code: "DZ", name: "Algeria", flag: "🇩🇿" },
      { code: "MA", name: "Maroc", flag: "🇲🇦" },
      { code: "TN", name: "Tunisia", flag: "🇹🇳" },
    ],
  },
  {
    label: "Africa Sub-Sahariană", emoji: "🌍",
    countries: [
      { code: "NG", name: "Nigeria", flag: "🇳🇬" },
      { code: "ZA", name: "Africa de Sud", flag: "🇿🇦" },
      { code: "GH", name: "Ghana", flag: "🇬🇭" },
      { code: "KE", name: "Kenya", flag: "🇰🇪" },
      { code: "TZ", name: "Tanzania", flag: "🇹🇿" },
      { code: "UG", name: "Uganda", flag: "🇺🇬" },
      { code: "SN", name: "Senegal", flag: "🇸🇳" },
      { code: "CM", name: "Camerun", flag: "🇨🇲" },
      { code: "CI", name: "Coasta de Fildeș", flag: "🇨🇮" },
    ],
  },
  {
    label: "CSI / Rusia", emoji: "🌐",
    countries: [
      { code: "RU", name: "Rusia", flag: "🇷🇺" },
      { code: "KZ", name: "Kazahstan", flag: "🇰🇿" },
      { code: "BY", name: "Belarus", flag: "🇧🇾" },
      { code: "AZ", name: "Azerbaidjan", flag: "🇦🇿" },
      { code: "GE", name: "Georgia", flag: "🇬🇪" },
      { code: "UZ", name: "Uzbekistan", flag: "🇺🇿" },
    ],
  },
];

export const ALL_COUNTRIES = CONTINENTS.flatMap(c => c.countries);

export default function GlobalTrendingPage() {
  const [selectedCountry, setSelectedCountry] = useState({ code: "RO", name: "România", flag: "🇷🇴" });
  const [activeContinent, setActiveContinent] = useState("Europa");
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [cache, setCache] = useState<Record<string, any[]>>({});

  const loadCountry = useCallback((code: string) => {
    if (cache[code]) { setVideos(cache[code]); return; }
    setLoading(true);
    fetch(`/api/youtube/global-trending?region=${code}&max=10`)
      .then(r => r.json())
      .then(d => {
        if (d.videos) {
          setVideos(d.videos);
          setCache(prev => ({ ...prev, [code]: d.videos }));
        }
      })
      .finally(() => setLoading(false));
  }, [cache]);

  useEffect(() => { loadCountry(selectedCountry.code); }, [selectedCountry.code]);

  const handleCountry = (c: { code: string; name: string; flag: string }) => {
    setSelectedCountry(c);
  };

  return (
    <div>
      <Header
        title="Global Trending"
        subtitle="Top trending YouTube în 70+ țări — hartă mondială cu date reale"
      />
      <div className="p-6 space-y-5">

        {/* World Map */}
        <div className="rounded-xl p-4" style={cardStyle}>
          <div className="flex items-center gap-2 mb-3">
            <Globe className="w-4 h-4" style={{ color: "#F59E0B" }} />
            <span className="text-sm font-semibold" style={{ color: "#292524" }}>
              Harta Mondiala — click pe orice tara
            </span>
            <span className="ml-auto text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(245,158,11,0.12)", color: "#D97706" }}>
              {selectedCountry.flag} {selectedCountry.name}
            </span>
          </div>
          <WorldMap
            selectedCode={selectedCountry.code}
            countries={ALL_COUNTRIES}
            onSelect={handleCountry}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left: Country Selector */}
          <div className="rounded-xl overflow-hidden" style={cardStyle}>
            {/* Continent Tabs */}
            <div className="flex flex-wrap gap-1 p-3" style={{ borderBottom: "1px solid rgba(245,215,160,0.2)" }}>
              {CONTINENTS.map(c => (
                <button key={c.label} type="button"
                  onClick={() => setActiveContinent(c.label)}
                  className="px-2 py-1 text-xs font-medium rounded-md transition-colors"
                  style={activeContinent === c.label
                    ? { backgroundColor: "#F59E0B", color: "#1C1814" }
                    : { color: "#78614E", backgroundColor: "rgba(245,215,160,0.1)" }}>
                  {c.emoji} {c.label}
                </button>
              ))}
            </div>
            {/* Countries */}
            <div className="overflow-y-auto" style={{ maxHeight: "480px" }}>
              {CONTINENTS.find(c => c.label === activeContinent)?.countries.map(country => (
                <button key={country.code} type="button"
                  onClick={() => handleCountry(country)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                  style={selectedCountry.code === country.code
                    ? { backgroundColor: "rgba(245,158,11,0.12)", borderLeft: "3px solid #F59E0B" }
                    : { borderLeft: "3px solid transparent" }}
                  onMouseEnter={e => { if (selectedCountry.code !== country.code) e.currentTarget.style.backgroundColor = "rgba(245,215,160,0.07)"; }}
                  onMouseLeave={e => { if (selectedCountry.code !== country.code) e.currentTarget.style.backgroundColor = "transparent"; }}>
                  <span className="text-lg">{country.flag}</span>
                  <span className="text-sm font-medium" style={{ color: selectedCountry.code === country.code ? "#F59E0B" : "#292524" }}>
                    {country.name}
                  </span>
                  <span className="ml-auto text-xs font-mono" style={{ color: "#C4AA8A" }}>{country.code}</span>
                  {selectedCountry.code === country.code && <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#F59E0B" }} />}
                </button>
              ))}
            </div>
          </div>

          {/* Right: Trending Videos */}
          <div className="lg:col-span-2 rounded-xl overflow-hidden" style={cardStyle}>
            <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: "1px solid rgba(245,215,160,0.2)" }}>
              <span className="text-2xl">{selectedCountry.flag}</span>
              <div>
                <h3 className="font-bold" style={{ color: "#292524" }}>
                  Top Trending — {selectedCountry.name}
                </h3>
                <p className="text-xs" style={{ color: "#A8967E" }}>YouTube Most Popular · Actualizat la 30min</p>
              </div>
              {loading && <span className="ml-auto text-xs" style={{ color: "#C4AA8A" }}>Se incarca...</span>}
            </div>

            {loading && videos.length === 0 ? (
              <div className="flex items-center justify-center h-48">
                <p className="text-sm" style={{ color: "#C4AA8A" }}>Se incarca datele...</p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: "rgba(245,215,160,0.1)" }}>
                {videos.map((v, i) => (
                  <a key={v.id} href={`https://www.youtube.com/watch?v=${v.id}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-start gap-3 px-5 py-3 transition-colors group"
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(245,215,160,0.07)")}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}>
                    <span className="w-6 text-xs font-bold text-center flex-shrink-0 mt-1" style={{ color: i < 3 ? "#F59E0B" : "#C4AA8A" }}>
                      {i + 1}
                    </span>
                    <div className="relative flex-shrink-0">
                      <img src={v.thumbnail} alt="" className="w-24 h-14 rounded-lg object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold leading-snug line-clamp-2 group-hover:underline" style={{ color: "#292524" }}>{v.title}</p>
                      <p className="text-xs mt-0.5" style={{ color: "#A8967E" }}>{v.channel}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="flex items-center gap-1 text-xs" style={{ color: "#F59E0B" }}>
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
                {videos.length === 0 && !loading && (
                  <div className="flex items-center justify-center h-32">
                    <p className="text-sm" style={{ color: "#C4AA8A" }}>Nu exista date trending pentru aceasta tara.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Continent Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {CONTINENTS.map(c => (
            <button key={c.label} type="button"
              onClick={() => { setActiveContinent(c.label); const first = c.countries[0]; if (first) handleCountry(first); }}
              className="rounded-xl p-4 text-left transition-all hover:scale-105"
              style={cardStyle}>
              <div className="text-2xl mb-2">{c.emoji}</div>
              <p className="text-xs font-bold leading-tight" style={{ color: "#292524" }}>{c.label}</p>
              <p className="text-xs mt-1" style={{ color: "#A8967E" }}>{c.countries.length} țări</p>
              <div className="mt-2 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" style={{ color: "#F59E0B" }} />
                <span className="text-xs" style={{ color: "#F59E0B" }}>Live data</span>
              </div>
            </button>
          ))}
        </div>

      </div>
    </div>
  );
}
