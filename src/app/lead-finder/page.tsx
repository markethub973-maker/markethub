"use client";

import { useState } from "react";
import Header from "@/components/layout/Header";
import MarketingAdvisor from "@/components/lead-finder/MarketingAdvisor";
import StepGuide from "@/components/lead-finder/StepGuide";
import CostMeter from "@/components/lead-finder/CostMeter";
import AdjacentServicesPanel from "@/components/lead-finder/AdjacentServicesPanel";
import CampaignStudio from "@/components/lead-finder/CampaignStudio";
import UpgradePromptModal, { type LimitReachedPayload } from "@/components/lead-finder/UpgradePromptModal";
import {
  COUNTRIES, CONTINENTS, LANGUAGES,
  buildLocationLabel, getCountryByCode, getContinentByCode, getLanguageByCode,
  countriesForContinent,
  type MarketScope,
} from "@/lib/markets";
import {
  Wand2, Search, Users, Globe, Zap, ArrowRight, ArrowLeft,
  Check, X, Plus, Loader2, Star, Flame, Snowflake, Copy,
  MessageSquare, RefreshCw, MapPin, Building2, User, Package,
  Link, ShoppingCart, Target, ChevronDown, ChevronUp,
  ToggleLeft, ToggleRight, AlertCircle, Pencil, Bookmark, BookmarkCheck,
  ExternalLink,
} from "lucide-react";

