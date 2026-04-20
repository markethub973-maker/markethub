"use client";

import { useState, useEffect, useRef } from "react";
import Header from "@/components/layout/Header";
import {
  Search, Clock, Trash2, Facebook, Instagram, Globe2,
  TrendingUp, Bookmark, BookmarkCheck, ChevronDown,
  Check, Sparkles, Target, Eye, BarChart3, Lightbulb,
  Globe, Loader2, MessageCircle, AlertCircle
} from "lucide-react";

const cardStyle = { backgroundColor: "var(--color-bg-secondary)", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" };
const META = "#1877F2";

const ALL_COUNTRIES = [
  { code: "ALL", label: "All Countries" },
  { code: "RO", label: "Romania" }, { code: "US", label: "United States" },
  { code: "GB", label: "United Kingdom" }, { code: "DE", label: "Germany" },
  { code: "FR", label: "France" }, { code: "ES", label: "Spain" },
  { code: "IT", label: "Italy" }, { code: "NL", label: "Netherlands" },
  { code: "BE", label: "Belgium" }, { code: "AT", label: "Austria" },
  { code: "CH", label: "Switzerland" }, { code: "PL", label: "Poland" },
  { code: "CZ", label: "Czech Republic" }, { code: "PT", label: "Portugal" },
  { code: "SE", label: "Sweden" }, { code: "NO", label: "Norway" },
  { code: "DK", label: "Denmark" }, { code: "FI", label: "Finland" },
  { code: "IE", label: "Ireland" }, { code: "HU", label: "Hungary" },
  { code: "BG", label: "Bulgaria" }, { code: "HR", label: "Croatia" },
  { code: "GR", label: "Greece" }, { code: "SK", label: "Slovakia" },
  { code: "SI", label: "Slovenia" }, { code: "LT", label: "Lithuania" },
  { code: "LV", label: "Latvia" }, { code: "EE", label: "Estonia" },
  { code: "CA", label: "Canada" }, { code: "AU", label: "Australia" },
  { code: "NZ", label: "New Zealand" }, { code: "BR", label: "Brazil" },
  { code: "MX", label: "Mexico" }, { code: "AR", label: "Argentina" },
  { code: "IN", label: "India" }, { code: "JP", label: "Japan" },
  { code: "KR", label: "South Korea" }, { code: "SG", label: "Singapore" },
  { code: "AE", label: "UAE" }, { code: "SA", label: "Saudi Arabia" },
  { code: "ZA", label: "South Africa" }, { code: "NG", label: "Nigeria" },
  { code: "EG", label: "Egypt" }, { code: "TR", label: "Turkey" },
  { code: "IL", label: "Israel" }, { code: "TH", label: "Thailand" },
  { code: "PH", label: "Philippines" }, { code: "ID", label: "Indonesia" },
  { code: "MY", label: "Malaysia" }, { code: "VN", label: "Vietnam" },
  { code: "CO", label: "Colombia" }, { code: "CL", label: "Chile" },
];

const POPULAR = [
  { name: "Nike", category: "Fashion" },
  { name: "Zara", category: "Fashion" },
  { name: "eMAG", category: "E-commerce" },
  { name: "Kaufland", category: "Retail" },
  { name: "Revolut", category: "Fintech" },
  { name: "Bolt", category: "Transport" },
  { name: "Coca-Cola", category: "FMCG" },
  { name: "Samsung", category: "Tech" },
  { name: "Netflix", category: "Streaming" },
  { name: "Spotify", category: "Music" },
  { name: "McDonald's", category: "Food" },
  { name: "BMW", category: "Auto" },
];

const ANALYSIS_TIPS = [
  { icon: <Eye className="w-4 h-4" />, title: "Visual & Format", items: ["What type of creative do they use? (video, carousel, image)", "What colors dominate?", "Do they use text on image or clean video?"] },
  { icon: <Target className="w-4 h-4" />, title: "Message & CTA", items: ["What is the value proposition?", "What call-to-action do they use?", "Do they talk about price or benefits?"] },
  { icon: <BarChart3 className="w-4 h-4" />, title: "Strategy", items: ["How many active ads do they run simultaneously?", "How long have they been running? (longevity = performance)", "Are they A/B testing variants?"] },
];

interface Ad {
  id: string;
  page_name: string;
  ad_creative_bodies?: string[];
  ad_creative_link_titles?: string[];
  ad_delivery_start_time?: string | null;
  ad_delivery_stop_time?: string | null;
  publisher_platforms?: string[];
  impressions?: { lower_bound?: string; upper_bound?: string } | null;
  spend?: { lower_bound?: string; upper_bound?: string } | null;
  currency?: string;
  ad_snapshot_url?: string;
  _serper_link?: string;
}

interface SavedAd {
  id: string;
  page_name: string;
  creative_text: string;
  platform: string;
  country: string;
  ad_data: any;
  created_at: string;
}

export default function AdsLibraryPage() {
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("ALL");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<"search" | "saved">("search");
  const [showTips, setShowTips] = useState(false);

  // Search state
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [source, setSource] = useState<string>("");
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  // Saved state
  const [savedAds, setSavedAds] = useState<SavedAd[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

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

  // Load saved ads on mount and tab switch
  useEffect(() => {
    if (activeTab === "saved") {
      fetchSavedAds();
    }
  }, [activeTab]);

  const fetchSavedAds = async () => {
    setLoadingSaved(true);
    try {
      const res = await fetch("/api/ads-library/saved");
      const data = await res.json();
      if (data.saved) setSavedAds(data.saved);
    } catch {
      // silently fail
    }
    setLoadingSaved(false);
  };

  const searchAds = async (q?: string, c?: string, cursor?: string | null) => {
    const term = (q || query).trim();
    const ctry = c || country;
    if (!term) return;

    setLoading(true);
    setError("");
    setSearched(true);

    if (!cursor) {
      setAds([]);
      setNextCursor(null);
      setHasMore(false);
    }

    try {
      const params = new URLSearchParams({ q: term, country: ctry });
      if (cursor) params.set("cursor", cursor);

      const res = await fetch(`/api/ads-library?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      if (cursor) {
        setAds(prev => [...prev, ...(data.ads || [])]);
      } else {
        setAds(data.ads || []);
      }
      setSource(data.source || "");
      setHasMore(data.hasMore || false);
      setNextCursor(data.nextCursor || null);
    } catch {
      setError("Network error. Please check your connection and try again.");
    }
    setLoading(false);
  };

  const saveAd = async (ad: Ad) => {
    setSavingId(ad.id);
    try {
      await fetch("/api/ads-library/saved", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page_name: ad.page_name,
          creative_text: ad.ad_creative_bodies?.[0] || "",
          platform: ad.publisher_platforms?.[0] || "facebook",
          country,
          ad_data: ad,
        }),
      });
      // Refresh saved ads count
      fetchSavedAds();
    } catch {
      // silently fail
    }
    setSavingId(null);
  };

  const deleteSavedAd = async (id: string) => {
    setSavedAds(prev => prev.filter(a => a.id !== id));
    try {
      await fetch("/api/ads-library/saved", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch {
      fetchSavedAds(); // re-fetch on error
    }
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "Unknown";
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const isActive = (ad: Ad) => !ad.ad_delivery_stop_time;

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case "facebook": return <Facebook className="w-3 h-3" />;
      case "instagram": return <Instagram className="w-3 h-3" />;
      case "messenger": return <MessageCircle className="w-3 h-3" />;
      default: return <Globe2 className="w-3 h-3" />;
    }
  };

  return (
    <div>
      <Header title="Ads Library" subtitle="Research active ads from any brand on Facebook & Instagram" />
      <div className="p-4 md:p-6 space-y-5">

        {/* Search Bar */}
        <div className="rounded-xl p-4 md:p-5" style={cardStyle}>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: META }} />
              <input
                type="text"
                placeholder="Search brand, company or keyword..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && searchAds()}
                className="w-full pl-9 pr-4 py-3 text-sm rounded-xl focus:outline-none"
                style={{ border: `1px solid ${META}30`, backgroundColor: "var(--color-bg)", color: "var(--color-text)" }}
              />
            </div>

            {/* Country Select */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen(prev => !prev)}
                className="flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-xl transition-all whitespace-nowrap w-full sm:w-auto justify-between"
                style={{ backgroundColor: "var(--color-bg)", color: "#78614E", border: "1px solid rgba(245,215,160,0.3)" }}
              >
                {ALL_COUNTRIES.find(c => c.code === country)?.label || "All Countries"}
                <ChevronDown className={`w-4 h-4 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
              </button>
              {dropdownOpen && (
                <div
                  className="absolute top-full left-0 mt-1 z-50 rounded-xl overflow-hidden overflow-y-auto w-full sm:w-auto"
                  style={{ backgroundColor: "var(--color-bg-secondary)", border: "1px solid rgba(245,215,160,0.4)", boxShadow: "0 8px 24px rgba(120,97,78,0.15)", maxHeight: "300px", minWidth: "200px" }}
                >
                  {ALL_COUNTRIES.map(c => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => { setCountry(c.code); setDropdownOpen(false); }}
                      className="w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-amber-50"
                      style={{ color: country === c.code ? META : "#5C4A35", fontWeight: country === c.code ? "600" : "400" }}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Search Button */}
            <button
              type="button"
              onClick={() => searchAds()}
              disabled={!query.trim() || loading}
              className="btn-3d-active px-6 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all w-full sm:w-auto"
              style={{ backgroundColor: META, color: "white", opacity: query.trim() ? 1 : 0.5 }}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Search
            </button>
          </div>

          {/* Popular quick searches */}
          <div className="flex flex-wrap gap-2 mt-3">
            {POPULAR.slice(0, 8).map(brand => (
              <button
                key={brand.name}
                type="button"
                onClick={() => { setQuery(brand.name); searchAds(brand.name); }}
                className="btn-pill px-3 py-1.5 text-xs rounded-full transition-all hover:scale-105"
                style={{ backgroundColor: "rgba(24,119,242,0.06)", color: "#5C4A35", border: "1px solid rgba(24,119,242,0.12)" }}
              >
                {brand.name}
              </button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 flex-wrap">
          {[
            { key: "search" as const, label: "Search Results", icon: <Search className="w-3.5 h-3.5" /> },
            { key: "saved" as const, label: `Saved (${savedAds.length})`, icon: <Bookmark className="w-3.5 h-3.5" /> },
          ].map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
              style={activeTab === tab.key ? {
                backgroundColor: `${META}12`, color: META, border: `1px solid ${META}30`,
              } : {
                backgroundColor: "var(--color-bg-secondary)", color: "#78614E", border: "1px solid rgba(245,215,160,0.25)",
              }}
            >
              {tab.icon}{tab.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowTips(!showTips)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ml-auto"
            style={{ backgroundColor: showTips ? "rgba(245,158,11,0.12)" : "var(--color-bg-secondary)", color: showTips ? "var(--color-primary-hover)" : "#78614E", border: `1px solid ${showTips ? "rgba(245,158,11,0.3)" : "rgba(245,215,160,0.25)"}` }}
          >
            <Lightbulb className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Analysis Guide</span>
          </button>
        </div>

        {/* Analysis Tips */}
        {showTips && (
          <div className="rounded-xl p-5" style={cardStyle}>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4" style={{ color: "var(--color-primary)" }} />
              <h3 className="font-semibold" style={{ color: "var(--color-text)" }}>How to analyze competitor ads</h3>
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

        {/* Tab: Search Results */}
        {activeTab === "search" && (
          <>
            {/* Error message */}
            {error && (
              <div className="rounded-xl p-4 flex items-start gap-3" style={{ backgroundColor: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#EF4444" }} />
                <div>
                  <p className="text-sm font-semibold" style={{ color: "#DC2626" }}>Search Error</p>
                  <p className="text-xs mt-0.5" style={{ color: "#78614E" }}>{error}</p>
                </div>
              </div>
            )}

            {/* Source indicator */}
            {source === "serper" && ads.length > 0 && (
              <div className="rounded-lg px-3 py-2 text-xs" style={{ backgroundColor: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", color: "#92400E" }}>
                Results from web search (Facebook API permissions pending). Some data may be limited.
              </div>
            )}

            {/* Loading state */}
            {loading && ads.length === 0 && (
              <div className="rounded-xl p-12 text-center" style={cardStyle}>
                <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin" style={{ color: META }} />
                <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>Searching ads...</p>
                <p className="text-xs mt-1" style={{ color: "#A8967E" }}>Fetching results from the Ad Library</p>
              </div>
            )}

            {/* No results */}
            {searched && !loading && ads.length === 0 && !error && (
              <div className="rounded-xl p-12 text-center" style={cardStyle}>
                <Search className="w-8 h-8 mx-auto mb-3" style={{ color: "#C4AA8A" }} />
                <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>No ads found</p>
                <p className="text-xs mt-1" style={{ color: "#A8967E" }}>Try a different keyword or country</p>
              </div>
            )}

            {/* Results Grid */}
            {ads.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {ads.map(ad => (
                  <AdCard
                    key={ad.id}
                    ad={ad}
                    onSave={() => saveAd(ad)}
                    saving={savingId === ad.id}
                    formatDate={formatDate}
                    isActive={isActive(ad)}
                    getPlatformIcon={getPlatformIcon}
                  />
                ))}
              </div>
            )}

            {/* Load more */}
            {hasMore && nextCursor && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => searchAds(query, country, nextCursor)}
                  disabled={loading}
                  className="px-6 py-3 rounded-xl text-sm font-semibold transition-all"
                  style={{ backgroundColor: "rgba(24,119,242,0.08)", color: META, border: `1px solid ${META}20` }}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : null}
                  Load more ads
                </button>
              </div>
            )}

            {/* Empty state - before search */}
            {!searched && (
              <>
                {/* Popular Brands */}
                <div className="rounded-xl p-5" style={cardStyle}>
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-4 h-4" style={{ color: META }} />
                    <h3 className="font-semibold" style={{ color: "var(--color-text)" }}>Popular brands to research</h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {POPULAR.map(brand => (
                      <button
                        key={brand.name}
                        type="button"
                        onClick={() => { setQuery(brand.name); searchAds(brand.name); }}
                        className="flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all hover:scale-[1.02]"
                        style={{ backgroundColor: "rgba(24,119,242,0.04)", border: "1px solid rgba(24,119,242,0.1)" }}
                      >
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: META }}>
                          {brand.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: "var(--color-text)" }}>{brand.name}</p>
                          <p className="text-xs" style={{ color: "#A8967E" }}>{brand.category}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* How it works */}
                <div className="rounded-xl p-5" style={cardStyle}>
                  <div className="flex items-center gap-2 mb-3">
                    <Facebook className="w-4 h-4" style={{ color: META }} />
                    <h3 className="font-semibold" style={{ color: "var(--color-text)" }}>How it works</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[
                      { title: "1. Search a brand", text: "Enter the brand name or a keyword. Select a country for locally targeted ads.", icon: <Search className="w-4 h-4" /> },
                      { title: "2. Browse ads in-app", text: "See all active ads with creative text, platforms, run dates, and status.", icon: <Eye className="w-4 h-4" /> },
                      { title: "3. Save favorites", text: "Bookmark ads you like. Build a competitive intelligence library.", icon: <Bookmark className="w-4 h-4" /> },
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
          </>
        )}

        {/* Tab: Saved Ads */}
        {activeTab === "saved" && (
          <>
            {loadingSaved && (
              <div className="rounded-xl p-12 text-center" style={cardStyle}>
                <Loader2 className="w-6 h-6 mx-auto mb-3 animate-spin" style={{ color: META }} />
                <p className="text-sm" style={{ color: "#A8967E" }}>Loading saved ads...</p>
              </div>
            )}

            {!loadingSaved && savedAds.length === 0 && (
              <div className="rounded-xl p-12 text-center" style={cardStyle}>
                <Bookmark className="w-8 h-8 mx-auto mb-3" style={{ color: "#C4AA8A" }} />
                <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>No saved ads yet</p>
                <p className="text-xs mt-1" style={{ color: "#A8967E" }}>Search for ads and click the bookmark icon to save them here</p>
              </div>
            )}

            {!loadingSaved && savedAds.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {savedAds.map(saved => (
                  <div key={saved.id} className="rounded-xl overflow-hidden" style={cardStyle}>
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: META }}>
                            {saved.page_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>{saved.page_name}</p>
                            <p className="text-xs" style={{ color: "#A8967E" }}>{saved.platform} - {saved.country}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteSavedAd(saved.id)}
                          className="p-1.5 rounded-lg transition-colors hover:bg-red-50"
                          style={{ color: "#EF4444" }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      {saved.creative_text && (
                        <p className="text-xs leading-relaxed line-clamp-4 mt-2" style={{ color: "#5C4A35" }}>
                          {saved.creative_text}
                        </p>
                      )}
                      <p className="text-xs mt-2" style={{ color: "#A8967E" }}>
                        Saved {new Date(saved.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Ad Card Component ─── */
function AdCard({
  ad,
  onSave,
  saving,
  formatDate,
  isActive,
  getPlatformIcon,
}: {
  ad: Ad;
  onSave: () => void;
  saving: boolean;
  formatDate: (d: string | null | undefined) => string;
  isActive: boolean;
  getPlatformIcon: (p: string) => React.ReactNode;
}) {
  const creativeText = ad.ad_creative_bodies?.[0] || ad.ad_creative_link_titles?.[0] || "No creative text available";

  return (
    <div className="rounded-xl overflow-hidden flex flex-col" style={cardStyle}>
      {/* Header */}
      <div className="p-4 pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: META }}>
              {ad.page_name?.charAt(0)?.toUpperCase() || "?"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate" style={{ color: "var(--color-text)" }}>{ad.page_name || "Unknown"}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
                  style={isActive
                    ? { backgroundColor: "rgba(16,185,129,0.1)", color: "#059669" }
                    : { backgroundColor: "rgba(156,163,175,0.1)", color: "#6B7280" }
                  }
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: isActive ? "#10B981" : "#9CA3AF" }} />
                  {isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="p-2 rounded-lg transition-colors hover:bg-amber-50 flex-shrink-0"
            title="Save this ad"
            style={{ color: saving ? "#F59E0B" : "#C4AA8A" }}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookmarkCheck className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Creative text */}
      <div className="px-4 py-2 flex-1">
        <p className="text-xs leading-relaxed line-clamp-4" style={{ color: "#5C4A35" }}>
          {creativeText}
        </p>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 mt-auto" style={{ backgroundColor: "rgba(245,215,160,0.04)", borderTop: "1px solid rgba(245,215,160,0.12)" }}>
        <div className="flex items-center justify-between">
          {/* Platforms */}
          <div className="flex items-center gap-1.5">
            {(ad.publisher_platforms || ["facebook"]).map(platform => (
              <span
                key={platform}
                className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full"
                style={{ backgroundColor: "rgba(24,119,242,0.06)", color: META }}
              >
                {getPlatformIcon(platform)}
                <span className="capitalize">{platform}</span>
              </span>
            ))}
          </div>

          {/* Date */}
          <div className="flex items-center gap-1 text-xs" style={{ color: "#A8967E" }}>
            <Clock className="w-3 h-3" />
            {formatDate(ad.ad_delivery_start_time)}
          </div>
        </div>

        {/* Impressions if available */}
        {ad.impressions && typeof ad.impressions === "object" && ad.impressions.lower_bound && (
          <div className="mt-2 text-xs" style={{ color: "#78614E" }}>
            Impressions: {Number(ad.impressions.lower_bound).toLocaleString()}
            {ad.impressions.upper_bound ? ` - ${Number(ad.impressions.upper_bound).toLocaleString()}` : "+"}
          </div>
        )}
      </div>
    </div>
  );
}
