"use client";

import { useState, useEffect, useRef } from "react";
import Header from "@/components/layout/Header";
import {
  Search, ExternalLink, Clock, Trash2, Facebook, Instagram, Globe2,
  TrendingUp, Bookmark, BookmarkCheck, StickyNote, ChevronDown, ChevronUp,
  Copy, Check, Sparkles, Target, Eye, BarChart3, Lightbulb, X, Globe, Film
} from "lucide-react";

const cardStyle = { backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" };
const META = "#1877F2";

const ALL_COUNTRIES = [
  { code: "AF", label: "🇦🇫 Afghanistan" }, { code: "AL", label: "🇦🇱 Albania" },
  { code: "DZ", label: "🇩🇿 Algeria" }, { code: "AD", label: "🇦🇩 Andorra" },
  { code: "AO", label: "🇦🇴 Angola" }, { code: "AR", label: "🇦🇷 Argentina" },
  { code: "AM", label: "🇦🇲 Armenia" }, { code: "AU", label: "🇦🇺 Australia" },
  { code: "AT", label: "🇦🇹 Austria" }, { code: "AZ", label: "🇦🇿 Azerbaijan" },
  { code: "BH", label: "🇧🇭 Bahrain" }, { code: "BD", label: "🇧🇩 Bangladesh" },
  { code: "BY", label: "🇧🇾 Belarus" }, { code: "BE", label: "🇧🇪 Belgium" },
  { code: "BZ", label: "🇧🇿 Belize" }, { code: "BJ", label: "🇧🇯 Benin" },
  { code: "BO", label: "🇧🇴 Bolivia" }, { code: "BA", label: "🇧🇦 Bosnia & Herzegovina" },
  { code: "BW", label: "🇧🇼 Botswana" }, { code: "BR", label: "🇧🇷 Brazil" },
  { code: "BG", label: "🇧🇬 Bulgaria" }, { code: "KH", label: "🇰🇭 Cambodia" },
  { code: "CM", label: "🇨🇲 Cameroon" }, { code: "CA", label: "🇨🇦 Canada" },
  { code: "CL", label: "🇨🇱 Chile" }, { code: "CN", label: "🇨🇳 China" },
  { code: "CO", label: "🇨🇴 Colombia" }, { code: "CR", label: "🇨🇷 Costa Rica" },
  { code: "HR", label: "🇭🇷 Croatia" }, { code: "CU", label: "🇨🇺 Cuba" },
  { code: "CY", label: "🇨🇾 Cyprus" }, { code: "CZ", label: "🇨🇿 Czech Republic" },
  { code: "DK", label: "🇩🇰 Denmark" }, { code: "DO", label: "🇩🇴 Dominican Republic" },
  { code: "EC", label: "🇪🇨 Ecuador" }, { code: "EG", label: "🇪🇬 Egypt" },
  { code: "SV", label: "🇸🇻 El Salvador" }, { code: "EE", label: "🇪🇪 Estonia" },
  { code: "ET", label: "🇪🇹 Ethiopia" }, { code: "FI", label: "🇫🇮 Finland" },
  { code: "FR", label: "🇫🇷 France" }, { code: "GE", label: "🇬🇪 Georgia" },
  { code: "DE", label: "🇩🇪 Germany" }, { code: "GH", label: "🇬🇭 Ghana" },
  { code: "GR", label: "🇬🇷 Greece" }, { code: "GT", label: "🇬🇹 Guatemala" },
  { code: "HN", label: "🇭🇳 Honduras" }, { code: "HK", label: "🇭🇰 Hong Kong" },
  { code: "HU", label: "🇭🇺 Hungary" }, { code: "IS", label: "🇮🇸 Iceland" },
  { code: "IN", label: "🇮🇳 India" }, { code: "ID", label: "🇮🇩 Indonesia" },
  { code: "IQ", label: "🇮🇶 Iraq" }, { code: "IE", label: "🇮🇪 Ireland" },
  { code: "IL", label: "🇮🇱 Israel" }, { code: "IT", label: "🇮🇹 Italy" },
  { code: "CI", label: "🇨🇮 Ivory Coast" }, { code: "JM", label: "🇯🇲 Jamaica" },
  { code: "JP", label: "🇯🇵 Japan" }, { code: "JO", label: "🇯🇴 Jordan" },
  { code: "KZ", label: "🇰🇿 Kazakhstan" }, { code: "KE", label: "🇰🇪 Kenya" },
  { code: "KW", label: "🇰🇼 Kuwait" }, { code: "LA", label: "🇱🇦 Laos" },
  { code: "LV", label: "🇱🇻 Latvia" }, { code: "LB", label: "🇱🇧 Lebanon" },
  { code: "LY", label: "🇱🇾 Libya" }, { code: "LT", label: "🇱🇹 Lithuania" },
  { code: "LU", label: "🇱🇺 Luxembourg" }, { code: "MY", label: "🇲🇾 Malaysia" },
  { code: "MT", label: "🇲🇹 Malta" }, { code: "MX", label: "🇲🇽 Mexico" },
  { code: "MD", label: "🇲🇩 Moldova" }, { code: "MN", label: "🇲🇳 Mongolia" },
  { code: "ME", label: "🇲🇪 Montenegro" }, { code: "MA", label: "🇲🇦 Morocco" },
  { code: "MZ", label: "🇲🇿 Mozambique" }, { code: "MM", label: "🇲🇲 Myanmar" },
  { code: "NP", label: "🇳🇵 Nepal" }, { code: "NL", label: "🇳🇱 Netherlands" },
  { code: "NZ", label: "🇳🇿 New Zealand" }, { code: "NI", label: "🇳🇮 Nicaragua" },
  { code: "NG", label: "🇳🇬 Nigeria" }, { code: "MK", label: "🇲🇰 North Macedonia" },
  { code: "NO", label: "🇳🇴 Norway" }, { code: "OM", label: "🇴🇲 Oman" },
  { code: "PK", label: "🇵🇰 Pakistan" }, { code: "PA", label: "🇵🇦 Panama" },
  { code: "PY", label: "🇵🇾 Paraguay" }, { code: "PE", label: "🇵🇪 Peru" },
  { code: "PH", label: "🇵🇭 Philippines" }, { code: "PL", label: "🇵🇱 Poland" },
  { code: "PT", label: "🇵🇹 Portugal" }, { code: "QA", label: "🇶🇦 Qatar" },
  { code: "RO", label: "🇷🇴 Romania" }, { code: "RU", label: "🇷🇺 Russia" },
  { code: "RW", label: "🇷🇼 Rwanda" }, { code: "SA", label: "🇸🇦 Saudi Arabia" },
  { code: "SN", label: "🇸🇳 Senegal" }, { code: "RS", label: "🇷🇸 Serbia" },
  { code: "SG", label: "🇸🇬 Singapore" }, { code: "SK", label: "🇸🇰 Slovakia" },
  { code: "SI", label: "🇸🇮 Slovenia" }, { code: "ZA", label: "🇿🇦 South Africa" },
  { code: "ES", label: "🇪🇸 Spain" }, { code: "LK", label: "🇱🇰 Sri Lanka" },
  { code: "SE", label: "🇸🇪 Sweden" }, { code: "CH", label: "🇨🇭 Switzerland" },
  { code: "TW", label: "🇹🇼 Taiwan" }, { code: "TZ", label: "🇹🇿 Tanzania" },
  { code: "TH", label: "🇹🇭 Thailand" }, { code: "TN", label: "🇹🇳 Tunisia" },
  { code: "TR", label: "🇹🇷 Turkey" }, { code: "UG", label: "🇺🇬 Uganda" },
  { code: "UA", label: "🇺🇦 Ukraine" }, { code: "AE", label: "🇦🇪 UAE" },
  { code: "GB", label: "🇬🇧 United Kingdom" }, { code: "US", label: "🇺🇸 United States" },
  { code: "UY", label: "🇺🇾 Uruguay" }, { code: "UZ", label: "🇺🇿 Uzbekistan" },
  { code: "VE", label: "🇻🇪 Venezuela" }, { code: "VN", label: "🇻🇳 Vietnam" },
  { code: "YE", label: "🇾🇪 Yemen" }, { code: "ZM", label: "🇿🇲 Zambia" },
  { code: "ZW", label: "🇿🇼 Zimbabwe" },
];
// Keep for history display compatibility
const COUNTRIES = ALL_COUNTRIES;

const POPULAR = [
  { name: "Nike", category: "Fashion", emoji: "\u{1F45F}" },
  { name: "Zara", category: "Fashion", emoji: "\u{1F457}" },
  { name: "eMAG", category: "E-commerce", emoji: "\u{1F6D2}" },
  { name: "Kaufland", category: "Retail", emoji: "\u{1F3EA}" },
  { name: "Lidl", category: "Retail", emoji: "\u{1F3EC}" },
  { name: "Booking.com", category: "Travel", emoji: "\u{2708}\u{FE0F}" },
  { name: "Revolut", category: "Fintech", emoji: "\u{1F4B3}" },
  { name: "Bolt", category: "Transport", emoji: "\u{1F697}" },
  { name: "Coca-Cola", category: "FMCG", emoji: "\u{1F964}" },
  { name: "Samsung", category: "Tech", emoji: "\u{1F4F1}" },
  { name: "Apple", category: "Tech", emoji: "\u{1F34E}" },
  { name: "Glovo", category: "Delivery", emoji: "\u{1F4E6}" },
  { name: "Netflix", category: "Streaming", emoji: "\u{1F3AC}" },
  { name: "Spotify", category: "Music", emoji: "\u{1F3B5}" },
  { name: "McDonald's", category: "Food", emoji: "\u{1F354}" },
  { name: "BMW", category: "Auto", emoji: "\u{1F698}" },
];

const ANALYSIS_TIPS = [
  { icon: <Eye className="w-4 h-4" />, title: "Visual & Format", items: ["What type of creative do they use? (video, carousel, image)", "What colors dominate?", "Do they use text on image or clean video?"] },
  { icon: <Target className="w-4 h-4" />, title: "Message & CTA", items: ["What is the value proposition?", "What call-to-action do they use?", "Do they talk about price or benefits?"] },
  { icon: <BarChart3 className="w-4 h-4" />, title: "Strategy", items: ["How many active ads do they run simultaneously?", "How long have they been running? (longevity = performance)", "Are they A/B testing variants?"] },
];

type SearchEntry = { query: string; country: string; timestamp: number };
type SavedBrand = { name: string; country: string; notes: string; savedAt: number; tags: string[] };

function buildUrl(query: string, country: string) {
  const params = new URLSearchParams({ active_status: "active", ad_type: "all", country, q: query, media_type: "all" });
  return `https://www.facebook.com/ads/library/?${params.toString()}`;
}

function buildPanelUrl(brand: string, ctry: string, adF: string, platF: string) {
  const params = new URLSearchParams({
    active_status: adF === "active" ? "active" : "all",
    ad_type: "all",
    country: ctry,
    q: brand,
    media_type: adF === "video" ? "video" : adF === "image" ? "image" : "all",
  });
  if (platF === "facebook") params.set("publisher_platforms[0]", "facebook");
  if (platF === "instagram") params.set("publisher_platforms[0]", "instagram");
  return `https://www.facebook.com/ads/library/?${params.toString()}`;
}

const CHECKLIST_ITEMS = [
  "What type of creative? (video, carousel, image)",
  "What colors and visual style dominate?",
  "Is there text on image or clean video?",
  "What is the main value proposition?",
  "What call-to-action (CTA) do they use?",
  "Do they focus on price or benefits?",
  "How many active ads run simultaneously?",
  "How long have the ads been running?",
  "Are they A/B testing multiple variants?",
];

export default function AdsLibraryPage() {
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("ALL");
  const [isGlobal, setIsGlobal] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState<{ code: string; label: string } | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [history, setHistory] = useState<SearchEntry[]>([]);
  const [saved, setSaved] = useState<SavedBrand[]>([]);
  const [showTips, setShowTips] = useState(false);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [newTag, setNewTag] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"search" | "saved">("search");
  const [showPanel, setShowPanel] = useState(false);
  const [panelBrand, setPanelBrand] = useState("");
  const [panelCountry, setPanelCountry] = useState("ALL");
  const [adFilter, setAdFilter] = useState<"all" | "video" | "image" | "active">("all");
  const [platformFilter, setPlatformFilter] = useState<"all" | "facebook" | "instagram">("all");
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});

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
    document.body.style.overflow = showPanel ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [showPanel]);

  const handleGlobal = () => {
    setIsGlobal(true);
    setSelectedCountry(null);
    setCountry("ALL");
    setDropdownOpen(false);
  };

  const handleSelectCountry = (c: { code: string; label: string }) => {
    setSelectedCountry(c);
    setIsGlobal(false);
    setCountry(c.code);
    setDropdownOpen(false);
  };

  useEffect(() => {
    const h = localStorage.getItem("mh_ads_history");
    if (h) setHistory(JSON.parse(h));
    const s = localStorage.getItem("mh_ads_saved");
    if (s) setSaved(JSON.parse(s));
  }, []);

  const saveHistory = (entries: SearchEntry[]) => {
    setHistory(entries);
    localStorage.setItem("mh_ads_history", JSON.stringify(entries));
  };

  const saveBrands = (brands: SavedBrand[]) => {
    setSaved(brands);
    localStorage.setItem("mh_ads_saved", JSON.stringify(brands));
  };

  const search = (q?: string, c?: string) => {
    const term = (q || query).trim();
    const ctry = c || country;
    if (!term) return;

    const entry: SearchEntry = { query: term, country: ctry, timestamp: Date.now() };
    const newHistory = [entry, ...history.filter(h => h.query !== term).slice(0, 29)];
    saveHistory(newHistory);

    // Show slide-in analysis panel
    setPanelBrand(term);
    setPanelCountry(ctry);
    setAdFilter("all");
    setPlatformFilter("all");
    setChecklist({});
    setShowPanel(true);
  };

  const openInFacebook = (brand = panelBrand, ctry = panelCountry, adF = adFilter, platF = platformFilter) => {
    const w = Math.min(1000, window.screen.width - 100);
    const h = Math.min(800, window.screen.height - 100);
    const left = window.screen.width - w - 20;
    window.open(buildPanelUrl(brand, ctry, adF, platF), "meta_ads", `width=${w},height=${h},left=${left},top=50,toolbar=no,menubar=no`);
  };

  const isSaved = (name: string) => saved.some(s => s.name === name);

  const toggleSave = (name: string) => {
    if (isSaved(name)) {
      saveBrands(saved.filter(s => s.name !== name));
    } else {
      saveBrands([...saved, { name, country, notes: "", savedAt: Date.now(), tags: [] }]);
    }
  };

  const updateNote = (name: string, notes: string) => {
    saveBrands(saved.map(s => s.name === name ? { ...s, notes } : s));
    setEditingNote(null);
  };

  const addTag = (name: string, tag: string) => {
    if (!tag.trim()) return;
    saveBrands(saved.map(s => s.name === name ? { ...s, tags: [...new Set([...s.tags, tag.trim()])] } : s));
    setNewTag("");
  };

  const removeTag = (name: string, tag: string) => {
    saveBrands(saved.map(s => s.name === name ? { ...s, tags: s.tags.filter(t => t !== tag) } : s));
  };

  const copyLink = (name: string) => {
    navigator.clipboard.writeText(buildUrl(name, country));
    setCopied(name);
    setTimeout(() => setCopied(null), 2000);
  };

  const removeHistory = (q: string) => saveHistory(history.filter(h => h.query !== q));
  const clearHistory = () => saveHistory([]);

  const timeAgo = (ts: number) => {
    const diff = (Date.now() - ts) / 1000;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}z`;
  };

  return (
    <div>
      <Header title="Meta Ads Library" subtitle="Research active ads from any brand on Facebook & Instagram" />
      <div className="p-6 space-y-5">

        {/* Search */}
        <div className="rounded-xl p-5" style={cardStyle}>
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-52">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: META }} />
              <input type="text" placeholder="Search brand, company or keyword..."
                value={query} onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && search()}
                className="w-full pl-9 pr-4 py-3 text-sm rounded-xl focus:outline-none"
                style={{ border: `1px solid ${META}30`, backgroundColor: "#FFF8F0", color: "#292524" }}
                onFocus={e => (e.currentTarget.style.borderColor = META)}
                onBlur={e => (e.currentTarget.style.borderColor = `${META}30`)}
              />
            </div>
            {/* Global Button */}
            <button type="button" onClick={handleGlobal}
              className="flex items-center gap-1.5 px-4 py-3 text-sm font-medium rounded-xl transition-all whitespace-nowrap"
              style={isGlobal ? { backgroundColor: META, color: "white", border: `1px solid ${META}` } : { backgroundColor: "#FFF8F0", color: "#78614E", border: "1px solid rgba(245,215,160,0.3)" }}
            >
              <Globe className="w-4 h-4" /> Global
            </button>

            {/* International Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button type="button" onClick={() => setDropdownOpen(prev => !prev)}
                className="flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-xl transition-all whitespace-nowrap"
                style={!isGlobal ? { backgroundColor: META, color: "white", border: `1px solid ${META}` } : { backgroundColor: "#FFF8F0", color: "#78614E", border: "1px solid rgba(245,215,160,0.3)" }}
              >
                {!isGlobal ? selectedCountry?.label : "🗺️ International"}
                <ChevronDown className={`w-4 h-4 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
              </button>
              {dropdownOpen && (
                <div className="absolute top-full left-0 mt-1 z-50 rounded-xl overflow-hidden overflow-y-auto"
                  style={{ backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.4)", boxShadow: "0 8px 24px rgba(120,97,78,0.15)", maxHeight: "300px", minWidth: "200px" }}
                >
                  {ALL_COUNTRIES.map(c => (
                    <button key={c.code} type="button" onClick={() => handleSelectCountry(c)}
                      className="w-full text-left px-4 py-2.5 text-sm transition-colors"
                      style={{ color: selectedCountry?.code === c.code ? META : "#5C4A35", backgroundColor: selectedCountry?.code === c.code ? `${META}10` : "transparent", fontWeight: selectedCountry?.code === c.code ? "600" : "400" }}
                      onMouseEnter={e => { if (selectedCountry?.code !== c.code) e.currentTarget.style.backgroundColor = "rgba(245,215,160,0.2)"; }}
                      onMouseLeave={e => { if (selectedCountry?.code !== c.code) e.currentTarget.style.backgroundColor = "transparent"; }}
                    >{c.label}</button>
                  ))}
                </div>
              )}
            </div>
            <button type="button" onClick={() => search()} disabled={!query.trim()}
              className="px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 transition-opacity"
              style={{ backgroundColor: META, color: "white", opacity: query.trim() ? 1 : 0.5 }}>
              <ExternalLink className="w-4 h-4" />
              Analyze ads
            </button>
            {query.trim() && (
              <button type="button" onClick={() => toggleSave(query.trim())}
                className="px-3 py-3 rounded-xl transition-colors"
                style={{ border: "1px solid rgba(245,215,160,0.3)", backgroundColor: isSaved(query.trim()) ? "rgba(245,158,11,0.1)" : "#FFF8F0" }}
                title={isSaved(query.trim()) ? "Remove from saved" : "Save brand"}>
                {isSaved(query.trim())
                  ? <BookmarkCheck className="w-4 h-4" style={{ color: "#F59E0B" }} />
                  : <Bookmark className="w-4 h-4" style={{ color: "#C4AA8A" }} />}
              </button>
            )}
          </div>
        </div>

        {/* Tabs: Search / Saved */}
        <div className="flex gap-2">
          {[
            { key: "search" as const, label: "Search", icon: <Search className="w-3.5 h-3.5" /> },
            { key: "saved" as const, label: `Saved (${saved.length})`, icon: <Bookmark className="w-3.5 h-3.5" /> },
          ].map(tab => (
            <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
              style={activeTab === tab.key ? {
                backgroundColor: `${META}12`, color: META, border: `1px solid ${META}30`,
              } : {
                backgroundColor: "#FFFCF7", color: "#78614E", border: "1px solid rgba(245,215,160,0.25)",
              }}>
              {tab.icon}{tab.label}
            </button>
          ))}
          <button type="button" onClick={() => setShowTips(!showTips)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ml-auto"
            style={{ backgroundColor: showTips ? "rgba(245,158,11,0.12)" : "#FFFCF7", color: showTips ? "#D97706" : "#78614E", border: `1px solid ${showTips ? "rgba(245,158,11,0.3)" : "rgba(245,215,160,0.25)"}` }}>
            <Lightbulb className="w-3.5 h-3.5" />
            Analysis guide
          </button>
        </div>

        {/* Analysis Tips */}
        {showTips && (
          <div className="rounded-xl p-5" style={cardStyle}>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4" style={{ color: "#F59E0B" }} />
              <h3 className="font-semibold" style={{ color: "#292524" }}>How to analyze competitor ads</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {ANALYSIS_TIPS.map((tip, i) => (
                <div key={i} className="rounded-lg p-4" style={{ backgroundColor: "rgba(24,119,242,0.04)", border: `1px solid ${META}12` }}>
                  <div className="flex items-center gap-1.5 mb-3" style={{ color: META }}>
                    {tip.icon}
                    <p className="text-sm font-bold">{tip.title}</p>
                  </div>
                  <ul className="space-y-1.5">
                    {tip.items.map((item, j) => (
                      <li key={j} className="text-xs leading-relaxed flex items-start gap-1.5" style={{ color: "#78614E" }}>
                        <span className="mt-1 w-1 h-1 rounded-full flex-shrink-0" style={{ backgroundColor: META }} />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab: Search */}
        {activeTab === "search" && (
          <>
            {/* Popular Brands */}
            <div className="rounded-xl p-5" style={cardStyle}>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4" style={{ color: META }} />
                <h3 className="font-semibold" style={{ color: "#292524" }}>Popular brands</h3>
                <span className="text-xs" style={{ color: "#A8967E" }}>— click to analyze active ads</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {POPULAR.map(brand => (
                  <div key={brand.name} className="flex items-center gap-2 group">
                    <button type="button"
                      onClick={() => { setQuery(brand.name); search(brand.name); }}
                      className="flex-1 flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all hover:scale-[1.02]"
                      style={{ backgroundColor: "rgba(24,119,242,0.04)", border: "1px solid rgba(24,119,242,0.1)" }}
                      onMouseEnter={e => { e.currentTarget.style.backgroundColor = "rgba(24,119,242,0.1)"; e.currentTarget.style.borderColor = META; }}
                      onMouseLeave={e => { e.currentTarget.style.backgroundColor = "rgba(24,119,242,0.04)"; e.currentTarget.style.borderColor = "rgba(24,119,242,0.1)"; }}>
                      <span className="text-lg">{brand.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: "#292524" }}>{brand.name}</p>
                        <p className="text-xs" style={{ color: "#A8967E" }}>{brand.category}</p>
                      </div>
                      <ExternalLink className="w-3 h-3 flex-shrink-0" style={{ color: "#C4AA8A" }} />
                    </button>
                    <button type="button" onClick={() => toggleSave(brand.name)}
                      className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: isSaved(brand.name) ? "#F59E0B" : "#C4AA8A" }}>
                      {isSaved(brand.name) ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Search History */}
            {history.length > 0 && (
              <div className="rounded-xl p-5" style={cardStyle}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" style={{ color: "#F59E0B" }} />
                    <h3 className="font-semibold" style={{ color: "#292524" }}>Recent searches</h3>
                    <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "rgba(245,158,11,0.1)", color: "#D97706" }}>{history.length}</span>
                  </div>
                  <button type="button" onClick={clearHistory}
                    className="text-xs font-semibold px-2 py-1 rounded-lg"
                    style={{ color: "#A8967E", backgroundColor: "rgba(245,215,160,0.1)" }}>
                    Clear all
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {history.slice(0, 20).map(h => {
                    const ctry = COUNTRIES.find(c => c.code === h.country);
                    return (
                      <div key={h.query + h.timestamp} className="flex items-center gap-1 group">
                        <button type="button" onClick={() => { setQuery(h.query); setCountry(h.country); search(h.query, h.country); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors"
                          style={{ backgroundColor: `${META}08`, color: "#292524", border: `1px solid ${META}15` }}
                          onMouseEnter={e => { e.currentTarget.style.backgroundColor = `${META}18`; e.currentTarget.style.borderColor = META; }}
                          onMouseLeave={e => { e.currentTarget.style.backgroundColor = `${META}08`; e.currentTarget.style.borderColor = `${META}15`; }}>
                          <span className="text-xs">{ctry?.label.split(" ")[0]}</span>
                          <span className="font-medium">{h.query}</span>
                          <span className="text-xs" style={{ color: "#A8967E" }}>{timeAgo(h.timestamp)}</span>
                        </button>
                        <button type="button" onClick={() => copyLink(h.query)}
                          className="opacity-0 group-hover:opacity-100 p-0.5 rounded transition-opacity" style={{ color: "#A8967E" }}
                          title="Copy Ad Library link">
                          {copied === h.query ? <Check className="w-3 h-3" style={{ color: "#22C55E" }} /> : <Copy className="w-3 h-3" />}
                        </button>
                        <button type="button" onClick={() => removeHistory(h.query)}
                          className="opacity-0 group-hover:opacity-100 p-0.5 rounded transition-opacity" style={{ color: "#EF4444" }}>
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* How it works */}
            <div className="rounded-xl p-5" style={cardStyle}>
              <div className="flex items-center gap-2 mb-3">
                <Facebook className="w-4 h-4" style={{ color: META }} />
                <h3 className="font-semibold" style={{ color: "#292524" }}>How it works</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { title: "1. Search a brand", text: "Enter the brand name or a keyword. Select a country for locally targeted ads.", icon: <Search className="w-4 h-4" /> },
                  { title: "2. Analyze ads", text: "Opens Meta Ad Library with all active ads: text, images, video, start dates.", icon: <Instagram className="w-4 h-4" /> },
                  { title: "3. Save & compare", text: "Save brands, add notes and tags. Build a database with insights.", icon: <Globe2 className="w-4 h-4" /> },
                ].map((step, i) => (
                  <div key={i} className="rounded-lg p-3" style={{ backgroundColor: `${META}06`, border: `1px solid ${META}12` }}>
                    <div className="flex items-center gap-1.5 mb-1.5" style={{ color: META }}>{step.icon}<p className="text-xs font-bold">{step.title}</p></div>
                    <p className="text-xs leading-relaxed" style={{ color: "#78614E" }}>{step.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Tab: Saved Brands */}
        {activeTab === "saved" && (
          <>
            {saved.length === 0 ? (
              <div className="rounded-xl p-8 text-center" style={cardStyle}>
                <Bookmark className="w-8 h-8 mx-auto mb-3" style={{ color: "#C4AA8A" }} />
                <p className="text-sm font-semibold" style={{ color: "#292524" }}>No saved brands</p>
                <p className="text-xs mt-1" style={{ color: "#A8967E" }}>Search a brand and click the bookmark icon to save it</p>
              </div>
            ) : (
              <div className="space-y-3">
                {saved.map(brand => {
                  const isEditing = editingNote === brand.name;
                  return (
                    <div key={brand.name} className="rounded-xl overflow-hidden" style={cardStyle}>
                      <div className="flex items-center gap-3 px-5 py-4">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: META }}>
                          {brand.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold" style={{ color: "#292524" }}>{brand.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs" style={{ color: "#A8967E" }}>
                              Saved {timeAgo(brand.savedAt)} ago
                            </span>
                            {brand.tags.map(tag => (
                              <span key={tag} className="flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full"
                                style={{ backgroundColor: `${META}10`, color: META }}>
                                {tag}
                                <button type="button" onClick={() => removeTag(brand.name, tag)} className="ml-0.5 hover:opacity-70">
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              </span>
                            ))}
                            <div className="flex items-center gap-1">
                              <input type="text" placeholder="+ tag" value={editingNote === brand.name + "_tag" ? newTag : ""}
                                onChange={e => { setEditingNote(brand.name + "_tag"); setNewTag(e.target.value); }}
                                onKeyDown={e => { if (e.key === "Enter") { addTag(brand.name, newTag); setEditingNote(null); } }}
                                className="w-14 text-xs px-1.5 py-0.5 rounded border-0 focus:outline-none"
                                style={{ backgroundColor: "transparent", color: "#A8967E" }} />
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button type="button" onClick={() => copyLink(brand.name)}
                            className="p-2 rounded-lg transition-colors" style={{ color: "#A8967E" }}
                            title="Copy Ad Library link">
                            {copied === brand.name ? <Check className="w-4 h-4" style={{ color: "#22C55E" }} /> : <Copy className="w-4 h-4" />}
                          </button>
                          <button type="button" onClick={() => search(brand.name, brand.country)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold"
                            style={{ backgroundColor: META, color: "white" }}>
                            <ExternalLink className="w-3 h-3" />
                            Analyze
                          </button>
                          <button type="button" onClick={() => toggleSave(brand.name)}
                            className="p-2 rounded-lg transition-colors" style={{ color: "#EF4444" }}
                            title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Notes section */}
                      <div className="px-5 py-3" style={{ backgroundColor: "rgba(245,215,160,0.04)", borderTop: "1px solid rgba(245,215,160,0.12)" }}>
                        {isEditing ? (
                          <div className="flex gap-2">
                            <textarea value={noteText} onChange={e => setNoteText(e.target.value)}
                              placeholder="Write notes about this brand's ads..."
                              className="flex-1 text-xs p-2 rounded-lg resize-none focus:outline-none"
                              style={{ border: `1px solid ${META}30`, backgroundColor: "#FFF8F0", color: "#292524", minHeight: "60px" }}
                              autoFocus />
                            <div className="flex flex-col gap-1">
                              <button type="button" onClick={() => updateNote(brand.name, noteText)}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                                style={{ backgroundColor: META, color: "white" }}>
                                Save
                              </button>
                              <button type="button" onClick={() => setEditingNote(null)}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                                style={{ color: "#A8967E" }}>
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button type="button"
                            onClick={() => { setEditingNote(brand.name); setNoteText(brand.notes); }}
                            className="flex items-center gap-1.5 text-xs w-full text-left"
                            style={{ color: brand.notes ? "#78614E" : "#C4AA8A" }}>
                            <StickyNote className="w-3 h-3 flex-shrink-0" />
                            {brand.notes || "Add notes and observations..."}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Slide-in Analysis Panel ── */}
      {showPanel && (
        <>
          <style>{`
            @keyframes slideInRight {
              from { transform: translateX(100%); opacity: 0; }
              to   { transform: translateX(0);    opacity: 1; }
            }
          `}</style>

          {/* Overlay */}
          <div
            className="fixed inset-0 z-40"
            style={{ backgroundColor: "rgba(0,0,0,0.35)", backdropFilter: "blur(2px)" }}
            onClick={() => setShowPanel(false)}
          />

          {/* Panel */}
          <div
            className="fixed right-0 top-0 h-full z-50 flex flex-col"
            style={{
              width: "min(500px, 100vw)",
              backgroundColor: "#FFFCF7",
              borderLeft: "1px solid rgba(245,215,160,0.4)",
              boxShadow: "-12px 0 40px rgba(120,97,78,0.18)",
              animation: "slideInRight 0.22s ease-out",
            }}
          >
            {/* Panel Header */}
            <div className="flex items-center gap-3 px-5 py-4 flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${META} 0%, #1a6fd8 100%)`, borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
              <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0"
                style={{ backgroundColor: "rgba(255,255,255,0.2)", backdropFilter: "blur(4px)" }}>
                {panelBrand.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white text-base truncate">{panelBrand}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs" style={{ color: "rgba(255,255,255,0.8)" }}>
                    {panelCountry === "ALL" ? "🌍 Global" : ALL_COUNTRIES.find(c => c.code === panelCountry)?.label ?? panelCountry}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ backgroundColor: "rgba(255,255,255,0.2)", color: "white" }}>
                    Ads Analysis
                  </span>
                </div>
              </div>
              <button type="button" onClick={() => setShowPanel(false)}
                className="p-2 rounded-lg transition-colors flex-shrink-0"
                style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.25)")}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.15)")}>
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">

              {/* Ad Type + Platform Filters */}
              <div className="rounded-xl p-4 space-y-3" style={cardStyle}>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: "#A8967E" }}>Ad Type</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {(["all", "video", "image", "active"] as const).map(f => (
                      <button key={f} type="button" onClick={() => setAdFilter(f)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                        style={adFilter === f
                          ? { backgroundColor: META, color: "white", border: `1px solid ${META}` }
                          : { backgroundColor: `${META}08`, color: "#5C4A35", border: `1px solid ${META}20` }}>
                        {f === "all" ? "🗂 All types" : f === "active" ? "⚡ Active only" : f === "video" ? "🎬 Video" : "🖼️ Image"}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: "#A8967E" }}>Platform</p>
                  <div className="flex gap-1.5">
                    {(["all", "facebook", "instagram"] as const).map(p => (
                      <button key={p} type="button" onClick={() => setPlatformFilter(p)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                        style={platformFilter === p
                          ? { backgroundColor: META, color: "white", border: `1px solid ${META}` }
                          : { backgroundColor: `${META}08`, color: "#5C4A35", border: `1px solid ${META}20` }}>
                        {p === "facebook" && <Facebook className="w-3 h-3" />}
                        {p === "instagram" && <Instagram className="w-3 h-3" />}
                        {p === "all" ? "All platforms" : p.charAt(0).toUpperCase() + p.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Mini Browser Preview */}
              <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${META}25` }}>
                {/* Browser chrome */}
                <div className="flex items-center gap-2 px-3 py-2.5 flex-shrink-0"
                  style={{ backgroundColor: META }}>
                  <div className="flex gap-1.5 flex-shrink-0">
                    {["rgba(255,255,255,0.4)", "rgba(255,255,255,0.4)", "rgba(255,255,255,0.4)"].map((bg, i) => (
                      <div key={i} className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: bg }} />
                    ))}
                  </div>
                  <div className="flex-1 mx-2 rounded px-3 py-1 text-xs truncate"
                    style={{ backgroundColor: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.9)" }}>
                    facebook.com/ads/library · {panelBrand}
                    {adFilter !== "all" ? ` · ${adFilter}` : ""}
                    {platformFilter !== "all" ? ` · ${platformFilter}` : ""}
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "rgba(255,255,255,0.7)" }} />
                </div>
                {/* Preview body */}
                <div className="px-6 py-8 text-center space-y-4" style={{ backgroundColor: `${META}04` }}>
                  <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center"
                    style={{ background: `linear-gradient(135deg, ${META} 0%, #1a6fd8 100%)` }}>
                    <Facebook className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-sm" style={{ color: "#292524" }}>Results for &ldquo;{panelBrand}&rdquo;</p>
                    <p className="text-xs mt-1.5 leading-relaxed" style={{ color: "#A8967E" }}>
                      Facebook blocks embedded previews for security reasons.<br />
                      Click below to open the results directly.
                    </p>
                  </div>
                  <button type="button" onClick={() => openInFacebook()}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all hover:opacity-90 hover:scale-[1.02]"
                    style={{ background: `linear-gradient(135deg, ${META} 0%, #1a6fd8 100%)`, color: "white", boxShadow: `0 4px 14px ${META}40` }}>
                    <ExternalLink className="w-4 h-4" />
                    Open Facebook Ads Library
                  </button>
                </div>
              </div>

              {/* Analysis Checklist */}
              <div className="rounded-xl p-4" style={cardStyle}>
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-4 h-4" style={{ color: "#F59E0B" }} />
                  <p className="font-semibold text-sm" style={{ color: "#292524" }}>Analysis Checklist</p>
                  <span className="text-xs ml-auto font-medium"
                    style={{ color: Object.values(checklist).filter(Boolean).length === CHECKLIST_ITEMS.length ? "#16A34A" : "#A8967E" }}>
                    {Object.values(checklist).filter(Boolean).length}/{CHECKLIST_ITEMS.length} done
                  </span>
                </div>
                <div className="space-y-2">
                  {CHECKLIST_ITEMS.map((item, i) => (
                    <label key={i} className="flex items-start gap-2.5 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={!!checklist[item]}
                        onChange={e => setChecklist(prev => ({ ...prev, [item]: e.target.checked }))}
                        className="mt-0.5 w-3.5 h-3.5 rounded flex-shrink-0"
                        style={{ accentColor: META }}
                      />
                      <span className="text-xs leading-relaxed select-none"
                        style={{ color: checklist[item] ? "#A8967E" : "#5C4A35", textDecoration: checklist[item] ? "line-through" : "none" }}>
                        {item}
                      </span>
                    </label>
                  ))}
                </div>
                {Object.values(checklist).filter(Boolean).length === CHECKLIST_ITEMS.length && (
                  <div className="mt-3 rounded-lg p-2.5 text-center"
                    style={{ backgroundColor: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
                    <p className="text-xs font-bold" style={{ color: "#16A34A" }}>✅ Analysis complete!</p>
                  </div>
                )}
              </div>

              {/* Quick Access Links */}
              <div className="rounded-xl p-4" style={cardStyle}>
                <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: "#A8967E" }}>Quick Access Links</p>
                <div className="space-y-1.5">
                  {[
                    { label: "All active ads (Global)", url: buildUrl(panelBrand, "ALL"), icon: <Globe className="w-3.5 h-3.5" /> },
                    { label: "Facebook only", url: buildPanelUrl(panelBrand, panelCountry, adFilter, "facebook"), icon: <Facebook className="w-3.5 h-3.5" /> },
                    { label: "Instagram only", url: buildPanelUrl(panelBrand, panelCountry, adFilter, "instagram"), icon: <Instagram className="w-3.5 h-3.5" /> },
                    { label: "Video ads only", url: buildPanelUrl(panelBrand, panelCountry, "video", platformFilter), icon: <Film className="w-3.5 h-3.5" /> },
                    ...(panelCountry !== "ALL"
                      ? [{ label: `${ALL_COUNTRIES.find(c => c.code === panelCountry)?.label ?? panelCountry}`, url: buildUrl(panelBrand, panelCountry), icon: <Globe2 className="w-3.5 h-3.5" /> }]
                      : []
                    ),
                  ].map((link, i) => (
                    <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors group"
                      style={{ color: META, backgroundColor: `${META}06`, border: `1px solid ${META}12` }}
                      onMouseEnter={e => { e.currentTarget.style.backgroundColor = `${META}16`; e.currentTarget.style.borderColor = `${META}30`; }}
                      onMouseLeave={e => { e.currentTarget.style.backgroundColor = `${META}06`; e.currentTarget.style.borderColor = `${META}12`; }}>
                      {link.icon}
                      <span className="flex-1">{link.label}</span>
                      <ExternalLink className="w-2.5 h-2.5 opacity-50" />
                    </a>
                  ))}
                </div>
              </div>

            </div>

            {/* Footer Action Bar */}
            <div className="p-4 flex gap-2 flex-shrink-0"
              style={{ borderTop: "1px solid rgba(245,215,160,0.2)", backgroundColor: "#FFFCF7" }}>
              <button type="button" onClick={() => openInFacebook()}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all hover:opacity-90"
                style={{ background: `linear-gradient(135deg, ${META} 0%, #1a6fd8 100%)`, color: "white", boxShadow: `0 3px 12px ${META}35` }}>
                <Facebook className="w-4 h-4" />
                Open Ads Library
              </button>
              <button type="button" onClick={() => copyLink(panelBrand)}
                className="px-4 py-3 rounded-xl text-sm font-semibold transition-colors"
                style={{ border: `1px solid ${META}30`, color: META, backgroundColor: `${META}08` }}
                title="Copy link">
                {copied === panelBrand
                  ? <Check className="w-4 h-4" style={{ color: "#22C55E" }} />
                  : <Copy className="w-4 h-4" />}
              </button>
              <button type="button" onClick={() => toggleSave(panelBrand)}
                className="px-4 py-3 rounded-xl text-sm font-semibold transition-colors"
                style={{
                  border: "1px solid rgba(245,215,160,0.3)",
                  color: isSaved(panelBrand) ? "#F59E0B" : "#C4AA8A",
                  backgroundColor: isSaved(panelBrand) ? "rgba(245,158,11,0.08)" : "#FFF8F0",
                }}
                title={isSaved(panelBrand) ? "Saved" : "Save brand"}>
                {isSaved(panelBrand) ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