// ── Constants ────────────────────────────────────────────────────────────────
const AMBER = "var(--color-primary)";
const GREEN = "#1DB954";
const RED   = "#EF4444";
const card  = { backgroundColor: "var(--color-bg-secondary)", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" };

const OFFER_TYPES = [
  { id: "service",           icon: Zap,          label: "Service",            desc: "DJ, photographer, consultant, courier, electrician…" },
  { id: "event_entertain",   icon: Star,         label: "Events & Show",      desc: "Weddings, corporate, parties, entertainers…" },
  { id: "food_beverage",     icon: Package,      label: "Food & Beverage",    desc: "Restaurant, catering, home-made, café…" },
  { id: "ecommerce",         icon: ShoppingCart, label: "Online store",       desc: "Shopify, WooCommerce, marketplace, dropshipping…" },
  { id: "physical_product",  icon: Package,      label: "Physical product",   desc: "Equipment, handmade, fashion, beauty…" },
  { id: "affiliate",         icon: Link,         label: "Affiliate",          desc: "Promote someone else's product, CPA, reviews…" },
  { id: "software",          icon: Target,       label: "Software / App",     desc: "SaaS, tool, digital subscription, AI…" },
  { id: "digital_product",   icon: Zap,          label: "Digital product",    desc: "Course, ebook, template, preset, NFT…" },
  { id: "health_beauty",     icon: User,         label: "Health & Beauty",    desc: "Cosmetics, supplements, salon, spa, wellness…" },
  { id: "real_estate",       icon: Building2,    label: "Real estate",        desc: "Sales, rentals, agency, construction…" },
  { id: "education",         icon: Target,       label: "Education & Courses", desc: "Tutoring, online courses, coaching, training…" },
  { id: "b2b_services",      icon: Building2,    label: "B2B Services",       desc: "Marketing, IT, accounting, HR, logistics…" },
];

const AUDIENCE_TYPES = [
  { id: "b2c", label: "Consumers" },
  { id: "b2b", label: "Businesses" },
  { id: "both", label: "Both" },
];

const BUDGET_RANGES = [
  { id: "low",    label: "< €100" },
  { id: "mid",    label: "€100 – €500" },
  { id: "high",   label: "€500 – €2000" },
  { id: "vhigh",  label: "> €2000" },
];

const EVENT_TYPES = [
  { id: "wedding",    label: "Wedding",    emoji: "💍" },
  { id: "baptism",    label: "Baptism",    emoji: "👶" },
  { id: "corporate",  label: "Corporate",  emoji: "🏢" },
  { id: "party",      label: "Party",      emoji: "🎉" },
  { id: "birthday",   label: "Birthday",   emoji: "🎂" },
  { id: "graduation", label: "Graduation", emoji: "🎓" },
];

const CAMPAIGN_TABS = [
  { id: "sms",          label: "SMS",          emoji: "📱" },
  { id: "email",        label: "Email",         emoji: "📧" },
  { id: "whatsapp",     label: "WhatsApp",      emoji: "💬" },
  { id: "facebook_post",label: "Facebook Post", emoji: "👥" },
  { id: "instagram_post",label: "Instagram",   emoji: "📸" },
  { id: "tiktok",       label: "TikTok/Reel",  emoji: "🎵" },
  { id: "landing_page", label: "Landing Page",  emoji: "🌐" },
  { id: "video_brief",  label: "Video Brief",   emoji: "🎬" },
  { id: "photo_brief",  label: "Photo Brief",   emoji: "📷" },
];

const PLATFORM_ICONS: Record<string, string> = {
  google: "🔍", google_maps: "🗺️", reddit: "🟠",
  facebook_groups: "👥", instagram_hashtag: "📸",
  tiktok_hashtag: "🎵", olx: "🛒", reviews: "⭐",
};

// Map AI source ids to Research Hub tab ids so we can deep-link from each
// suggested source straight into the corresponding Research Hub tab with the
// query pre-filled. Returns null when there is no real Research Hub equivalent.
const RESEARCH_TAB_MAP: Record<string, { tab: string; mode?: string }> = {
  google:            { tab: "google" },
  google_maps:       { tab: "reviews" },
  reddit:            { tab: "reddit",    mode: "keyword" },
  facebook_groups:   { tab: "fb_groups" },
  instagram_hashtag: { tab: "instagram", mode: "hashtag" },
  tiktok_hashtag:    { tab: "tiktok",    mode: "hashtag" },
  olx:               { tab: "olx" },
  classifieds:       { tab: "olx" },
  reviews:           { tab: "reviews" },
};

// ── Types ────────────────────────────────────────────────────────────────────
interface AISuggestion {
  offer_summary: string;
  target_profile: string;
  keywords: string[];
  intent_signals: string[];
  sources: {
    id: string; platform: string; icon: string;
    query: string; why: string; estimated_leads: string; intent_level: string;
  }[];
  affiliate_angle: string | null;
  outreach_hook: string;
}

interface Lead {
  index: number; score: number; label: "hot" | "warm" | "cold";
  signals: string[]; contact_hint: string; why: string;
  title?: string; description?: string; url?: string; platform?: string; text?: string;
}

interface OutreachResult {
  messages: { reddit: string; email: string; facebook: string; generic: string };
  subject_line: string;
  best_platform: string;
  lead_kind?: "customer" | "business" | "unknown";
  warning?: string;
}

interface CampaignResult {
  sms: { text: string };
  email: { subject: string; preview: string; body: string };
  facebook_post: { text: string; cta: string };
  instagram_post: { caption: string; story_hook: string; story_slides: string[]; story_cta: string };
  tiktok: { hook: string; script: string; caption: string; cta: string };
  whatsapp: { text: string };
  landing_page: { headline: string; subheadline: string; bullets: string[]; cta_button: string; cta_subtext: string; contact_block: string };
  video_brief: { concept: string; duration: string; scenes: string[]; music: string; caption: string };
  photo_brief: { concept: string; shots: string[]; style: string; caption: string };
}

// ── Step indicator ───────────────────────────────────────────────────────────
function Stepper({ step }: { step: number }) {
  const steps = ["Offer", "Audience", "AI Sources", "Leads", "Outreach"];
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {steps.map((label, i) => {
        const n = i + 1;
        const done = step > n;
        const active = step === n;
        return (
          <div key={n} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300"
                style={{
                  backgroundColor: done ? GREEN : active ? AMBER : "rgba(245,215,160,0.15)",
                  color: done || active ? "white" : "#A8967E",
                  boxShadow: active ? `0 0 0 4px ${AMBER}25` : "none",
                }}>
                {done ? <Check className="w-4 h-4" /> : n}
              </div>
              <span className="text-xs font-semibold hidden sm:block"
                style={{ color: active ? AMBER : done ? GREEN : "#A8967E" }}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className="w-10 sm:w-16 h-0.5 mb-5 transition-all duration-500"
                style={{ backgroundColor: done ? GREEN : "rgba(245,215,160,0.2)" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ScoreBadge({ label, score }: { label: string; score: number }) {
  if (label === "hot") return (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
      style={{ backgroundColor: "rgba(239,68,68,0.1)", color: RED }}>
      <Flame className="w-3 h-3" /> HOT · {score}/10
    </span>
  );
  if (label === "warm") return (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
      style={{ backgroundColor: "rgba(245,158,11,0.1)", color: AMBER }}>
      <Star className="w-3 h-3" /> WARM · {score}/10
    </span>
  );
  return (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
      style={{ backgroundColor: "rgba(148,163,184,0.1)", color: "#94A3B8" }}>
      <Snowflake className="w-3 h-3" /> COLD · {score}/10
    </span>
  );
}

function Chip({ text, onRemove, color = AMBER }: { text: string; onRemove?: () => void; color?: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ backgroundColor: `${color}15`, color, border: `1px solid ${color}30` }}>
      {text}
      {onRemove && (
        <button type="button" onClick={onRemove} className="ml-0.5 opacity-60 hover:opacity-100">
          <X className="w-2.5 h-2.5" />
        </button>
      )}
    </span>
  );
}

function AddChip({ placeholder, onAdd }: { placeholder: string; onAdd: (v: string) => void }) {
  const [val, setVal] = useState("");
  const submit = () => { if (val.trim()) { onAdd(val.trim()); setVal(""); } };
  return (
    <div className="inline-flex items-center gap-1">
      <input value={val} onChange={e => setVal(e.target.value)}
        onKeyDown={e => e.key === "Enter" && submit()}
        placeholder={placeholder}
        className="text-xs px-2 py-1 rounded-lg bg-transparent focus:outline-none w-32"
        style={{ border: "1px dashed rgba(245,215,160,0.4)", color: "#78614E" }} />
      <button type="button" onClick={submit}
        className="p-1 rounded-lg" style={{ backgroundColor: `${AMBER}15`, color: AMBER }}>
        <Plus className="w-3 h-3" />
      </button>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function LeadFinderPage() {
  const [step, setStep] = useState(1);
  // Stable session ID for cost tracking (regenerates per page load = per wizard session)
  const [sessionId] = useState(() => typeof crypto !== "undefined" ? crypto.randomUUID() : `s-${Date.now()}`);
  const [costRefresh, setCostRefresh] = useState(0);

  // Step 1 — Offer
  const [offerType, setOfferType] = useState("service");
  const [offerText, setOfferText] = useState("");

  // Step 2 — Audience + structured target market
  const [audienceType, setAudienceType] = useState("both");
  const [marketScope, setMarketScope] = useState<MarketScope>("country");
  const [marketCountry, setMarketCountry] = useState<string>("RO");
  const [marketCountries, setMarketCountries] = useState<string[]>([]);
  const [marketContinent, setMarketContinent] = useState<string>("EU");
  const [marketRegion, setMarketRegion] = useState<string>("");
  // Auto-derive language from country selection unless the user overrides it.
  const [contentLanguage, setContentLanguage] = useState<string>("ro");
  const [languageOverridden, setLanguageOverridden] = useState(false);
  // Free-text label kept in sync with the structured selection — used by
  // legacy components and the existing API contract that still ships `location`.
  const location = buildLocationLabel({
    scope: marketScope,
    country: marketCountry,
    countries: marketCountries,
    continent: marketContinent,
    region: marketRegion,
  });
  const [budgetRange, setBudgetRange] = useState("mid");
  // Campaign value — for value-based platform fee (Pro+)
  const [campaignValue, setCampaignValue] = useState("");
  const [campaignValueCurrency, setCampaignValueCurrency] = useState<"EUR" | "USD" | "RON">("EUR");

  // Step 3 — Sources
  const [analyzing, setAnalyzing] = useState(false);
  const [suggestion, setSuggestion] = useState<AISuggestion | null>(null);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [enabledSources, setEnabledSources] = useState<Record<string, boolean>>({});
  const [sourceQueries, setSourceQueries] = useState<Record<string, string>>({});
  const [editingQuery, setEditingQuery] = useState<string | null>(null);
  const [analyzeError, setAnalyzeError] = useState("");

  // Step 4 — Leads
  const [searching, setSearching] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [searchProgress, setSearchProgress] = useState<string[]>([]);
  const [rawResults, setRawResults] = useState<any[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filterLabel, setFilterLabel] = useState<"all" | "hot" | "warm" | "cold">("all");
  const [searchError, setSearchError] = useState("");

  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());
  const [savingId, setSavingId] = useState<number | null>(null);
  const [saveGoal, setSaveGoal] = useState<"ok" | "error" | null>(null);

  // Step 5 — Outreach
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [generatingMsg, setGeneratingMsg] = useState(false);
  const [outreach, setOutreach] = useState<OutreachResult | null>(null);
  const [activePlatform, setActivePlatform] = useState("generic");
  const [copied, setCopied] = useState(false);

  // Campaign Builder
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactWebsite, setContactWebsite] = useState("");
  const [contactInstagram, setContactInstagram] = useState("");
  const [contactFacebook, setContactFacebook] = useState("");
  const [contactWhatsapp, setContactWhatsapp] = useState("");
  const [campaignEventTypes, setCampaignEventTypes] = useState<string[]>([]);
  const [generatingCampaign, setGeneratingCampaign] = useState(false);
  const [campaign, setCampaign] = useState<CampaignResult | null>(null);
  const [campaignError, setCampaignError] = useState("");
  const [activeCampaignTab, setActiveCampaignTab] = useState("sms");
  const [copiedCampaign, setCopiedCampaign] = useState<string | null>(null);
  const [showContactForm, setShowContactForm] = useState(false);

  // Premium AI Action quota — populated by `meta` on every successful score/message/campaign
  // call, or by the 402 LIMIT_REACHED payload when the monthly counter is exhausted.
  const [premiumActionRemaining, setPremiumActionRemaining] = useState<number | null>(null);
  const [limitReached, setLimitReached] = useState<LimitReachedPayload | null>(null);

  // Auto-update content language when the structured market changes — but
  // only if the user hasn't explicitly overridden it via the language pills.
  const pickCountry = (code: string) => {
    setMarketCountry(code);
    if (!languageOverridden) {
      const lang = getCountryByCode(code)?.language;
      if (lang) setContentLanguage(lang);
    }
  };
  const pickContinent = (code: string) => {
    setMarketContinent(code);
    if (!languageOverridden) {
      const def = getContinentByCode(code)?.defaultLanguage;
      if (def) setContentLanguage(def);
    }
  };
  const pickScope = (scope: MarketScope) => {
    setMarketScope(scope);
    if (!languageOverridden) {
      if (scope === "country") {
        const lang = getCountryByCode(marketCountry)?.language;
        if (lang) setContentLanguage(lang);
      } else if (scope === "continent") {
        const def = getContinentByCode(marketContinent)?.defaultLanguage;
        if (def) setContentLanguage(def);
      } else if (scope === "worldwide") {
        setContentLanguage("en");
      }
    }
  };
  const toggleMarketCountry = (code: string) =>
    setMarketCountries(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]);

  // Bundle of fields all 4 AI endpoints accept — keeps call sites short.
  const marketPayload = () => ({
    market_scope: marketScope,
    country: marketScope === "country" ? marketCountry : undefined,
    countries: marketScope === "multi_country" ? marketCountries : undefined,
    continent: marketScope === "continent" ? marketContinent : undefined,
    region: marketRegion || undefined,
    content_language: contentLanguage,
  });

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setAnalyzeError("");
    setSuggestion(null);
    const res = await fetch("/api/find-clients/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-cost-session": sessionId },
      body: JSON.stringify({ offer_type: offerType, offer_description: offerText, audience_type: audienceType, location, budget_range: budgetRange, ...marketPayload() }),
    });
    const data = await res.json();
    setAnalyzing(false);
    if (!res.ok) { setAnalyzeError(data.error || "AI error"); return; }
    setSuggestion(data);
    setKeywords(data.keywords || []);
    const enabled: Record<string, boolean> = {};
    const queries: Record<string, string> = {};
    (data.sources || []).forEach((s: any) => { enabled[s.id] = true; queries[s.id] = s.query; });
    setEnabledSources(enabled);
    setSourceQueries(queries);
    setStep(3);
  };

  const handleSearch = async () => {
    if (!suggestion) return;
    setSearching(true);
    setSearchError("");
    setRawResults([]);
    setLeads([]);
    setSearchProgress([]);
    const activeSrcs = (suggestion.sources || []).filter(s => enabledSources[s.id]);
    const allResults: any[] = [];

    for (const src of activeSrcs) {
      const q = sourceQueries[src.id] || src.query;
      setSearchProgress(p => [...p, `Searching ${src.platform}…`]);
      try {
        let endpoint = "";
        let body: Record<string, unknown> = {};
        switch (src.id) {
          case "google": endpoint = "/api/research/google"; body = { query: q }; break;
          case "google_maps": endpoint = "/api/research/maps"; body = { query: q, location: location || "" }; break;
          case "reddit": endpoint = "/api/research/reddit"; body = { query: q, limit: 20 }; break;
          case "instagram_hashtag": endpoint = "/api/research/instagram"; body = { hashtag: q.replace(/^#/, ""), limit: 15 }; break;
          case "tiktok_hashtag": endpoint = "/api/research/tiktok"; body = { hashtag: q.replace(/^#/, ""), limit: 15 }; break;
          case "olx": endpoint = "/api/research/local-market"; body = { query: q, site: "olx.ro" }; break;
          case "reviews": endpoint = "/api/research/maps-reviews"; body = { placeName: q, maxReviews: 30 }; break;
          default: endpoint = "/api/research/google"; body = { query: q };
        }
        const r = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json", "x-cost-session": sessionId }, body: JSON.stringify(body) });
        const d = await r.json();
        const items: any[] = Array.isArray(d) ? d : d.places || d.posts || d.reviews || d.results || d.items || [];
        const normalized = items.map((item: any) => ({
          title: item.title || item.name || item.text?.slice(0, 80) || "",
          description: item.description || item.text || item.snippet || item.bio || "",
          url: item.url || item.permalink || item.website || "",
          phone: item.phone || null,
          address: item.address || null,
          email: item.email || null,
          rating: item.rating || item.totalScore || null,
          contact_hint: item.author || item.username || item.reviewer || item.name || "",
          platform: src.platform,
          source_id: src.id,
          _raw: item,
        }));
        const tagged = normalized.slice(0, 15);
        allResults.push(...tagged);
        setSearchProgress(p => [...p.slice(0, -1), `✓ ${src.platform} — ${tagged.length} results`]);
      } catch {
        setSearchProgress(p => [...p.slice(0, -1), `✗ ${src.platform} — error`]);
      }
    }

    setRawResults(allResults);
    setSearching(false);
    if (!allResults.length) { setSearchError("No results. Try different keywords."); setStep(4); return; }

    setScoring(true);
    try {
      const res = await fetch("/api/find-clients/score", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-cost-session": sessionId },
        body: JSON.stringify({ results: allResults, offer_summary: suggestion.offer_summary, intent_signals: suggestion.intent_signals, content_language: contentLanguage }),
      });
      const scoreData = await res.json();
      if (res.status === 402 && scoreData?.error === "LIMIT_REACHED") {
        setLimitReached({ current: scoreData.current, limit: scoreData.limit, resetDate: scoreData.resetDate });
      } else if (scoreData.scored) {
        if (scoreData.meta?.premium_action_consumed) {
          setPremiumActionRemaining(scoreData.meta.remaining);
        }
        const merged: Lead[] = scoreData.scored.map((s: any) => ({ ...s, ...(allResults[s.index] || {}) }));
        merged.sort((a, b) => b.score - a.score);
        setLeads(merged);
      }
    } catch {
      setLeads(allResults.map((r, i) => ({ index: i, score: 5, label: "warm" as const, signals: [], contact_hint: "", why: "", ...r })));
    }
    setScoring(false);
    setStep(4);
    setCostRefresh(n => n + 1);
  };

  const handleSaveLead = async (lead: Lead) => {
    setSavingId(lead.index);
    setSaveGoal(null);
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-cost-session": sessionId },
      body: JSON.stringify({ ...lead, goal: suggestion?.offer_summary, source: lead.platform, lead_type: (lead as any).source_id || "search_result" }),
    });
    setSavingId(null);
    if (res.ok) { setSavedIds(s => new Set([...s, lead.index])); setSaveGoal("ok"); }
    else { setSaveGoal("error"); }
    setTimeout(() => setSaveGoal(null), 3000);
  };

  const handleGenerateMessage = async (lead: Lead) => {
    setSelectedLead(lead);
    setGeneratingMsg(true);
    setOutreach(null);
    setStep(5);
    const res = await fetch("/api/find-clients/message", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-cost-session": sessionId },
      body: JSON.stringify({ lead, offer_summary: suggestion?.offer_summary, outreach_hook: suggestion?.outreach_hook, ...marketPayload() }),
    });
    const data = await res.json();
    setGeneratingMsg(false);
    if (res.status === 402 && data?.error === "LIMIT_REACHED") {
      setLimitReached({ current: data.current, limit: data.limit, resetDate: data.resetDate });
      return;
    }
    if (!res.ok) return;
    if (data.meta?.premium_action_consumed) {
      setPremiumActionRemaining(data.meta.remaining);
    }
    setOutreach(data);
    setActivePlatform(data.best_platform || "generic");
    setCostRefresh(n => n + 1);
  };

  const copyMessage = (txt: string) => {
    navigator.clipboard.writeText(txt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyCampaign = (key: string, txt: string) => {
    navigator.clipboard.writeText(txt);
    setCopiedCampaign(key);
    setTimeout(() => setCopiedCampaign(null), 2000);
  };

  const handleGenerateCampaign = async () => {
    if (!selectedLead || !suggestion) return;
    setGeneratingCampaign(true);
    setCampaignError("");
    setCampaign(null);
    const res = await fetch("/api/find-clients/campaign", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-cost-session": sessionId },
      body: JSON.stringify({
        offer_summary: suggestion.offer_summary,
        outreach_hook: suggestion.outreach_hook,
        lead: selectedLead,
        contact: {
          phone: contactPhone,
          email: contactEmail,
          website: contactWebsite,
          instagram: contactInstagram,
          facebook: contactFacebook,
          whatsapp: contactWhatsapp,
        },
        targeting: { location, event_types: campaignEventTypes, audience_type: audienceType },
        ...marketPayload(),
      }),
    });
    const data = await res.json();
    setGeneratingCampaign(false);
    if (res.status === 402 && data?.error === "LIMIT_REACHED") {
      setLimitReached({ current: data.current, limit: data.limit, resetDate: data.resetDate });
      return;
    }
    if (!res.ok) { setCampaignError(data.error || "Campaign generation error"); return; }
    if (data.meta?.premium_action_consumed) {
      setPremiumActionRemaining(data.meta.remaining);
    }
    setCampaign(data);
    setActiveCampaignTab("sms");
    setCostRefresh(n => n + 1);
  };

  const toggleEventType = (id: string) =>
    setCampaignEventTypes(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const filteredLeads = filterLabel === "all" ? leads : leads.filter(l => l.label === filterLabel);
  const hotCount  = leads.filter(l => l.label === "hot").length;
  const warmCount = leads.filter(l => l.label === "warm").length;
  const coldCount = leads.filter(l => l.label === "cold").length;

  return (
    <div>
      <Header
        title="Lead Finder"
        subtitle="Find qualified prospects in any niche with AI"
      />
      <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">

        <Stepper step={step} />

        {premiumActionRemaining !== null && premiumActionRemaining !== -1 && (
          <div
            className="rounded-xl px-4 py-2.5 flex items-center gap-2 text-xs font-semibold"
            style={{
              backgroundColor: "rgba(245,158,11,0.08)",
              border: "1px solid rgba(245,158,11,0.25)",
              color: "#78614E",
            }}
          >
            <Zap className="w-3.5 h-3.5" style={{ color: "var(--color-primary)" }} />
            <span>
              1 Premium AI Action consumed —{" "}
              <strong style={{ color: "#1C1814" }}>{premiumActionRemaining}</strong>{" "}
              remaining this month
            </span>
          </div>
        )}

        {/* ══ STEP 1 — Offer ═══════════════════════════════════════════════ */}
        {step === 1 && (
          <div className="space-y-4">
          <div className="rounded-2xl p-6 space-y-5" style={card}>
            <div>
              <h2 className="text-xl font-bold mb-1" style={{ color: "var(--color-text)" }}>What are you selling or promoting?</h2>
              <p className="text-sm" style={{ color: "#A8967E" }}>Be specific — AI will generate the optimal client-finding strategy</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {OFFER_TYPES.map(({ id, icon: Icon, label, desc }) => (
                <button key={id} type="button" onClick={() => setOfferType(id)}
                  className="flex flex-col items-start gap-1.5 p-4 rounded-xl text-left transition-all"
                  style={offerType === id
                    ? { backgroundColor: `${AMBER}12`, border: `2px solid ${AMBER}`, boxShadow: `0 0 0 4px ${AMBER}10` }
                    : { backgroundColor: "rgba(245,215,160,0.06)", border: "1px solid rgba(245,215,160,0.2)" }}>
                  <Icon className="w-5 h-5" style={{ color: offerType === id ? AMBER : "#A8967E" }} />
                  <span className="font-bold text-sm" style={{ color: "var(--color-text)" }}>{label}</span>
                  <span className="text-xs" style={{ color: "#A8967E" }}>{desc}</span>
                </button>
              ))}
            </div>
            <div>
              <label className="text-xs font-bold mb-2 block" style={{ color: "#78614E" }}>
                Describe your offer in 1-2 sentences
              </label>
              <textarea value={offerText} onChange={e => setOfferText(e.target.value)}
                rows={3} placeholder={
                  offerType === "service" ? "e.g. DJ and vocalist services for weddings, baptisms and corporate events in London and surrounding area" :
                  offerType === "affiliate" ? "e.g. I promote an online photography course for amateur photographers" :
                  "Describe what you sell and who it's useful for..."
                }
                className="w-full px-4 py-3 rounded-xl text-sm resize-none focus:outline-none"
                style={{ border: `1px solid ${AMBER}30`, backgroundColor: "#FFFDF9", color: "var(--color-text)" }} />
            </div>
            <button type="button" onClick={() => setStep(2)} disabled={!offerText.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold disabled:opacity-40 transition-all"
              style={{ backgroundColor: AMBER, color: "#1C1814" }}>
              Next — Define audience <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <StepGuide step={1} offerType={offerType} offerText={offerText} audienceType={audienceType}
            location={location} budgetRange={budgetRange} leadsCount={0} />
          {offerText.trim().length > 10 && (
            <MarketingAdvisor step={1} offerType={offerType} offerDescription={offerText}
              audienceType={audienceType} location={location} budgetRange={budgetRange}
              country={marketScope === "country" ? marketCountry : undefined}
              contentLanguage={contentLanguage} marketScope={marketScope}
              onLimitReached={setLimitReached} onPremiumActionConsumed={setPremiumActionRemaining} />
          )}
          </div>
        )}

        {/* ══ STEP 2 — Audience ════════════════════════════════════════════ */}
        {step === 2 && (
          <div className="space-y-4">
          <div className="rounded-2xl p-6 space-y-5" style={card}>
            <div>
              <h2 className="text-xl font-bold mb-1" style={{ color: "var(--color-text)" }}>Who is the ideal customer?</h2>
              <p className="text-sm" style={{ color: "#A8967E" }}>The more specific you are, the more relevant the leads will be</p>
            </div>
            <div>
              <p className="text-xs font-bold mb-2" style={{ color: "#78614E" }}>Customer type</p>
              <div className="flex gap-2">
                {AUDIENCE_TYPES.map(({ id, label }) => (
                  <button key={id} type="button" onClick={() => setAudienceType(id)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                    style={audienceType === id
                      ? { backgroundColor: `${AMBER}15`, color: AMBER, border: `2px solid ${AMBER}` }
                      : { backgroundColor: "rgba(245,215,160,0.06)", color: "#78614E", border: "1px solid rgba(245,215,160,0.2)" }}>
                    {id === "b2c" && <User className="w-3.5 h-3.5" />}
                    {id === "b2b" && <Building2 className="w-3.5 h-3.5" />}
                    {id === "both" && <Users className="w-3.5 h-3.5" />}
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {/* ── Target market — structured selector ───────────────────── */}
            <div className="space-y-3">
              <p className="text-xs font-bold" style={{ color: "#78614E" }}>Target market</p>
              {/* Scope picker */}
              <div className="flex gap-2 flex-wrap">
                {([
                  { id: "country",       label: "Single country",  icon: "🏳️" },
                  { id: "multi_country", label: "Multiple countries", icon: "🌐" },
                  { id: "continent",     label: "Whole continent", icon: "🗺️" },
                  { id: "worldwide",     label: "Worldwide",       icon: "🌍" },
                ] as const).map(({ id, label, icon }) => (
                  <button key={id} type="button" onClick={() => pickScope(id as MarketScope)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all"
                    style={marketScope === id
                      ? { backgroundColor: `${AMBER}15`, color: AMBER, border: `2px solid ${AMBER}` }
                      : { backgroundColor: "rgba(245,215,160,0.06)", color: "#78614E", border: "1px solid rgba(245,215,160,0.2)" }}>
                    <span>{icon}</span>{label}
                  </button>
                ))}
              </div>

              {/* Single country */}
              {marketScope === "country" && (
                <div className="space-y-2">
                  <select aria-label="Target country" title="Target country"
                    value={marketCountry} onChange={e => pickCountry(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none"
                    style={{ border: `1px solid ${AMBER}30`, backgroundColor: "#FFFDF9", color: "var(--color-text)" }}>
                    {COUNTRIES.map(c => (
                      <option key={c.code} value={c.code}>{c.flag} {c.name} {c.nativeName && c.nativeName !== c.name ? `(${c.nativeName})` : ""}</option>
                    ))}
                  </select>
                  <input value={marketRegion} onChange={e => setMarketRegion(e.target.value)}
                    placeholder="Optional — city, region, or area (e.g. Bucharest, Sector 2)"
                    className="w-full px-4 py-2 rounded-xl text-sm focus:outline-none"
                    style={{ border: `1px solid ${AMBER}25`, backgroundColor: "#FFFDF9", color: "var(--color-text)" }} />
                </div>
              )}

              {/* Multi-country */}
              {marketScope === "multi_country" && (
                <div className="space-y-2">
                  <p className="text-xs" style={{ color: "#A8967E" }}>Pick the countries you want to reach (tap to toggle):</p>
                  <div className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto p-2 rounded-xl"
                    style={{ border: `1px solid ${AMBER}20`, backgroundColor: "rgba(245,215,160,0.04)" }}>
                    {COUNTRIES.map(c => {
                      const on = marketCountries.includes(c.code);
                      return (
                        <button key={c.code} type="button" onClick={() => toggleMarketCountry(c.code)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
                          style={on
                            ? { backgroundColor: `${AMBER}20`, color: AMBER, border: `1px solid ${AMBER}50` }
                            : { backgroundColor: "rgba(245,215,160,0.06)", color: "#78614E", border: "1px solid rgba(245,215,160,0.15)" }}>
                          <span>{c.flag}</span>{c.name}
                        </button>
                      );
                    })}
                  </div>
                  {marketCountries.length > 0 && (
                    <p className="text-xs font-semibold" style={{ color: GREEN }}>
                      ✓ {marketCountries.length} {marketCountries.length === 1 ? "country" : "countries"} selected
                    </p>
                  )}
                </div>
              )}

              {/* Continent */}
              {marketScope === "continent" && (
                <select aria-label="Target continent" title="Target continent"
                  value={marketContinent} onChange={e => pickContinent(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none"
                  style={{ border: `1px solid ${AMBER}30`, backgroundColor: "#FFFDF9", color: "var(--color-text)" }}>
                  {CONTINENTS.map(c => (
                    <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                  ))}
                </select>
              )}

              {/* Worldwide */}
              {marketScope === "worldwide" && (
                <p className="text-xs italic" style={{ color: "#A8967E" }}>
                  Targeting global audience — recommendations and copy will use the language picked below.
                </p>
              )}

              {/* Content language — auto-derived, with override */}
              <div className="rounded-xl p-3 space-y-2"
                style={{ backgroundColor: "rgba(245,215,160,0.05)", border: "1px solid rgba(245,215,160,0.2)" }}>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-xs font-bold" style={{ color: "#78614E" }}>
                    Content language {languageOverridden ? "(manual)" : "(auto from market)"}
                  </p>
                  {languageOverridden && (
                    <button type="button"
                      onClick={() => {
                        setLanguageOverridden(false);
                        const auto =
                          marketScope === "country"   ? getCountryByCode(marketCountry)?.language :
                          marketScope === "continent" ? getContinentByCode(marketContinent)?.defaultLanguage :
                          "en";
                        if (auto) setContentLanguage(auto);
                      }}
                      className="text-xs underline" style={{ color: AMBER }}>
                      Reset to auto
                    </button>
                  )}
                </div>
                <select aria-label="Content language" title="Content language"
                  value={contentLanguage}
                  onChange={e => { setContentLanguage(e.target.value); setLanguageOverridden(true); }}
                  className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                  style={{ border: `1px solid ${AMBER}25`, backgroundColor: "#FFFDF9", color: "var(--color-text)" }}>
                  {LANGUAGES.map(l => (
                    <option key={l.code} value={l.code}>{l.nativeName} — {l.name}</option>
                  ))}
                </select>
                <p className="text-xs" style={{ color: "#A8967E" }}>
                  All AI-generated copy (sources, message, campaign, APEX advisor) will be written in {getLanguageByCode(contentLanguage)?.nativeName || "English"}.
                </p>
              </div>
            </div>
            <div>
              <p className="text-xs font-bold mb-2" style={{ color: "#78614E" }}>Customer budget estimate</p>
              <div className="flex flex-wrap gap-2">
                {BUDGET_RANGES.map(({ id, label }) => (
                  <button key={id} type="button" onClick={() => setBudgetRange(id)}
                    className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                    style={budgetRange === id
                      ? { backgroundColor: `${AMBER}15`, color: AMBER, border: `2px solid ${AMBER}` }
                      : { backgroundColor: "rgba(245,215,160,0.06)", color: "#78614E", border: "1px solid rgba(245,215,160,0.2)" }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {/* Campaign value — for value-based fee */}
            <div className="rounded-xl p-4 space-y-2" style={{ backgroundColor: `rgba(245,158,11,0.05)`, border: `1px solid rgba(245,158,11,0.2)` }}>
              <div className="flex items-center gap-2">
                <span className="text-sm">💰</span>
                <p className="text-xs font-bold" style={{ color: "#78614E" }}>Average value per transaction/customer (optional)</p>
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: `${AMBER}15`, color: AMBER }}>Pro+</span>
              </div>
              <p className="text-xs" style={{ color: "#A8967E" }}>
                The platform calculates a commission from the generated value — the higher the value, the more justified the campaign
              </p>
              <div className="flex gap-2">
                <input
                  type="number" min="0" step="1" value={campaignValue}
                  onChange={e => setCampaignValue(e.target.value)}
                  placeholder="e.g. 1000"
                  className="flex-1 px-3 py-2 rounded-lg text-sm focus:outline-none"
                  style={{ border: `1px solid ${AMBER}30`, backgroundColor: "#FFFDF9", color: "var(--color-text)" }} />
                <div className="flex gap-1">
                  {(["EUR", "USD", "RON"] as const).map(c => (
                    <button key={c} type="button" onClick={() => setCampaignValueCurrency(c)}
                      className="px-3 py-2 rounded-lg text-xs font-bold transition-all"
                      style={campaignValueCurrency === c
                        ? { backgroundColor: `${AMBER}20`, color: AMBER, border: `1px solid ${AMBER}50` }
                        : { backgroundColor: "rgba(245,215,160,0.08)", color: "#A8967E", border: "1px solid rgba(245,215,160,0.15)" }}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              {campaignValue && parseFloat(campaignValue) > 0 && (
                <p className="text-xs font-semibold" style={{ color: GREEN }}>
                  ✓ Platform commission will be calculated from {campaignValue} {campaignValueCurrency}
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(1)}
                className="flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm"
                style={{ backgroundColor: "rgba(245,215,160,0.1)", color: "#78614E", border: "1px solid rgba(245,215,160,0.2)" }}>
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button type="button" onClick={handleAnalyze} disabled={analyzing}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all disabled:opacity-60"
                style={{ background: `linear-gradient(135deg, ${AMBER}, #D97706)`, color: "#1C1814" }}>
                {analyzing ? <><Loader2 className="w-4 h-4 animate-spin" /> AI analyzing…</> : <><Wand2 className="w-4 h-4" /> Generate AI strategy</>}
              </button>
            </div>
            {analyzeError && (
              <div className="flex items-center gap-2 text-sm px-4 py-3 rounded-xl"
                style={{ backgroundColor: "rgba(239,68,68,0.08)", color: RED, border: "1px solid rgba(239,68,68,0.15)" }}>
                <AlertCircle className="w-4 h-4" />{analyzeError}
              </div>
            )}
          </div>
          <StepGuide step={2} offerType={offerType} offerText={offerText} audienceType={audienceType}
            location={location} budgetRange={budgetRange} leadsCount={0} />
          <MarketingAdvisor step={2} offerType={offerType} offerDescription={offerText}
            audienceType={audienceType} location={location} budgetRange={budgetRange}
            country={marketScope === "country" ? marketCountry : undefined}
            contentLanguage={contentLanguage} marketScope={marketScope}
            onLimitReached={setLimitReached} onPremiumActionConsumed={setPremiumActionRemaining} />
          </div>
        )}

        {/* ══ STEP 3 — AI Sources ══════════════════════════════════════════ */}
        {step === 3 && suggestion && (
          <div className="space-y-4">
            <div className="rounded-2xl p-5 space-y-3" style={card}>
              <div className="flex items-center gap-2">
                <Wand2 className="w-4 h-4" style={{ color: AMBER }} />
                <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>AI analysis</p>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="rounded-xl p-3" style={{ backgroundColor: "rgba(245,215,160,0.08)" }}>
                  <p className="text-xs font-bold mb-1" style={{ color: "#78614E" }}>Refined offer</p>
                  <p className="text-xs" style={{ color: "var(--color-text)" }}>{suggestion.offer_summary}</p>
                </div>
                <div className="rounded-xl p-3" style={{ backgroundColor: "rgba(245,215,160,0.08)" }}>
                  <p className="text-xs font-bold mb-1" style={{ color: "#78614E" }}>Ideal customer profile</p>
                  <p className="text-xs" style={{ color: "var(--color-text)" }}>{suggestion.target_profile}</p>
                </div>
              </div>
              {suggestion.affiliate_angle && (
                <div className="rounded-xl p-3" style={{ backgroundColor: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)" }}>
                  <p className="text-xs font-bold mb-1" style={{ color: "#6366F1" }}>🎯 Affiliate angle</p>
                  <p className="text-xs" style={{ color: "var(--color-text)" }}>{suggestion.affiliate_angle}</p>
                </div>
              )}
            </div>

            <div className="rounded-2xl p-5 space-y-3" style={card}>
              <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>Detected keywords</p>
              <p className="text-xs" style={{ color: "#A8967E" }}>These are used in searches. Edit as needed.</p>
              <div className="flex flex-wrap gap-2">
                {keywords.map(kw => (
                  <Chip key={kw} text={kw} onRemove={() => setKeywords(keywords.filter(k => k !== kw))} />
                ))}
                <AddChip placeholder="+ keyword" onAdd={kw => setKeywords([...keywords, kw])} />
              </div>
            </div>

            <div className="rounded-2xl p-5 space-y-3" style={card}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>AI-recommended sources</p>
                <span className="text-xs" style={{ color: "#A8967E" }}>
                  {Object.values(enabledSources).filter(Boolean).length} active
                </span>
              </div>
              <p className="text-xs" style={{ color: "#A8967E" }}>Toggle sources · Click the query to edit it</p>
              <div className="space-y-2">
                {suggestion.sources.map(src => {
                  const on = enabledSources[src.id] ?? true;
                  const isEditing = editingQuery === src.id;
                  return (
                    <div key={src.id} className="rounded-xl p-3 transition-all"
                      style={{ backgroundColor: on ? `${AMBER}06` : "rgba(245,215,160,0.03)", border: `1px solid ${on ? `${AMBER}25` : "rgba(245,215,160,0.1)"}`, opacity: on ? 1 : 0.5 }}>
                      <div className="flex items-start gap-3">
                        <button type="button" onClick={() => setEnabledSources(s => ({ ...s, [src.id]: !on }))}>
                          {on
                            ? <ToggleRight className="w-6 h-6 flex-shrink-0" style={{ color: AMBER }} />
                            : <ToggleLeft className="w-6 h-6 flex-shrink-0" style={{ color: "#C4AA8A" }} />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-base">{PLATFORM_ICONS[src.id] || "🔍"}</span>
                            <span className="font-bold text-sm" style={{ color: "var(--color-text)" }}>{src.platform}</span>
                            <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
                              style={{
                                backgroundColor: src.intent_level === "high" ? "rgba(239,68,68,0.1)" : src.intent_level === "medium" ? `${AMBER}15` : "rgba(148,163,184,0.1)",
                                color: src.intent_level === "high" ? RED : src.intent_level === "medium" ? AMBER : "#94A3B8",
                              }}>
                              {src.intent_level === "high" ? "🔥 High intent" : src.intent_level === "medium" ? "⚡ Medium" : "💤 Low"}
                            </span>
                            <span className="text-xs ml-auto" style={{ color: "#A8967E" }}>~{src.estimated_leads} leads</span>
                          </div>
                          {isEditing ? (
                            <div className="flex gap-2 mt-1">
                              <input value={sourceQueries[src.id] || src.query}
                                onChange={e => setSourceQueries(q => ({ ...q, [src.id]: e.target.value }))}
                                onKeyDown={e => e.key === "Enter" && setEditingQuery(null)}
                                autoFocus
                                className="flex-1 text-xs px-2 py-1.5 rounded-lg focus:outline-none"
                                style={{ border: `1px solid ${AMBER}50`, backgroundColor: "#FFFDF9", color: "var(--color-text)" }} />
                              <button type="button" onClick={() => setEditingQuery(null)}
                                className="px-2 py-1 rounded-lg text-xs font-bold"
                                style={{ backgroundColor: `${AMBER}15`, color: AMBER }}>
                                <Check className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button type="button" onClick={() => on && setEditingQuery(src.id)}
                              className="flex items-center gap-1.5 mt-1 group w-full text-left" disabled={!on}>
                              <code className="text-xs px-2 py-1 rounded-lg font-mono flex-1 truncate"
                                style={{ backgroundColor: "rgba(28,24,20,0.04)", color: "#78614E" }}>
                                {sourceQueries[src.id] || src.query}
                              </code>
                              {on && <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-60 flex-shrink-0" style={{ color: "#A8967E" }} />}
                            </button>
                          )}
                          <p className="text-xs mt-1" style={{ color: "#A8967E" }}>{src.why}</p>
                          {(() => {
                            const map = RESEARCH_TAB_MAP[src.id];
                            if (!map) return null;
                            const q = sourceQueries[src.id] || src.query;
                            const params = new URLSearchParams({ tab: map.tab, q });
                            if (map.mode) params.set("mode", map.mode);
                            return (
                              <a
                                href={`/research?${params.toString()}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-semibold mt-2 hover:underline"
                                style={{ color: AMBER }}
                              >
                                <ExternalLink className="w-3 h-3" />
                                Search now in Research Hub
                              </a>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl px-4 py-3 flex items-start gap-3" style={{ backgroundColor: "rgba(29,185,84,0.06)", border: "1px solid rgba(29,185,84,0.15)" }}>
              <Target className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: GREEN }} />
              <div>
                <p className="text-xs font-bold mb-1" style={{ color: GREEN }}>Intent signals targeted</p>
                <div className="flex flex-wrap gap-1.5">
                  {(suggestion.intent_signals || []).map(s => (
                    <span key={s} className="text-xs px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: "rgba(29,185,84,0.1)", color: GREEN }}>{s}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(2)}
                className="flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm"
                style={{ backgroundColor: "rgba(245,215,160,0.1)", color: "#78614E", border: "1px solid rgba(245,215,160,0.2)" }}>
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button type="button" onClick={() => { handleSearch(); setStep(4); }}
                disabled={!Object.values(enabledSources).some(Boolean)}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all disabled:opacity-40"
                style={{ backgroundColor: AMBER, color: "#1C1814" }}>
                <Search className="w-4 h-4" /> Find prospects now
              </button>
            </div>
          <MarketingAdvisor step={3} offerType={offerType} offerDescription={offerText}
            audienceType={audienceType} location={location} budgetRange={budgetRange}
            country={marketScope === "country" ? marketCountry : undefined}
            contentLanguage={contentLanguage} marketScope={marketScope}
            onLimitReached={setLimitReached} onPremiumActionConsumed={setPremiumActionRemaining}
            context={{ sources: suggestion?.sources, keywords: suggestion?.keywords }} />
          </div>
        )}

        {/* ══ STEP 4 — Leads ═══════════════════════════════════════════════ */}
        {step === 4 && (
          <div className="space-y-4">
            {(searching || scoring) && (
              <div className="rounded-2xl p-5 space-y-3" style={card}>
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" style={{ color: AMBER }} />
                  <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
                    {searching ? "Search in progress…" : "AI scoring prospects…"}
                  </p>
                </div>
                <div className="space-y-1">
                  {searchProgress.map((p, i) => (
                    <p key={i} className="text-xs" style={{ color: p.startsWith("✓") ? GREEN : p.startsWith("✗") ? RED : "#A8967E" }}>{p}</p>
                  ))}
                  {scoring && <p className="text-xs" style={{ color: AMBER }}>⚡ AI analyzing {rawResults.length} results…</p>}
                </div>
              </div>
            )}

            {searchError && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
                style={{ backgroundColor: "rgba(239,68,68,0.08)", color: RED, border: "1px solid rgba(239,68,68,0.15)" }}>
                <AlertCircle className="w-4 h-4" />{searchError}
              </div>
            )}

            {!searching && !scoring && leads.length > 0 && (
              <>
                {saveGoal === "ok" && (
                  <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
                    style={{ backgroundColor: "rgba(29,185,84,0.08)", color: GREEN, border: "1px solid rgba(29,185,84,0.2)" }}>
                    <BookmarkCheck className="w-4 h-4" /> Lead saved! See it in <a href="/leads" className="underline ml-1">Leads Database</a>
                  </div>
                )}
                {saveGoal === "error" && (
                  <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
                    style={{ backgroundColor: "rgba(239,68,68,0.08)", color: RED }}>
                    <AlertCircle className="w-4 h-4" /> Save error
                  </div>
                )}

                <div className="rounded-2xl p-4 flex items-center gap-4 flex-wrap" style={card}>
                  <div className="flex-1">
                    <p className="font-bold" style={{ color: "var(--color-text)" }}>{leads.length} prospects found</p>
                    <p className="text-xs" style={{ color: "#A8967E" }}>out of {rawResults.length} total results</p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {(["hot","warm","cold","all"] as const).map(f => (
                      <button key={f} type="button" onClick={() => setFilterLabel(f)}
                        className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full transition-all"
                        style={{
                          backgroundColor: filterLabel === f
                            ? f === "hot" ? "rgba(239,68,68,0.15)" : f === "warm" ? `${AMBER}25` : f === "cold" ? "rgba(148,163,184,0.15)" : "rgba(245,215,160,0.2)"
                            : f === "hot" ? "rgba(239,68,68,0.06)" : f === "warm" ? `${AMBER}08` : f === "cold" ? "rgba(148,163,184,0.06)" : "transparent",
                          color: f === "hot" ? RED : f === "warm" ? AMBER : f === "cold" ? "#94A3B8" : "#78614E",
                        }}>
                        {f === "hot" && <Flame className="w-3 h-3" />}
                        {f === "warm" && <Star className="w-3 h-3" />}
                        {f === "cold" && <Snowflake className="w-3 h-3" />}
                        {f === "hot" ? `HOT · ${hotCount}` : f === "warm" ? `WARM · ${warmCount}` : f === "cold" ? `COLD · ${coldCount}` : "All"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  {filteredLeads.map((lead, i) => (
                    <div key={i} className="rounded-2xl p-4 space-y-2.5 transition-all hover:shadow-md" style={card}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm truncate" style={{ color: "var(--color-text)" }}>
                            {lead.title || lead.contact_hint || `Prospect #${i + 1}`}
                          </p>
                          <p className="text-xs" style={{ color: "#A8967E" }}>{lead.platform}</p>
                        </div>
                        <ScoreBadge label={lead.label} score={lead.score} />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: "rgba(245,215,160,0.15)" }}>
                          <div className="h-1.5 rounded-full transition-all duration-500"
                            style={{ width: `${lead.score * 10}%`, backgroundColor: lead.label === "hot" ? RED : lead.label === "warm" ? AMBER : "#94A3B8" }} />
                        </div>
                        <span className="text-xs font-bold" style={{ color: "#78614E" }}>{lead.score}/10</span>
                      </div>
                      {lead.why && <p className="text-xs italic" style={{ color: "#78614E" }}>{lead.why}</p>}
                      {lead.description && (
                        <p className="text-xs" style={{ color: "#A8967E" }}>
                          {(lead.description || "").slice(0, 180)}{lead.description.length > 180 ? "…" : ""}
                        </p>
                      )}
                      {(lead as any).phone && <p className="text-xs flex items-center gap-1 font-semibold" style={{ color: GREEN }}>📞 {(lead as any).phone}</p>}
                      {(lead as any).address && <p className="text-xs" style={{ color: "#78614E" }}>📍 {(lead as any).address}</p>}
                      {(lead as any).email && <p className="text-xs font-semibold" style={{ color: "#6366F1" }}>✉️ {(lead as any).email}</p>}
                      {(lead as any).rating && <p className="text-xs" style={{ color: AMBER }}>⭐ {(lead as any).rating}</p>}
                      {lead.signals?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {lead.signals.map(s => <Chip key={s} text={s} color={lead.label === "hot" ? RED : AMBER} />)}
                        </div>
                      )}
                      <div className="flex items-center gap-2 pt-1 flex-wrap">
                        {lead.url && (
                          <a href={lead.url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-semibold"
                            style={{ backgroundColor: "rgba(245,215,160,0.1)", color: "#78614E" }}>
                            <Globe className="w-3 h-3" /> Source
                          </a>
                        )}
                        <button type="button" onClick={() => handleGenerateMessage(lead)}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-bold"
                          style={{ backgroundColor: `${AMBER}15`, color: AMBER }}>
                          <MessageSquare className="w-3 h-3" /> Message
                        </button>
                        <button type="button"
                          onClick={() => !savedIds.has(lead.index) && handleSaveLead(lead)}
                          disabled={savingId === lead.index || savedIds.has(lead.index)}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-bold disabled:opacity-60 transition-all"
                          style={{
                            backgroundColor: savedIds.has(lead.index) ? "rgba(29,185,84,0.1)" : "rgba(29,185,84,0.08)",
                            color: savedIds.has(lead.index) ? GREEN : "#78614E",
                          }}>
                          {savingId === lead.index ? <Loader2 className="w-3 h-3 animate-spin" /> : savedIds.has(lead.index) ? <BookmarkCheck className="w-3 h-3" /> : <Bookmark className="w-3 h-3" />}
                          {savedIds.has(lead.index) ? "Saved" : "Save"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {!searching && !scoring && leads.length === 0 && !searchError && (
              <div className="rounded-2xl p-10 text-center" style={card}>
                <Search className="w-10 h-10 mx-auto mb-3" style={{ color: "rgba(196,170,138,0.3)" }} />
                <p className="font-semibold" style={{ color: "#78614E" }}>Ready to search</p>
                <p className="text-sm mt-1" style={{ color: "#C4AA8A" }}>Click "Find prospects" on the previous step</p>
              </div>
            )}

            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(3)}
                className="flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm"
                style={{ backgroundColor: "rgba(245,215,160,0.1)", color: "#78614E", border: "1px solid rgba(245,215,160,0.2)" }}>
                <ArrowLeft className="w-4 h-4" /> Edit sources
              </button>
              {leads.length > 0 && (
                <button type="button" onClick={handleSearch}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm"
                  style={{ backgroundColor: "rgba(245,215,160,0.08)", color: "#78614E", border: "1px solid rgba(245,215,160,0.2)" }}>
                  <RefreshCw className="w-4 h-4" /> Re-search
                </button>
              )}
              {leads.length > 0 && !searching && !scoring && (
                <button type="button"
                  onClick={() => handleGenerateMessage(leads.find(l => l.label === "hot") || leads[0])}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm ml-auto"
                  style={{ backgroundColor: AMBER, color: "#fff" }}>
                  <MessageSquare className="w-4 h-4" /> Continue to Outreach <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
            {!searching && !scoring && leads.length > 0 && (
              <StepGuide step={4} offerType={offerType} offerText={offerText} audienceType={audienceType}
                location={location} budgetRange={budgetRange} leadsCount={leads.length} />
            )}
            {!searching && !scoring && (
              <MarketingAdvisor step={4} offerType={offerType} offerDescription={offerText}
                audienceType={audienceType} location={location} budgetRange={budgetRange}
                country={marketScope === "country" ? marketCountry : undefined}
                contentLanguage={contentLanguage} marketScope={marketScope}
                onLimitReached={setLimitReached} onPremiumActionConsumed={setPremiumActionRemaining}
                context={{ leads_found: leads.length, hot: leads.filter(l => l.label === "hot").length }} />
            )}
          </div>
        )}

        {/* ══ STEP 5 — Outreach ════════════════════════════════════════════ */}
        {step === 5 && (
          <div className="space-y-4">
            {selectedLead && (
              <div className="rounded-2xl p-4 flex items-center gap-4" style={card}>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold mb-0.5" style={{ color: "#A8967E" }}>Selected lead</p>
                  <p className="font-bold truncate" style={{ color: "var(--color-text)" }}>{selectedLead.title || selectedLead.contact_hint || "Prospect"}</p>
                  <p className="text-xs" style={{ color: "#A8967E" }}>{selectedLead.platform}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <ScoreBadge label={selectedLead.label} score={selectedLead.score} />
                  {selectedLead.url && (
                    <a href={selectedLead.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:scale-105"
                      style={{ backgroundColor: "rgba(245,158,11,0.12)", color: AMBER, border: `1px solid ${AMBER}30` }}
                      title="Open original source">
                      <Globe className="w-3.5 h-3.5" /> Open source
                    </a>
                  )}
                  <button type="button"
                    onClick={() => !savedIds.has(selectedLead.index) && handleSaveLead(selectedLead)}
                    disabled={savingId === selectedLead.index || savedIds.has(selectedLead.index)}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold transition-all"
                    style={{
                      backgroundColor: savedIds.has(selectedLead.index) ? "rgba(29,185,84,0.1)" : "rgba(29,185,84,0.08)",
                      color: savedIds.has(selectedLead.index) ? GREEN : "#78614E",
                      border: `1px solid ${savedIds.has(selectedLead.index) ? GREEN + "40" : "rgba(245,215,160,0.2)"}`,
                    }}>
                    {savingId === selectedLead.index ? <Loader2 className="w-3 h-3 animate-spin" /> : savedIds.has(selectedLead.index) ? <BookmarkCheck className="w-3 h-3" /> : <Bookmark className="w-3 h-3" />}
                    {savedIds.has(selectedLead.index) ? "Saved" : "Save"}
                  </button>
                </div>
              </div>
            )}

            {/* Quick lead switcher */}
            {leads.length > 1 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold" style={{ color: "#A8967E" }}>Pick another lead:</span>
                {leads.filter(l => l.index !== selectedLead?.index).slice(0, 5).map(l => (
                  <button key={l.index} type="button"
                    onClick={() => handleGenerateMessage(l)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:scale-105"
                    style={{
                      backgroundColor: l.label === "hot" ? "rgba(239,68,68,0.08)" : l.label === "warm" ? "rgba(245,158,11,0.08)" : "rgba(120,97,78,0.06)",
                      color: l.label === "hot" ? RED : l.label === "warm" ? AMBER : "#78614E",
                      border: `1px solid ${l.label === "hot" ? RED + "25" : l.label === "warm" ? AMBER + "25" : "rgba(120,97,78,0.15)"}`,
                    }}>
                    {l.label === "hot" ? <Flame className="w-3 h-3" /> : l.label === "warm" ? <Star className="w-3 h-3" /> : <Snowflake className="w-3 h-3" />}
                    {(l.title || l.contact_hint || `Lead ${l.index + 1}`).slice(0, 30)}…
                  </button>
                ))}
              </div>
            )}

            <div className="rounded-2xl p-5 space-y-4" style={card}>
              <div className="flex items-center justify-between">
                <p className="font-bold" style={{ color: "var(--color-text)" }}>AI personalized message</p>
                {outreach && (
                  <p className="text-xs font-semibold px-2 py-1 rounded-lg"
                    style={{ backgroundColor: "rgba(29,185,84,0.1)", color: GREEN }}>
                    ✓ Recommended: {outreach.best_platform}
                  </p>
                )}
              </div>

              {generatingMsg && (
                <div className="flex items-center gap-2 py-6 justify-center">
                  <Loader2 className="w-5 h-5 animate-spin" style={{ color: AMBER }} />
                  <p className="text-sm" style={{ color: "#A8967E" }}>AI writing message…</p>
                </div>
              )}

              {outreach && !generatingMsg && (outreach.warning || outreach.lead_kind === "business") && (
                <div className="rounded-xl px-4 py-3 flex items-start gap-2"
                  style={{ backgroundColor: "rgba(245,158,11,0.1)", border: `1px solid ${AMBER}40` }}>
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: AMBER }} />
                  <div className="text-xs leading-relaxed" style={{ color: "#78614E" }}>
                    <p className="font-bold mb-1" style={{ color: AMBER }}>
                      ⚠ Lead flagged as {outreach.lead_kind === "business" ? "competitor (another provider)" : "unclear"}
                    </p>
                    <p>{outreach.warning || "This lead appears to offer services similar to yours rather than looking for them. Verify the source and pick a lead from Facebook Groups or Reddit where people are asking for recommendations."}</p>
                  </div>
                </div>
              )}

              {outreach && !generatingMsg && (
                <>
                  <div className="flex gap-2 flex-wrap">
                    {Object.keys(outreach.messages).map(platform => (
                      <button key={platform} type="button" onClick={() => setActivePlatform(platform)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all"
                        style={activePlatform === platform
                          ? { backgroundColor: `${AMBER}15`, color: AMBER, border: `1px solid ${AMBER}50` }
                          : { backgroundColor: "rgba(245,215,160,0.08)", color: "#78614E", border: "1px solid rgba(245,215,160,0.15)" }}>
                        {platform === "email" ? `📧 ${platform}` : platform === "reddit" ? `🟠 ${platform}` : platform === "facebook" ? `👥 ${platform}` : `💬 ${platform}`}
                      </button>
                    ))}
                  </div>
                  {activePlatform === "email" && outreach.subject_line && (
                    <div className="rounded-lg px-3 py-2" style={{ backgroundColor: "rgba(245,215,160,0.08)", border: "1px solid rgba(245,215,160,0.2)" }}>
                      <span className="text-xs font-bold" style={{ color: "#78614E" }}>Subject: </span>
                      <span className="text-xs" style={{ color: "var(--color-text)" }}>{outreach.subject_line}</span>
                    </div>
                  )}
                  <div className="relative">
                    <textarea value={outreach.messages[activePlatform as keyof typeof outreach.messages] || ""}
                      onChange={() => {}} readOnly rows={5}
                      className="w-full pl-4 pr-24 py-3 rounded-xl text-sm resize-none focus:outline-none"
                      style={{ border: `1px solid ${AMBER}25`, backgroundColor: "#FFFDF9", color: "var(--color-text)" }} />
                    <button type="button"
                      onClick={() => copyMessage(outreach.messages[activePlatform as keyof typeof outreach.messages] || "")}
                      className="absolute top-2 right-2 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold"
                      style={{ backgroundColor: copied ? `${GREEN}15` : `${AMBER}15`, color: copied ? GREEN : AMBER }}>
                      {copied ? <><Check className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy</>}
                    </button>
                  </div>
                  <button type="button" onClick={() => selectedLead && handleGenerateMessage(selectedLead)}
                    className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#A8967E" }}>
                    <RefreshCw className="w-3.5 h-3.5" /> Regenerate message
                  </button>
                </>
              )}
            </div>

            {/* ── Step Guide + Marketing Advisor ───────────────────────────── */}
            {outreach && !generatingMsg && (
              <StepGuide step={5} offerType={offerType} offerText={offerText} audienceType={audienceType}
                location={location} budgetRange={budgetRange} leadsCount={leads.length} />
            )}
            {outreach && !generatingMsg && (
              <MarketingAdvisor step={5} offerType={offerType} offerDescription={offerText}
                audienceType={audienceType} location={location} budgetRange={budgetRange}
                country={marketScope === "country" ? marketCountry : undefined}
                contentLanguage={contentLanguage} marketScope={marketScope}
                onLimitReached={setLimitReached} onPremiumActionConsumed={setPremiumActionRemaining}
                context={{ selected_lead: selectedLead, best_platform: outreach?.best_platform }} />
            )}

            {/* ── Campaign Builder ─────────────────────────────────────────── */}
            {outreach && !generatingMsg && (
              <div className="space-y-3">

                {/* Contact info (collapsible) */}
                <div className="rounded-2xl overflow-hidden" style={card}>
                  <button type="button" onClick={() => setShowContactForm(v => !v)}
                    className="w-full flex items-center justify-between px-5 py-4"
                    style={{ backgroundColor: "transparent" }}>
                    <div className="flex items-center gap-2">
                      <span className="text-base">📋</span>
                      <p className="font-bold text-sm" style={{ color: "var(--color-text)" }}>Your contact details</p>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(245,158,11,0.1)", color: AMBER }}>
                        optional — for campaign
                      </span>
                    </div>
                    <span style={{ color: "#A8967E" }}>{showContactForm ? "▲" : "▼"}</span>
                  </button>
                  {showContactForm && (
                    <div className="px-5 pb-5 grid grid-cols-2 gap-3">
                      {[
                        { label: "📱 Phone", val: contactPhone, set: setContactPhone, ph: "+1 555 123 4567" },
                        { label: "📧 Email", val: contactEmail, set: setContactEmail, ph: "you@email.com" },
                        { label: "🌐 Website", val: contactWebsite, set: setContactWebsite, ph: "your-site.com" },
                        { label: "💬 WhatsApp", val: contactWhatsapp, set: setContactWhatsapp, ph: "+1 555 123 4567" },
                        { label: "📸 Instagram", val: contactInstagram, set: setContactInstagram, ph: "@username" },
                        { label: "👥 Facebook", val: contactFacebook, set: setContactFacebook, ph: "your-page" },
                      ].map(({ label, val, set, ph }) => (
                        <div key={label}>
                          <p className="text-xs font-semibold mb-1" style={{ color: "#78614E" }}>{label}</p>
                          <input type="text" value={val} onChange={e => set(e.target.value)} placeholder={ph}
                            className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                            style={{ border: `1px solid ${AMBER}25`, backgroundColor: "#FFFDF9", color: "var(--color-text)" }} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Event type filters */}
                <div className="rounded-2xl p-4 space-y-3" style={card}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold" style={{ color: "#78614E" }}>Event type:</span>
                    {EVENT_TYPES.map(ev => (
                      <button key={ev.id} type="button" onClick={() => toggleEventType(ev.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                        style={campaignEventTypes.includes(ev.id)
                          ? { backgroundColor: `${AMBER}20`, color: AMBER, border: `1px solid ${AMBER}50` }
                          : { backgroundColor: "rgba(245,215,160,0.06)", color: "#A8967E", border: "1px solid rgba(245,215,160,0.15)" }}>
                        {ev.emoji} {ev.label}
                      </button>
                    ))}
                  </div>
                  {location && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold" style={{ color: "#78614E" }}>Location:</span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                        style={{ backgroundColor: "rgba(29,185,84,0.08)", color: GREEN }}>
                        📍 {location}
                      </span>
                    </div>
                  )}
                </div>

                {/* Generate button */}
                <button type="button" onClick={handleGenerateCampaign} disabled={generatingCampaign}
                  className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-bold text-base transition-all hover:scale-[1.02] disabled:opacity-60 disabled:scale-100"
                  style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))", color: "#1C1814", boxShadow: "0 4px 20px rgba(245,158,11,0.35)" }}>
                  {generatingCampaign
                    ? <><Loader2 className="w-5 h-5 animate-spin" /> AI building complete campaign…</>
                    : <><Wand2 className="w-5 h-5" /> Generate Complete Campaign — 9 assets</>}
                </button>

                {campaignError && (
                  <p className="text-sm text-center" style={{ color: RED }}>{campaignError}</p>
                )}

                {/* Campaign results */}
                {campaign && (
                  <div className="rounded-2xl overflow-hidden" style={{ ...card, border: `1px solid ${AMBER}30` }}>
                    <div className="flex items-center justify-between px-5 py-4"
                      style={{ borderBottom: `1px solid ${AMBER}15`, background: `linear-gradient(135deg, ${AMBER}08, transparent)` }}>
                      <p className="font-bold" style={{ color: "var(--color-text)" }}>🚀 Complete campaign</p>
                      <span className="text-xs font-bold px-2 py-1 rounded-full"
                        style={{ backgroundColor: `${GREEN}15`, color: GREEN }}>9 assets generated</span>
                    </div>

                    {/* Tab bar */}
                    <div className="flex overflow-x-auto border-b" style={{ borderColor: `${AMBER}15` }}>
                      {CAMPAIGN_TABS.map(tab => (
                        <button key={tab.id} type="button" onClick={() => setActiveCampaignTab(tab.id)}
                          className="flex-shrink-0 flex items-center gap-1.5 px-4 py-3 text-xs font-bold whitespace-nowrap transition-all"
                          style={activeCampaignTab === tab.id
                            ? { borderBottom: `2px solid ${AMBER}`, color: AMBER, backgroundColor: `${AMBER}08` }
                            : { borderBottom: "2px solid transparent", color: "#A8967E" }}>
                          <span>{tab.emoji}</span> {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* Tab content */}
                    <div className="p-5 space-y-3">

                      {activeCampaignTab === "sms" && campaign.sms && (
                        <>
                          <p className="text-xs font-bold" style={{ color: "#78614E" }}>📱 SMS message — max 160 characters</p>
                          <div className="relative">
                            <textarea value={campaign.sms.text} readOnly rows={3}
                              className="w-full pl-4 pr-24 py-3 rounded-xl text-sm resize-none focus:outline-none"
                              style={{ border: `1px solid ${AMBER}25`, backgroundColor: "#FFFDF9", color: "var(--color-text)" }} />
                            <button type="button" onClick={() => copyCampaign("sms", campaign.sms.text)}
                              className="absolute top-2 right-2 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold"
                              style={{ backgroundColor: copiedCampaign === "sms" ? `${GREEN}15` : `${AMBER}15`, color: copiedCampaign === "sms" ? GREEN : AMBER }}>
                              {copiedCampaign === "sms" ? <><Check className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy</>}
                            </button>
                          </div>
                          <p className="text-xs" style={{ color: "#A8967E" }}>{campaign.sms.text.length}/160 characters</p>
                        </>
                      )}

                      {activeCampaignTab === "email" && campaign.email && (
                        <>
                          <div className="rounded-lg px-3 py-2 space-y-1" style={{ backgroundColor: "rgba(245,215,160,0.08)", border: `1px solid ${AMBER}20` }}>
                            <p className="text-xs"><span className="font-bold" style={{ color: "#78614E" }}>Subject: </span><span style={{ color: "var(--color-text)" }}>{campaign.email.subject}</span></p>
                            <p className="text-xs"><span className="font-bold" style={{ color: "#78614E" }}>Preview: </span><span style={{ color: "#A8967E" }}>{campaign.email.preview}</span></p>
                          </div>
                          <div className="relative">
                            <textarea value={campaign.email.body} readOnly rows={8}
                              className="w-full pl-4 pr-24 py-3 rounded-xl text-sm resize-none focus:outline-none"
                              style={{ border: `1px solid ${AMBER}25`, backgroundColor: "#FFFDF9", color: "var(--color-text)" }} />
                            <button type="button" onClick={() => copyCampaign("email", `Subject: ${campaign.email.subject}\n\n${campaign.email.body}`)}
                              className="absolute top-2 right-2 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold"
                              style={{ backgroundColor: copiedCampaign === "email" ? `${GREEN}15` : `${AMBER}15`, color: copiedCampaign === "email" ? GREEN : AMBER }}>
                              {copiedCampaign === "email" ? <><Check className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy</>}
                            </button>
                          </div>
                        </>
                      )}

                      {activeCampaignTab === "whatsapp" && campaign.whatsapp && (
                        <>
                          <p className="text-xs font-bold" style={{ color: "#78614E" }}>💬 WhatsApp message</p>
                          <div className="relative">
                            <textarea value={campaign.whatsapp.text} readOnly rows={4}
                              className="w-full pl-4 pr-24 py-3 rounded-xl text-sm resize-none focus:outline-none"
                              style={{ border: `1px solid ${AMBER}25`, backgroundColor: "#FFFDF9", color: "var(--color-text)" }} />
                            <button type="button" onClick={() => copyCampaign("whatsapp", campaign.whatsapp.text)}
                              className="absolute top-2 right-2 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold"
                              style={{ backgroundColor: copiedCampaign === "whatsapp" ? `${GREEN}15` : `${AMBER}15`, color: copiedCampaign === "whatsapp" ? GREEN : AMBER }}>
                              {copiedCampaign === "whatsapp" ? <><Check className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy</>}
                            </button>
                          </div>
                        </>
                      )}

                      {activeCampaignTab === "facebook_post" && campaign.facebook_post && (
                        <>
                          <p className="text-xs font-bold" style={{ color: "#78614E" }}>👥 Facebook post</p>
                          <div className="relative">
                            <textarea value={campaign.facebook_post.text} readOnly rows={5}
                              className="w-full pl-4 pr-24 py-3 rounded-xl text-sm resize-none focus:outline-none"
                              style={{ border: `1px solid ${AMBER}25`, backgroundColor: "#FFFDF9", color: "var(--color-text)" }} />
                            <button type="button" onClick={() => copyCampaign("fb", campaign.facebook_post.text)}
                              className="absolute top-2 right-2 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold"
                              style={{ backgroundColor: copiedCampaign === "fb" ? `${GREEN}15` : `${AMBER}15`, color: copiedCampaign === "fb" ? GREEN : AMBER }}>
                              {copiedCampaign === "fb" ? <><Check className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy</>}
                            </button>
                          </div>
                          <div className="rounded-lg px-3 py-2" style={{ backgroundColor: "rgba(245,215,160,0.08)", border: `1px solid ${AMBER}20` }}>
                            <span className="text-xs font-bold" style={{ color: "#78614E" }}>CTA button: </span>
                            <span className="text-xs font-semibold" style={{ color: AMBER }}>{campaign.facebook_post.cta}</span>
                          </div>
                        </>
                      )}

                      {activeCampaignTab === "instagram_post" && campaign.instagram_post && (
                        <>
                          <p className="text-xs font-bold" style={{ color: "#78614E" }}>📸 Instagram caption</p>
                          <div className="relative">
                            <textarea value={campaign.instagram_post.caption} readOnly rows={4}
                              className="w-full pl-4 pr-24 py-3 rounded-xl text-sm resize-none focus:outline-none"
                              style={{ border: `1px solid ${AMBER}25`, backgroundColor: "#FFFDF9", color: "var(--color-text)" }} />
                            <button type="button" onClick={() => copyCampaign("ig", campaign.instagram_post.caption)}
                              className="absolute top-2 right-2 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold"
                              style={{ backgroundColor: copiedCampaign === "ig" ? `${GREEN}15` : `${AMBER}15`, color: copiedCampaign === "ig" ? GREEN : AMBER }}>
                              {copiedCampaign === "ig" ? <><Check className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy</>}
                            </button>
                          </div>
                          <p className="text-xs font-bold mt-2" style={{ color: "#78614E" }}>📲 Story</p>
                          <div className="space-y-2">
                            <div className="rounded-lg px-3 py-2" style={{ backgroundColor: "rgba(245,215,160,0.1)", border: `1px solid ${AMBER}20` }}>
                              <span className="text-xs font-bold" style={{ color: "#78614E" }}>Hook (3 sec): </span>
                              <span className="text-xs font-semibold" style={{ color: "var(--color-text)" }}>{campaign.instagram_post.story_hook}</span>
                            </div>
                            {(campaign.instagram_post.story_slides || []).map((slide, i) => (
                              <div key={i} className="rounded-lg px-3 py-2" style={{ backgroundColor: "rgba(245,215,160,0.05)", border: `1px solid ${AMBER}15` }}>
                                <span className="text-xs font-bold" style={{ color: "#A8967E" }}>Slide {i + 1}: </span>
                                <span className="text-xs" style={{ color: "var(--color-text)" }}>{slide}</span>
                              </div>
                            ))}
                            <div className="rounded-lg px-3 py-2" style={{ backgroundColor: `${GREEN}08`, border: `1px solid ${GREEN}25` }}>
                              <span className="text-xs font-bold" style={{ color: GREEN }}>CTA: </span>
                              <span className="text-xs" style={{ color: "var(--color-text)" }}>{campaign.instagram_post.story_cta}</span>
                            </div>
                          </div>
                          <button type="button" onClick={() => copyCampaign("story", [campaign.instagram_post.story_hook, ...(campaign.instagram_post.story_slides || []), campaign.instagram_post.story_cta].join("\n---\n"))}
                            className="flex items-center gap-1 text-xs font-bold"
                            style={{ color: copiedCampaign === "story" ? GREEN : AMBER }}>
                            {copiedCampaign === "story" ? <><Check className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy Story</>}
                          </button>
                        </>
                      )}

                      {activeCampaignTab === "tiktok" && campaign.tiktok && (
                        <>
                          <div className="rounded-lg px-3 py-2" style={{ backgroundColor: `${AMBER}10`, border: `1px solid ${AMBER}30` }}>
                            <span className="text-xs font-bold" style={{ color: "#78614E" }}>🎣 Hook (first 3 sec): </span>
                            <span className="text-xs font-bold" style={{ color: "var(--color-text)" }}>{campaign.tiktok.hook}</span>
                          </div>
                          <p className="text-xs font-bold" style={{ color: "#78614E" }}>📝 Voiceover script</p>
                          <div className="relative">
                            <textarea value={campaign.tiktok.script} readOnly rows={6}
                              className="w-full pl-4 pr-24 py-3 rounded-xl text-sm resize-none focus:outline-none"
                              style={{ border: `1px solid ${AMBER}25`, backgroundColor: "#FFFDF9", color: "var(--color-text)" }} />
                            <button type="button" onClick={() => copyCampaign("tiktok", `HOOK: ${campaign.tiktok.hook}\n\n${campaign.tiktok.script}\n\nCTA: ${campaign.tiktok.cta}`)}
                              className="absolute top-2 right-2 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold"
                              style={{ backgroundColor: copiedCampaign === "tiktok" ? `${GREEN}15` : `${AMBER}15`, color: copiedCampaign === "tiktok" ? GREEN : AMBER }}>
                              {copiedCampaign === "tiktok" ? <><Check className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy</>}
                            </button>
                          </div>
                          <div className="flex gap-2">
                            <div className="flex-1 rounded-lg px-3 py-2" style={{ backgroundColor: `${GREEN}08`, border: `1px solid ${GREEN}25` }}>
                              <span className="text-xs font-bold" style={{ color: GREEN }}>Final CTA: </span>
                              <span className="text-xs" style={{ color: "var(--color-text)" }}>{campaign.tiktok.cta}</span>
                            </div>
                          </div>
                          <p className="text-xs font-bold" style={{ color: "#78614E" }}>Caption + hashtags</p>
                          <div className="relative">
                            <textarea value={campaign.tiktok.caption} readOnly rows={2}
                              className="w-full pl-4 pr-24 py-3 rounded-xl text-sm resize-none focus:outline-none"
                              style={{ border: `1px solid ${AMBER}25`, backgroundColor: "#FFFDF9", color: "var(--color-text)" }} />
                            <button type="button" onClick={() => copyCampaign("tiktok_cap", campaign.tiktok.caption)}
                              className="absolute top-2 right-2 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold"
                              style={{ backgroundColor: copiedCampaign === "tiktok_cap" ? `${GREEN}15` : `${AMBER}15`, color: copiedCampaign === "tiktok_cap" ? GREEN : AMBER }}>
                              {copiedCampaign === "tiktok_cap" ? <><Check className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy</>}
                            </button>
                          </div>
                        </>
                      )}

                      {activeCampaignTab === "landing_page" && campaign.landing_page && (
                        <>
                          <div className="space-y-2">
                            <div className="rounded-xl px-4 py-3 text-center" style={{ background: `linear-gradient(135deg, ${AMBER}10, ${AMBER}05)`, border: `1px solid ${AMBER}25` }}>
                              <p className="font-bold text-lg" style={{ color: "var(--color-text)" }}>{campaign.landing_page.headline}</p>
                              <p className="text-sm mt-1" style={{ color: "#78614E" }}>{campaign.landing_page.subheadline}</p>
                            </div>
                            <p className="text-xs font-bold" style={{ color: "#78614E" }}>✅ Benefits</p>
                            <div className="space-y-1">
                              {(campaign.landing_page.bullets || []).map((b, i) => (
                                <div key={i} className="flex items-start gap-2 text-sm" style={{ color: "var(--color-text)" }}>
                                  <span style={{ color: GREEN }}>✓</span> {b}
                                </div>
                              ))}
                            </div>
                            <div className="rounded-xl p-3 text-center" style={{ backgroundColor: `${AMBER}15`, border: `1px solid ${AMBER}30` }}>
                              <p className="font-bold text-sm" style={{ color: "#1C1814", backgroundColor: AMBER, display: "inline-block", padding: "6px 16px", borderRadius: 8 }}>
                                {campaign.landing_page.cta_button}
                              </p>
                              <p className="text-xs mt-1" style={{ color: "#A8967E" }}>{campaign.landing_page.cta_subtext}</p>
                            </div>
                            <div className="rounded-lg px-3 py-2" style={{ backgroundColor: "rgba(245,215,160,0.05)", border: `1px solid ${AMBER}15` }}>
                              <p className="text-xs font-bold mb-1" style={{ color: "#78614E" }}>Contact block</p>
                              <p className="text-xs whitespace-pre-wrap" style={{ color: "var(--color-text)" }}>{campaign.landing_page.contact_block}</p>
                            </div>
                          </div>
                          <button type="button" onClick={() => copyCampaign("lp", [campaign.landing_page.headline, campaign.landing_page.subheadline, ...(campaign.landing_page.bullets || []).map(b => `✓ ${b}`), campaign.landing_page.cta_button, campaign.landing_page.contact_block].join("\n\n"))}
                            className="flex items-center gap-1 text-xs font-bold"
                            style={{ color: copiedCampaign === "lp" ? GREEN : AMBER }}>
                            {copiedCampaign === "lp" ? <><Check className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy all</>}
                          </button>
                        </>
                      )}

                      {activeCampaignTab === "video_brief" && campaign.video_brief && (
                        <>
                          <div className="rounded-lg px-3 py-2" style={{ backgroundColor: `${AMBER}08`, border: `1px solid ${AMBER}20` }}>
                            <span className="text-xs font-bold" style={{ color: "#78614E" }}>Concept: </span>
                            <span className="text-xs" style={{ color: "var(--color-text)" }}>{campaign.video_brief.concept}</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-xs px-2 py-1 rounded-full font-semibold" style={{ backgroundColor: `${AMBER}10`, color: AMBER }}>⏱ {campaign.video_brief.duration}</span>
                            <span className="text-xs px-2 py-1 rounded-full font-semibold" style={{ backgroundColor: "rgba(245,215,160,0.08)", color: "#78614E" }}>🎵 {campaign.video_brief.music}</span>
                          </div>
                          <p className="text-xs font-bold" style={{ color: "#78614E" }}>🎬 Scenes</p>
                          <div className="space-y-2">
                            {(campaign.video_brief.scenes || []).map((scene, i) => (
                              <div key={i} className="rounded-lg px-3 py-2" style={{ backgroundColor: "rgba(245,215,160,0.05)", border: `1px solid ${AMBER}15` }}>
                                <span className="text-xs font-bold" style={{ color: AMBER }}>Scene {i + 1}: </span>
                                <span className="text-xs" style={{ color: "var(--color-text)" }}>{scene}</span>
                              </div>
                            ))}
                          </div>
                          <div className="rounded-lg px-3 py-2" style={{ backgroundColor: `${GREEN}08`, border: `1px solid ${GREEN}25` }}>
                            <span className="text-xs font-bold" style={{ color: GREEN }}>Caption: </span>
                            <span className="text-xs" style={{ color: "var(--color-text)" }}>{campaign.video_brief.caption}</span>
                          </div>
                          <button type="button" onClick={() => copyCampaign("vb", [campaign.video_brief.concept, `Duration: ${campaign.video_brief.duration}`, `Music: ${campaign.video_brief.music}`, ...(campaign.video_brief.scenes || []).map((s, i) => `Scene ${i+1}: ${s}`), `Caption: ${campaign.video_brief.caption}`].join("\n\n"))}
                            className="flex items-center gap-1 text-xs font-bold"
                            style={{ color: copiedCampaign === "vb" ? GREEN : AMBER }}>
                            {copiedCampaign === "vb" ? <><Check className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy Brief</>}
                          </button>
                        </>
                      )}

                      {activeCampaignTab === "photo_brief" && campaign.photo_brief && (
                        <>
                          <div className="rounded-lg px-3 py-2" style={{ backgroundColor: `${AMBER}08`, border: `1px solid ${AMBER}20` }}>
                            <span className="text-xs font-bold" style={{ color: "#78614E" }}>Concept: </span>
                            <span className="text-xs" style={{ color: "var(--color-text)" }}>{campaign.photo_brief.concept}</span>
                          </div>
                          <div className="rounded-lg px-3 py-2" style={{ backgroundColor: "rgba(245,215,160,0.05)", border: `1px solid ${AMBER}15` }}>
                            <span className="text-xs font-bold" style={{ color: "#78614E" }}>Style: </span>
                            <span className="text-xs" style={{ color: "var(--color-text)" }}>{campaign.photo_brief.style}</span>
                          </div>
                          <p className="text-xs font-bold" style={{ color: "#78614E" }}>📷 Photos to take</p>
                          <div className="space-y-2">
                            {(campaign.photo_brief.shots || []).map((shot, i) => (
                              <div key={i} className="rounded-lg px-3 py-2" style={{ backgroundColor: "rgba(245,215,160,0.05)", border: `1px solid ${AMBER}15` }}>
                                <span className="text-xs font-bold" style={{ color: AMBER }}>Shot {i + 1}: </span>
                                <span className="text-xs" style={{ color: "var(--color-text)" }}>{shot}</span>
                              </div>
                            ))}
                          </div>
                          <div className="rounded-lg px-3 py-2" style={{ backgroundColor: `${GREEN}08`, border: `1px solid ${GREEN}25` }}>
                            <span className="text-xs font-bold" style={{ color: GREEN }}>Post caption: </span>
                            <span className="text-xs" style={{ color: "var(--color-text)" }}>{campaign.photo_brief.caption}</span>
                          </div>
                          <button type="button" onClick={() => copyCampaign("pb", [campaign.photo_brief.concept, `Style: ${campaign.photo_brief.style}`, ...(campaign.photo_brief.shots || []).map((s, i) => `Shot ${i+1}: ${s}`), `Caption: ${campaign.photo_brief.caption}`].join("\n\n"))}
                            className="flex items-center gap-1 text-xs font-bold"
                            style={{ color: copiedCampaign === "pb" ? GREEN : AMBER }}>
                            {copiedCampaign === "pb" ? <><Check className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy Brief</>}
                          </button>
                        </>
                      )}

                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(4)}
                className="flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm"
                style={{ backgroundColor: "rgba(245,215,160,0.1)", color: "#78614E", border: "1px solid rgba(245,215,160,0.2)" }}>
                <ArrowLeft className="w-4 h-4" /> Back to leads
              </button>
              <button type="button" onClick={() => { setStep(1); setOfferText(""); setSuggestion(null); setLeads([]); setOutreach(null); }}
                className="flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm"
                style={{ backgroundColor: "rgba(245,215,160,0.08)", color: "#78614E", border: "1px solid rgba(245,215,160,0.15)" }}>
                <RefreshCw className="w-4 h-4" /> New search
              </button>
            </div>
          </div>
        )}

      {/* ── Campaign Studio — central AI agent chat frame ─────────────────── */}
      <CampaignStudio
        sessionId={sessionId}
        step={step}
        offerType={offerType}
        offerText={offerText}
        audienceType={audienceType}
        location={location}
        budgetRange={budgetRange}
        offerSummary={suggestion?.offer_summary}
        activeLead={selectedLead ?? undefined}
        campaignDone={!!campaign}
        country={marketScope === "country" ? marketCountry : undefined}
        contentLanguage={contentLanguage}
        marketScope={marketScope}
        onLimitReached={setLimitReached}
        onPremiumActionConsumed={setPremiumActionRemaining}
      />

      {/* ── Cost Meter (visible to client) ────────────────────────────────── */}
      <CostMeter sessionId={sessionId} refreshTrigger={costRefresh} campaignValue={parseFloat(campaignValue) || 0} campaignValueCurrency={campaignValueCurrency} />

      {/* ── Adjacent Services — adaptive per campaign type ────────────────── */}
      <AdjacentServicesPanel offerType={offerType} />

      </div>

      <UpgradePromptModal payload={limitReached} onClose={() => setLimitReached(null)} />
    </div>
  );
}
