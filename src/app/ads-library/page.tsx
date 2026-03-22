"use client";

import { useState, useEffect } from "react";
import Header from "@/components/layout/Header";
import { Search, ExternalLink, Clock, Trash2, Facebook, Instagram, Globe2, TrendingUp } from "lucide-react";

const cardStyle = { backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" };
const META = "#1877F2";

const COUNTRIES = [
  { code: "RO", label: "Romania", flag: "🇷🇴" },
  { code: "US", label: "USA", flag: "🇺🇸" },
  { code: "GB", label: "UK", flag: "🇬🇧" },
  { code: "DE", label: "Germany", flag: "🇩🇪" },
  { code: "FR", label: "France", flag: "🇫🇷" },
  { code: "IT", label: "Italy", flag: "🇮🇹" },
  { code: "ES", label: "Spain", flag: "🇪🇸" },
  { code: "NL", label: "Netherlands", flag: "🇳🇱" },
  { code: "ALL", label: "Global", flag: "🌍" },
];

const AD_TYPES = [
  { value: "all", label: "Toate tipurile" },
  { value: "political_and_issue_ads", label: "Politic" },
  { value: "housing_ads", label: "Imobiliare" },
  { value: "employment_ads", label: "Angajare" },
  { value: "credit_ads", label: "Credit/Finante" },
];

const POPULAR = [
  { name: "Nike", category: "Fashion" },
  { name: "Zara", category: "Fashion" },
  { name: "eMAG", category: "E-commerce" },
  { name: "Kaufland", category: "Retail" },
  { name: "Lidl", category: "Retail" },
  { name: "Booking", category: "Travel" },
  { name: "Revolut", category: "Fintech" },
  { name: "Bolt", category: "Transport" },
  { name: "Coca-Cola", category: "FMCG" },
  { name: "Samsung", category: "Tech" },
  { name: "Apple", category: "Tech" },
  { name: "Glovo", category: "Delivery" },
];

type SearchEntry = { query: string; country: string; timestamp: number };

function buildUrl(query: string, country: string, adType: string) {
  const params = new URLSearchParams({
    active_status: "active",
    ad_type: adType,
    country: country === "ALL" ? "ALL" : country,
    q: query,
    media_type: "all",
  });
  return `https://www.facebook.com/ads/library/?${params.toString()}`;
}

export default function AdsLibraryPage() {
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("RO");
  const [adType, setAdType] = useState("all");
  const [history, setHistory] = useState<SearchEntry[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("mh_ads_history");
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  const saveHistory = (entries: SearchEntry[]) => {
    setHistory(entries);
    localStorage.setItem("mh_ads_history", JSON.stringify(entries));
  };

  const search = (q?: string, c?: string) => {
    const term = (q || query).trim();
    const ctry = c || country;
    if (!term) return;

    // Save to history
    const entry: SearchEntry = { query: term, country: ctry, timestamp: Date.now() };
    const newHistory = [entry, ...history.filter(h => h.query !== term).slice(0, 19)];
    saveHistory(newHistory);

    // Open Meta Ad Library
    window.open(buildUrl(term, ctry, adType), "_blank");
  };

  const removeHistory = (query: string) => {
    saveHistory(history.filter(h => h.query !== query));
  };

  const clearHistory = () => saveHistory([]);

  const timeAgo = (ts: number) => {
    const diff = (Date.now() - ts) / 1000;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}z`;
  };

  return (
    <div>
      <Header title="Meta Ads Library" subtitle="Cerceteaza reclamele active ale oricarui brand pe Facebook & Instagram" />
      <div className="p-6 space-y-5">

        {/* Search */}
        <div className="rounded-xl p-5" style={cardStyle}>
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-52">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: META }} />
              <input type="text" placeholder="Cauta brand sau cuvant cheie..."
                value={query} onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && search()}
                className="w-full pl-9 pr-4 py-3 text-sm rounded-xl focus:outline-none"
                style={{ border: `1px solid ${META}30`, backgroundColor: "#FFF8F0", color: "#292524" }}
                onFocus={e => (e.currentTarget.style.borderColor = META)}
                onBlur={e => (e.currentTarget.style.borderColor = `${META}30`)}
              />
            </div>
            <select value={country} onChange={e => setCountry(e.target.value)}
              className="px-3 py-3 text-sm rounded-xl focus:outline-none"
              style={{ border: "1px solid rgba(245,215,160,0.3)", backgroundColor: "#FFF8F0", color: "#292524" }}>
              {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.label}</option>)}
            </select>
            <select value={adType} onChange={e => setAdType(e.target.value)}
              className="px-3 py-3 text-sm rounded-xl focus:outline-none"
              style={{ border: "1px solid rgba(245,215,160,0.3)", backgroundColor: "#FFF8F0", color: "#292524" }}>
              {AD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <button type="button" onClick={() => search()} disabled={!query.trim()}
              className="px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 transition-opacity"
              style={{ backgroundColor: META, color: "white", opacity: query.trim() ? 1 : 0.5 }}>
              <ExternalLink className="w-4 h-4" />
              Cauta reclame
            </button>
          </div>
        </div>

        {/* Two columns: Popular + History */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Popular Brands */}
          <div className="rounded-xl p-5" style={cardStyle}>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4" style={{ color: META }} />
              <h3 className="font-semibold" style={{ color: "#292524" }}>Branduri populare</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {POPULAR.map(brand => (
                <button key={brand.name} type="button"
                  onClick={() => { setQuery(brand.name); search(brand.name); }}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors"
                  style={{ backgroundColor: "rgba(24,119,242,0.04)", border: "1px solid rgba(24,119,242,0.1)" }}
                  onMouseEnter={e => {
                    e.currentTarget.style.backgroundColor = "rgba(24,119,242,0.1)";
                    e.currentTarget.style.borderColor = META;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = "rgba(24,119,242,0.04)";
                    e.currentTarget.style.borderColor = "rgba(24,119,242,0.1)";
                  }}>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "#292524" }}>{brand.name}</p>
                    <p className="text-xs" style={{ color: "#A8967E" }}>{brand.category}</p>
                  </div>
                  <ExternalLink className="w-3 h-3 flex-shrink-0" style={{ color: "#C4AA8A" }} />
                </button>
              ))}
            </div>
          </div>

          {/* Search History */}
          <div className="rounded-xl p-5" style={cardStyle}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" style={{ color: "#F59E0B" }} />
                <h3 className="font-semibold" style={{ color: "#292524" }}>Istoric cautari</h3>
              </div>
              {history.length > 0 && (
                <button type="button" onClick={clearHistory}
                  className="text-xs font-semibold px-2 py-1 rounded-lg"
                  style={{ color: "#A8967E", backgroundColor: "rgba(245,215,160,0.1)" }}>
                  Sterge tot
                </button>
              )}
            </div>

            {history.length > 0 ? (
              <div className="space-y-1.5">
                {history.slice(0, 12).map(h => {
                  const ctry = COUNTRIES.find(c => c.code === h.country);
                  return (
                    <div key={h.query + h.timestamp}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors group"
                      style={{ backgroundColor: "rgba(245,215,160,0.05)" }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(245,215,160,0.12)")}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = "rgba(245,215,160,0.05)")}>
                      <button type="button" onClick={() => { setQuery(h.query); setCountry(h.country); search(h.query, h.country); }}
                        className="flex-1 flex items-center gap-2 min-w-0 text-left">
                        <Search className="w-3 h-3 flex-shrink-0" style={{ color: "#C4AA8A" }} />
                        <span className="text-sm font-medium truncate" style={{ color: "#292524" }}>{h.query}</span>
                        <span className="text-xs flex-shrink-0" style={{ color: "#C4AA8A" }}>
                          {ctry?.flag} {ctry?.label}
                        </span>
                        <span className="text-xs flex-shrink-0 ml-auto" style={{ color: "#C4AA8A" }}>
                          {timeAgo(h.timestamp)} in urma
                        </span>
                      </button>
                      <button type="button" onClick={() => removeHistory(h.query)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity"
                        style={{ color: "#EF4444" }}>
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Clock className="w-8 h-8 mx-auto mb-2" style={{ color: "rgba(245,215,160,0.3)" }} />
                <p className="text-xs" style={{ color: "#C4AA8A" }}>Nicio cautare salvata inca</p>
              </div>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="rounded-xl p-5" style={cardStyle}>
          <div className="flex items-center gap-2 mb-3">
            <Facebook className="w-4 h-4" style={{ color: META }} />
            <h3 className="font-semibold" style={{ color: "#292524" }}>Cum functioneaza</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              {
                title: "1. Cauta un brand",
                text: "Introdu numele brandului sau un cuvant cheie. Selecteaza tara si tipul de reclama.",
                icon: <Search className="w-4 h-4" />,
              },
              {
                title: "2. Analizeaza reclamele",
                text: "Se deschide Meta Ad Library cu toate reclamele active ale brandului — texte, imagini, video, date de start.",
                icon: <Instagram className="w-4 h-4" />,
              },
              {
                title: "3. Inspira-te",
                text: "Vezi ce reclame ruleaza competitorii tai, ce mesaje folosesc, pe ce platforme si in ce tari sunt active.",
                icon: <Globe2 className="w-4 h-4" />,
              },
            ].map((step, i) => (
              <div key={i} className="rounded-lg p-3" style={{ backgroundColor: `${META}06`, border: `1px solid ${META}12` }}>
                <div className="flex items-center gap-1.5 mb-1.5" style={{ color: META }}>
                  {step.icon}
                  <p className="text-xs font-bold">{step.title}</p>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: "#78614E" }}>{step.text}</p>
              </div>
            ))}
          </div>
          <p className="text-xs mt-3" style={{ color: "#C4AA8A" }}>
            Meta Ad Library este o resursa publica de la Facebook — datele sunt reale si actualizate in timp real. Nu necesita autentificare.
          </p>
        </div>
      </div>
    </div>
  );
}
