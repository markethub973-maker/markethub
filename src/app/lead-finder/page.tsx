"use client";

import { useState } from "react";
import Header from "@/components/layout/Header";
import MarketingAdvisor from "@/components/lead-finder/MarketingAdvisor";
import {
  Wand2, Search, Users, Globe, Zap, ArrowRight, ArrowLeft,
  Check, X, Plus, Loader2, Star, Flame, Snowflake, Copy,
  MessageSquare, RefreshCw, MapPin, Building2, User, Package,
  Link, ShoppingCart, Target, ChevronDown, ChevronUp,
  ToggleLeft, ToggleRight, AlertCircle, Pencil, Bookmark, BookmarkCheck,
} from "lucide-react";

// ── Constants ────────────────────────────────────────────────────────────────
const AMBER = "#F59E0B";
const GREEN = "#1DB954";
const RED   = "#EF4444";
const card  = { backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" };

const OFFER_TYPES = [
  { id: "service",   icon: Zap,         label: "Serviciu",         desc: "DJ, fotograf, curier, consultant…" },
  { id: "product",   icon: Package,     label: "Produs fizic",     desc: "Echipament, marfă, handmade…" },
  { id: "affiliate", icon: Link,        label: "Afiliat",          desc: "Promovezi produsul altcuiva" },
  { id: "software",  icon: ShoppingCart,label: "Software / SaaS",  desc: "App, tool, abonament digital…" },
];

const AUDIENCE_TYPES = [
  { id: "b2c", label: "Persoane fizice" },
  { id: "b2b", label: "Companii" },
  { id: "both", label: "Ambele" },
];

const BUDGET_RANGES = [
  { id: "low",    label: "< €100" },
  { id: "mid",    label: "€100 – €500" },
  { id: "high",   label: "€500 – €2000" },
  { id: "vhigh",  label: "> €2000" },
];

const EVENT_TYPES = [
  { id: "nuntă",      label: "Nuntă",      emoji: "💍" },
  { id: "botez",      label: "Botez",      emoji: "👶" },
  { id: "corporate",  label: "Corporate",  emoji: "🏢" },
  { id: "petrecere",  label: "Petrecere",  emoji: "🎉" },
  { id: "aniversare", label: "Aniversare", emoji: "🎂" },
  { id: "majorat",    label: "Majorat",    emoji: "🎓" },
];

const CAMPAIGN_TABS = [
  { id: "sms",          label: "SMS",          emoji: "📱" },
  { id: "email",        label: "Email",         emoji: "📧" },
  { id: "whatsapp",     label: "WhatsApp",      emoji: "💬" },
  { id: "facebook_post",label: "Facebook Post", emoji: "👥" },
  { id: "instagram_post",label: "Instagram",   emoji: "📸" },
  { id: "tiktok",       label: "TikTok/Reel",  emoji: "🎵" },
  { id: "landing_page", label: "Landing Page",  emoji: "🌐" },
  { id: "video_brief",  label: "Brief Video",   emoji: "🎬" },
  { id: "photo_brief",  label: "Brief Foto",    emoji: "📷" },
];

const PLATFORM_ICONS: Record<string, string> = {
  google: "🔍", google_maps: "🗺️", reddit: "🟠",
  facebook_groups: "👥", instagram_hashtag: "📸",
  tiktok_hashtag: "🎵", olx: "🛒", reviews: "⭐",
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
  const steps = ["Ofertă", "Audiență", "Surse AI", "Leads", "Outreach"];
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

  // Step 1 — Offer
  const [offerType, setOfferType] = useState("service");
  const [offerText, setOfferText] = useState("");

  // Step 2 — Audience
  const [audienceType, setAudienceType] = useState("both");
  const [location, setLocation] = useState("România");
  const [budgetRange, setBudgetRange] = useState("mid");

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

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setAnalyzeError("");
    setSuggestion(null);
    const res = await fetch("/api/find-clients/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offer_type: offerType, offer_description: offerText, audience_type: audienceType, location, budget_range: budgetRange }),
    });
    const data = await res.json();
    setAnalyzing(false);
    if (!res.ok) { setAnalyzeError(data.error || "Eroare AI"); return; }
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
      setSearchProgress(p => [...p, `Caut pe ${src.platform}…`]);
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
        const r = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
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
        setSearchProgress(p => [...p.slice(0, -1), `✓ ${src.platform} — ${tagged.length} rezultate`]);
      } catch {
        setSearchProgress(p => [...p.slice(0, -1), `✗ ${src.platform} — eroare`]);
      }
    }

    setRawResults(allResults);
    setSearching(false);
    if (!allResults.length) { setSearchError("Niciun rezultat. Încearcă alte cuvinte-cheie."); setStep(4); return; }

    setScoring(true);
    try {
      const res = await fetch("/api/find-clients/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ results: allResults, offer_summary: suggestion.offer_summary, intent_signals: suggestion.intent_signals }),
      });
      const scoreData = await res.json();
      if (scoreData.scored) {
        const merged: Lead[] = scoreData.scored.map((s: any) => ({ ...s, ...(allResults[s.index] || {}) }));
        merged.sort((a, b) => b.score - a.score);
        setLeads(merged);
      }
    } catch {
      setLeads(allResults.map((r, i) => ({ index: i, score: 5, label: "warm" as const, signals: [], contact_hint: "", why: "", ...r })));
    }
    setScoring(false);
    setStep(4);
  };

  const handleSaveLead = async (lead: Lead) => {
    setSavingId(lead.index);
    setSaveGoal(null);
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lead, offer_summary: suggestion?.offer_summary, outreach_hook: suggestion?.outreach_hook }),
    });
    const data = await res.json();
    setGeneratingMsg(false);
    if (!res.ok) return;
    setOutreach(data);
    setActivePlatform(data.best_platform || "generic");
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
      headers: { "Content-Type": "application/json" },
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
      }),
    });
    const data = await res.json();
    setGeneratingCampaign(false);
    if (!res.ok) { setCampaignError(data.error || "Eroare generare campanie"); return; }
    setCampaign(data);
    setActiveCampaignTab("sms");
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
        subtitle="Găsește prospecți calificați în orice nișă cu ajutorul AI"
      />
      <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">

        <Stepper step={step} />

        {/* ══ STEP 1 — Ofertă ══════════════════════════════════════════════ */}
        {step === 1 && (
          <div className="space-y-4">
          <div className="rounded-2xl p-6 space-y-5" style={card}>
            <div>
              <h2 className="text-xl font-bold mb-1" style={{ color: "#292524" }}>Ce vinzi sau promovezi?</h2>
              <p className="text-sm" style={{ color: "#A8967E" }}>Fii specific — AI-ul va genera strategia optimă de găsire a clienților</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {OFFER_TYPES.map(({ id, icon: Icon, label, desc }) => (
                <button key={id} type="button" onClick={() => setOfferType(id)}
                  className="flex flex-col items-start gap-1.5 p-4 rounded-xl text-left transition-all"
                  style={offerType === id
                    ? { backgroundColor: `${AMBER}12`, border: `2px solid ${AMBER}`, boxShadow: `0 0 0 4px ${AMBER}10` }
                    : { backgroundColor: "rgba(245,215,160,0.06)", border: "1px solid rgba(245,215,160,0.2)" }}>
                  <Icon className="w-5 h-5" style={{ color: offerType === id ? AMBER : "#A8967E" }} />
                  <span className="font-bold text-sm" style={{ color: "#292524" }}>{label}</span>
                  <span className="text-xs" style={{ color: "#A8967E" }}>{desc}</span>
                </button>
              ))}
            </div>
            <div>
              <label className="text-xs font-bold mb-2 block" style={{ color: "#78614E" }}>
                Descrie oferta ta în 1-2 propoziții
              </label>
              <textarea value={offerText} onChange={e => setOfferText(e.target.value)}
                rows={3} placeholder={
                  offerType === "service" ? "Ex: Servicii DJ și solist voce pentru nunți, botezuri și corporate în București și Ilfov" :
                  offerType === "affiliate" ? "Ex: Promovez un curs online de fotografie pentru fotografi amatori" :
                  "Descrie ce vinzi și cui îi este util..."
                }
                className="w-full px-4 py-3 rounded-xl text-sm resize-none focus:outline-none"
                style={{ border: `1px solid ${AMBER}30`, backgroundColor: "#FFFDF9", color: "#292524" }} />
            </div>
            <button type="button" onClick={() => setStep(2)} disabled={!offerText.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold disabled:opacity-40 transition-all"
              style={{ backgroundColor: AMBER, color: "#1C1814" }}>
              Înainte — Definesc audiența <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          {offerText.trim().length > 10 && (
            <MarketingAdvisor step={1} offerType={offerType} offerDescription={offerText}
              audienceType={audienceType} location={location} budgetRange={budgetRange} />
          )}
          </div>
        )}

        {/* ══ STEP 2 — Audiență ════════════════════════════════════════════ */}
        {step === 2 && (
          <div className="space-y-4">
          <div className="rounded-2xl p-6 space-y-5" style={card}>
            <div>
              <h2 className="text-xl font-bold mb-1" style={{ color: "#292524" }}>Cine este clientul ideal?</h2>
              <p className="text-sm" style={{ color: "#A8967E" }}>Cu cât ești mai specific, cu atât leads-urile sunt mai relevante</p>
            </div>
            <div>
              <p className="text-xs font-bold mb-2" style={{ color: "#78614E" }}>Tip client</p>
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
            <div>
              <p className="text-xs font-bold mb-2" style={{ color: "#78614E" }}>Locație țintă</p>
              <input value={location} onChange={e => setLocation(e.target.value)}
                placeholder="Ex: București, România sau Europe"
                className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none"
                style={{ border: `1px solid ${AMBER}30`, backgroundColor: "#FFFDF9", color: "#292524" }} />
            </div>
            <div>
              <p className="text-xs font-bold mb-2" style={{ color: "#78614E" }}>Buget estimat al clientului</p>
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
            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(1)}
                className="flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm"
                style={{ backgroundColor: "rgba(245,215,160,0.1)", color: "#78614E", border: "1px solid rgba(245,215,160,0.2)" }}>
                <ArrowLeft className="w-4 h-4" /> Înapoi
              </button>
              <button type="button" onClick={handleAnalyze} disabled={analyzing}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all disabled:opacity-60"
                style={{ background: `linear-gradient(135deg, ${AMBER}, #D97706)`, color: "#1C1814" }}>
                {analyzing ? <><Loader2 className="w-4 h-4 animate-spin" /> AI analizează…</> : <><Wand2 className="w-4 h-4" /> Generează strategie AI</>}
              </button>
            </div>
            {analyzeError && (
              <div className="flex items-center gap-2 text-sm px-4 py-3 rounded-xl"
                style={{ backgroundColor: "rgba(239,68,68,0.08)", color: RED, border: "1px solid rgba(239,68,68,0.15)" }}>
                <AlertCircle className="w-4 h-4" />{analyzeError}
              </div>
            )}
          </div>
          <MarketingAdvisor step={2} offerType={offerType} offerDescription={offerText}
            audienceType={audienceType} location={location} budgetRange={budgetRange} />
          </div>
        )}

        {/* ══ STEP 3 — Surse AI ════════════════════════════════════════════ */}
        {step === 3 && suggestion && (
          <div className="space-y-4">
            <div className="rounded-2xl p-5 space-y-3" style={card}>
              <div className="flex items-center gap-2">
                <Wand2 className="w-4 h-4" style={{ color: AMBER }} />
                <p className="text-sm font-bold" style={{ color: "#292524" }}>Analiza AI</p>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="rounded-xl p-3" style={{ backgroundColor: "rgba(245,215,160,0.08)" }}>
                  <p className="text-xs font-bold mb-1" style={{ color: "#78614E" }}>Oferta reformulată</p>
                  <p className="text-xs" style={{ color: "#292524" }}>{suggestion.offer_summary}</p>
                </div>
                <div className="rounded-xl p-3" style={{ backgroundColor: "rgba(245,215,160,0.08)" }}>
                  <p className="text-xs font-bold mb-1" style={{ color: "#78614E" }}>Profilul clientului ideal</p>
                  <p className="text-xs" style={{ color: "#292524" }}>{suggestion.target_profile}</p>
                </div>
              </div>
              {suggestion.affiliate_angle && (
                <div className="rounded-xl p-3" style={{ backgroundColor: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)" }}>
                  <p className="text-xs font-bold mb-1" style={{ color: "#6366F1" }}>🎯 Unghi afiliat</p>
                  <p className="text-xs" style={{ color: "#292524" }}>{suggestion.affiliate_angle}</p>
                </div>
              )}
            </div>

            <div className="rounded-2xl p-5 space-y-3" style={card}>
              <p className="text-sm font-bold" style={{ color: "#292524" }}>Cuvinte-cheie detectate</p>
              <p className="text-xs" style={{ color: "#A8967E" }}>Acestea sunt folosite în căutări. Modifică după nevoie.</p>
              <div className="flex flex-wrap gap-2">
                {keywords.map(kw => (
                  <Chip key={kw} text={kw} onRemove={() => setKeywords(keywords.filter(k => k !== kw))} />
                ))}
                <AddChip placeholder="+ cuvânt" onAdd={kw => setKeywords([...keywords, kw])} />
              </div>
            </div>

            <div className="rounded-2xl p-5 space-y-3" style={card}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold" style={{ color: "#292524" }}>Surse recomandate de AI</p>
                <span className="text-xs" style={{ color: "#A8967E" }}>
                  {Object.values(enabledSources).filter(Boolean).length} active
                </span>
              </div>
              <p className="text-xs" style={{ color: "#A8967E" }}>Activează/dezactivează surse · Click pe query pentru a-l edita</p>
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
                            <span className="font-bold text-sm" style={{ color: "#292524" }}>{src.platform}</span>
                            <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
                              style={{
                                backgroundColor: src.intent_level === "high" ? "rgba(239,68,68,0.1)" : src.intent_level === "medium" ? `${AMBER}15` : "rgba(148,163,184,0.1)",
                                color: src.intent_level === "high" ? RED : src.intent_level === "medium" ? AMBER : "#94A3B8",
                              }}>
                              {src.intent_level === "high" ? "🔥 Intenție ridicată" : src.intent_level === "medium" ? "⚡ Medie" : "💤 Scăzută"}
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
                                style={{ border: `1px solid ${AMBER}50`, backgroundColor: "#FFFDF9", color: "#292524" }} />
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
                <p className="text-xs font-bold mb-1" style={{ color: GREEN }}>Semnale de intenție căutate</p>
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
                <ArrowLeft className="w-4 h-4" /> Înapoi
              </button>
              <button type="button" onClick={() => { handleSearch(); setStep(4); }}
                disabled={!Object.values(enabledSources).some(Boolean)}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all disabled:opacity-40"
                style={{ backgroundColor: AMBER, color: "#1C1814" }}>
                <Search className="w-4 h-4" /> Caută prospecți acum
              </button>
            </div>
          <MarketingAdvisor step={3} offerType={offerType} offerDescription={offerText}
            audienceType={audienceType} location={location} budgetRange={budgetRange}
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
                  <p className="text-sm font-bold" style={{ color: "#292524" }}>
                    {searching ? "Căutare în progres…" : "AI scorează prospecții…"}
                  </p>
                </div>
                <div className="space-y-1">
                  {searchProgress.map((p, i) => (
                    <p key={i} className="text-xs" style={{ color: p.startsWith("✓") ? GREEN : p.startsWith("✗") ? RED : "#A8967E" }}>{p}</p>
                  ))}
                  {scoring && <p className="text-xs" style={{ color: AMBER }}>⚡ AI analizează {rawResults.length} rezultate…</p>}
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
                    <BookmarkCheck className="w-4 h-4" /> Lead salvat! Vezi în <a href="/leads" className="underline ml-1">Leads Database</a>
                  </div>
                )}
                {saveGoal === "error" && (
                  <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
                    style={{ backgroundColor: "rgba(239,68,68,0.08)", color: RED }}>
                    <AlertCircle className="w-4 h-4" /> Eroare la salvare
                  </div>
                )}

                <div className="rounded-2xl p-4 flex items-center gap-4 flex-wrap" style={card}>
                  <div className="flex-1">
                    <p className="font-bold" style={{ color: "#292524" }}>{leads.length} prospecți găsiți</p>
                    <p className="text-xs" style={{ color: "#A8967E" }}>din {rawResults.length} rezultate totale</p>
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
                        {f === "hot" ? `HOT · ${hotCount}` : f === "warm" ? `WARM · ${warmCount}` : f === "cold" ? `COLD · ${coldCount}` : "Toate"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  {filteredLeads.map((lead, i) => (
                    <div key={i} className="rounded-2xl p-4 space-y-2.5 transition-all hover:shadow-md" style={card}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm truncate" style={{ color: "#292524" }}>
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
                            <Globe className="w-3 h-3" /> Sursă
                          </a>
                        )}
                        <button type="button" onClick={() => handleGenerateMessage(lead)}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-bold"
                          style={{ backgroundColor: `${AMBER}15`, color: AMBER }}>
                          <MessageSquare className="w-3 h-3" /> Mesaj
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
                          {savedIds.has(lead.index) ? "Salvat" : "Salvează"}
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
                <p className="font-semibold" style={{ color: "#78614E" }}>Pregătit pentru căutare</p>
                <p className="text-sm mt-1" style={{ color: "#C4AA8A" }}>Apasă "Caută" pe pasul anterior</p>
              </div>
            )}

            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(3)}
                className="flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm"
                style={{ backgroundColor: "rgba(245,215,160,0.1)", color: "#78614E", border: "1px solid rgba(245,215,160,0.2)" }}>
                <ArrowLeft className="w-4 h-4" /> Modifică surse
              </button>
              {leads.length > 0 && (
                <button type="button" onClick={handleSearch}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm"
                  style={{ backgroundColor: "rgba(245,215,160,0.08)", color: "#78614E", border: "1px solid rgba(245,215,160,0.2)" }}>
                  <RefreshCw className="w-4 h-4" /> Re-caută
                </button>
              )}
              {leads.length > 0 && !searching && !scoring && (
                <button type="button"
                  onClick={() => handleGenerateMessage(leads.find(l => l.label === "hot") || leads[0])}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm ml-auto"
                  style={{ backgroundColor: AMBER, color: "#fff" }}>
                  <MessageSquare className="w-4 h-4" /> Continuă la Outreach <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
            {!searching && !scoring && (
              <MarketingAdvisor step={4} offerType={offerType} offerDescription={offerText}
                audienceType={audienceType} location={location} budgetRange={budgetRange}
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
                  <p className="text-xs font-bold mb-0.5" style={{ color: "#A8967E" }}>Lead selectat</p>
                  <p className="font-bold truncate" style={{ color: "#292524" }}>{selectedLead.title || selectedLead.contact_hint || "Prospect"}</p>
                  <p className="text-xs" style={{ color: "#A8967E" }}>{selectedLead.platform}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <ScoreBadge label={selectedLead.label} score={selectedLead.score} />
                  {selectedLead.url && (
                    <a href={selectedLead.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:scale-105"
                      style={{ backgroundColor: "rgba(245,158,11,0.12)", color: AMBER, border: `1px solid ${AMBER}30` }}
                      title="Deschide sursa originală">
                      <Globe className="w-3.5 h-3.5" /> Deschide sursa
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
                    {savedIds.has(selectedLead.index) ? "Salvat" : "Salvează"}
                  </button>
                </div>
              </div>
            )}

            {/* Quick lead switcher */}
            {leads.length > 1 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold" style={{ color: "#A8967E" }}>Alege alt lead:</span>
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
                <p className="font-bold" style={{ color: "#292524" }}>Mesaj personalizat AI</p>
                {outreach && (
                  <p className="text-xs font-semibold px-2 py-1 rounded-lg"
                    style={{ backgroundColor: "rgba(29,185,84,0.1)", color: GREEN }}>
                    ✓ Recomandat: {outreach.best_platform}
                  </p>
                )}
              </div>

              {generatingMsg && (
                <div className="flex items-center gap-2 py-6 justify-center">
                  <Loader2 className="w-5 h-5 animate-spin" style={{ color: AMBER }} />
                  <p className="text-sm" style={{ color: "#A8967E" }}>AI scrie mesajul…</p>
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
                      <span className="text-xs font-bold" style={{ color: "#78614E" }}>Subiect: </span>
                      <span className="text-xs" style={{ color: "#292524" }}>{outreach.subject_line}</span>
                    </div>
                  )}
                  <div className="relative">
                    <textarea value={outreach.messages[activePlatform as keyof typeof outreach.messages] || ""}
                      onChange={() => {}} readOnly rows={5}
                      className="w-full px-4 py-3 rounded-xl text-sm resize-none focus:outline-none"
                      style={{ border: `1px solid ${AMBER}25`, backgroundColor: "#FFFDF9", color: "#292524" }} />
                    <button type="button"
                      onClick={() => copyMessage(outreach.messages[activePlatform as keyof typeof outreach.messages] || "")}
                      className="absolute top-2 right-2 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold"
                      style={{ backgroundColor: copied ? `${GREEN}15` : `${AMBER}15`, color: copied ? GREEN : AMBER }}>
                      {copied ? <><Check className="w-3 h-3" /> Copiat!</> : <><Copy className="w-3 h-3" /> Copiază</>}
                    </button>
                  </div>
                  <button type="button" onClick={() => selectedLead && handleGenerateMessage(selectedLead)}
                    className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#A8967E" }}>
                    <RefreshCw className="w-3.5 h-3.5" /> Regenerează mesajul
                  </button>
                </>
              )}
            </div>

            {/* ── Marketing Advisor ────────────────────────────────────────── */}
            {outreach && !generatingMsg && (
              <MarketingAdvisor step={5} offerType={offerType} offerDescription={offerText}
                audienceType={audienceType} location={location} budgetRange={budgetRange}
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
                      <p className="font-bold text-sm" style={{ color: "#292524" }}>Datele tale de contact</p>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(245,158,11,0.1)", color: AMBER }}>
                        opțional — pentru campanie
                      </span>
                    </div>
                    <span style={{ color: "#A8967E" }}>{showContactForm ? "▲" : "▼"}</span>
                  </button>
                  {showContactForm && (
                    <div className="px-5 pb-5 grid grid-cols-2 gap-3">
                      {[
                        { label: "📱 Telefon", val: contactPhone, set: setContactPhone, ph: "07xx xxx xxx" },
                        { label: "📧 Email", val: contactEmail, set: setContactEmail, ph: "tu@email.com" },
                        { label: "🌐 Website", val: contactWebsite, set: setContactWebsite, ph: "siteul-tau.ro" },
                        { label: "💬 WhatsApp", val: contactWhatsapp, set: setContactWhatsapp, ph: "07xx xxx xxx" },
                        { label: "📸 Instagram", val: contactInstagram, set: setContactInstagram, ph: "@username" },
                        { label: "👥 Facebook", val: contactFacebook, set: setContactFacebook, ph: "pagina-ta" },
                      ].map(({ label, val, set, ph }) => (
                        <div key={label}>
                          <p className="text-xs font-semibold mb-1" style={{ color: "#78614E" }}>{label}</p>
                          <input type="text" value={val} onChange={e => set(e.target.value)} placeholder={ph}
                            className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                            style={{ border: `1px solid ${AMBER}25`, backgroundColor: "#FFFDF9", color: "#292524" }} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Event type filters */}
                <div className="rounded-2xl p-4 space-y-3" style={card}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold" style={{ color: "#78614E" }}>Tip eveniment:</span>
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
                      <span className="text-xs font-bold" style={{ color: "#78614E" }}>Locație:</span>
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
                  style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)", color: "#1C1814", boxShadow: "0 4px 20px rgba(245,158,11,0.35)" }}>
                  {generatingCampaign
                    ? <><Loader2 className="w-5 h-5 animate-spin" /> AI construiește campania completă…</>
                    : <><Wand2 className="w-5 h-5" /> Generează Campanie Completă — 9 materiale</>}
                </button>

                {campaignError && (
                  <p className="text-sm text-center" style={{ color: RED }}>{campaignError}</p>
                )}

                {/* Campaign results */}
                {campaign && (
                  <div className="rounded-2xl overflow-hidden" style={{ ...card, border: `1px solid ${AMBER}30` }}>
                    <div className="flex items-center justify-between px-5 py-4"
                      style={{ borderBottom: `1px solid ${AMBER}15`, background: `linear-gradient(135deg, ${AMBER}08, transparent)` }}>
                      <p className="font-bold" style={{ color: "#292524" }}>🚀 Campanie completă</p>
                      <span className="text-xs font-bold px-2 py-1 rounded-full"
                        style={{ backgroundColor: `${GREEN}15`, color: GREEN }}>9 materiale generate</span>
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
                          <p className="text-xs font-bold" style={{ color: "#78614E" }}>📱 Mesaj SMS — max 160 caractere</p>
                          <div className="relative">
                            <textarea value={campaign.sms.text} readOnly rows={3}
                              className="w-full px-4 py-3 rounded-xl text-sm resize-none focus:outline-none"
                              style={{ border: `1px solid ${AMBER}25`, backgroundColor: "#FFFDF9", color: "#292524" }} />
                            <button type="button" onClick={() => copyCampaign("sms", campaign.sms.text)}
                              className="absolute top-2 right-2 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold"
                              style={{ backgroundColor: copiedCampaign === "sms" ? `${GREEN}15` : `${AMBER}15`, color: copiedCampaign === "sms" ? GREEN : AMBER }}>
                              {copiedCampaign === "sms" ? <><Check className="w-3 h-3" /> Copiat!</> : <><Copy className="w-3 h-3" /> Copiază</>}
                            </button>
                          </div>
                          <p className="text-xs" style={{ color: "#A8967E" }}>{campaign.sms.text.length}/160 caractere</p>
                        </>
                      )}

                      {activeCampaignTab === "email" && campaign.email && (
                        <>
                          <div className="rounded-lg px-3 py-2 space-y-1" style={{ backgroundColor: "rgba(245,215,160,0.08)", border: `1px solid ${AMBER}20` }}>
                            <p className="text-xs"><span className="font-bold" style={{ color: "#78614E" }}>Subiect: </span><span style={{ color: "#292524" }}>{campaign.email.subject}</span></p>
                            <p className="text-xs"><span className="font-bold" style={{ color: "#78614E" }}>Preview: </span><span style={{ color: "#A8967E" }}>{campaign.email.preview}</span></p>
                          </div>
                          <div className="relative">
                            <textarea value={campaign.email.body} readOnly rows={8}
                              className="w-full px-4 py-3 rounded-xl text-sm resize-none focus:outline-none"
                              style={{ border: `1px solid ${AMBER}25`, backgroundColor: "#FFFDF9", color: "#292524" }} />
                            <button type="button" onClick={() => copyCampaign("email", `Subiect: ${campaign.email.subject}\n\n${campaign.email.body}`)}
                              className="absolute top-2 right-2 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold"
                              style={{ backgroundColor: copiedCampaign === "email" ? `${GREEN}15` : `${AMBER}15`, color: copiedCampaign === "email" ? GREEN : AMBER }}>
                              {copiedCampaign === "email" ? <><Check className="w-3 h-3" /> Copiat!</> : <><Copy className="w-3 h-3" /> Copiază</>}
                            </button>
                          </div>
                        </>
                      )}

                      {activeCampaignTab === "whatsapp" && campaign.whatsapp && (
                        <>
                          <p className="text-xs font-bold" style={{ color: "#78614E" }}>💬 Mesaj WhatsApp</p>
                          <div className="relative">
                            <textarea value={campaign.whatsapp.text} readOnly rows={4}
                              className="w-full px-4 py-3 rounded-xl text-sm resize-none focus:outline-none"
                              style={{ border: `1px solid ${AMBER}25`, backgroundColor: "#FFFDF9", color: "#292524" }} />
                            <button type="button" onClick={() => copyCampaign("whatsapp", campaign.whatsapp.text)}
                              className="absolute top-2 right-2 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold"
                              style={{ backgroundColor: copiedCampaign === "whatsapp" ? `${GREEN}15` : `${AMBER}15`, color: copiedCampaign === "whatsapp" ? GREEN : AMBER }}>
                              {copiedCampaign === "whatsapp" ? <><Check className="w-3 h-3" /> Copiat!</> : <><Copy className="w-3 h-3" /> Copiază</>}
                            </button>
                          </div>
                        </>
                      )}

                      {activeCampaignTab === "facebook_post" && campaign.facebook_post && (
                        <>
                          <p className="text-xs font-bold" style={{ color: "#78614E" }}>👥 Postare Facebook</p>
                          <div className="relative">
                            <textarea value={campaign.facebook_post.text} readOnly rows={5}
                              className="w-full px-4 py-3 rounded-xl text-sm resize-none focus:outline-none"
                              style={{ border: `1px solid ${AMBER}25`, backgroundColor: "#FFFDF9", color: "#292524" }} />
                            <button type="button" onClick={() => copyCampaign("fb", campaign.facebook_post.text)}
                              className="absolute top-2 right-2 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold"
                              style={{ backgroundColor: copiedCampaign === "fb" ? `${GREEN}15` : `${AMBER}15`, color: copiedCampaign === "fb" ? GREEN : AMBER }}>
                              {copiedCampaign === "fb" ? <><Check className="w-3 h-3" /> Copiat!</> : <><Copy className="w-3 h-3" /> Copiază</>}
                            </button>
                          </div>
                          <div className="rounded-lg px-3 py-2" style={{ backgroundColor: "rgba(245,215,160,0.08)", border: `1px solid ${AMBER}20` }}>
                            <span className="text-xs font-bold" style={{ color: "#78614E" }}>CTA buton: </span>
                            <span className="text-xs font-semibold" style={{ color: AMBER }}>{campaign.facebook_post.cta}</span>
                          </div>
                        </>
                      )}

                      {activeCampaignTab === "instagram_post" && campaign.instagram_post && (
                        <>
                          <p className="text-xs font-bold" style={{ color: "#78614E" }}>📸 Caption Instagram</p>
                          <div className="relative">
                            <textarea value={campaign.instagram_post.caption} readOnly rows={4}
                              className="w-full px-4 py-3 rounded-xl text-sm resize-none focus:outline-none"
                              style={{ border: `1px solid ${AMBER}25`, backgroundColor: "#FFFDF9", color: "#292524" }} />
                            <button type="button" onClick={() => copyCampaign("ig", campaign.instagram_post.caption)}
                              className="absolute top-2 right-2 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold"
                              style={{ backgroundColor: copiedCampaign === "ig" ? `${GREEN}15` : `${AMBER}15`, color: copiedCampaign === "ig" ? GREEN : AMBER }}>
                              {copiedCampaign === "ig" ? <><Check className="w-3 h-3" /> Copiat!</> : <><Copy className="w-3 h-3" /> Copiază</>}
                            </button>
                          </div>
                          <p className="text-xs font-bold mt-2" style={{ color: "#78614E" }}>📲 Story</p>
                          <div className="space-y-2">
                            <div className="rounded-lg px-3 py-2" style={{ backgroundColor: "rgba(245,215,160,0.1)", border: `1px solid ${AMBER}20` }}>
                              <span className="text-xs font-bold" style={{ color: "#78614E" }}>Hook (3 sec): </span>
                              <span className="text-xs font-semibold" style={{ color: "#292524" }}>{campaign.instagram_post.story_hook}</span>
                            </div>
                            {(campaign.instagram_post.story_slides || []).map((slide, i) => (
                              <div key={i} className="rounded-lg px-3 py-2" style={{ backgroundColor: "rgba(245,215,160,0.05)", border: `1px solid ${AMBER}15` }}>
                                <span className="text-xs font-bold" style={{ color: "#A8967E" }}>Slide {i + 1}: </span>
                                <span className="text-xs" style={{ color: "#292524" }}>{slide}</span>
                              </div>
                            ))}
                            <div className="rounded-lg px-3 py-2" style={{ backgroundColor: `${GREEN}08`, border: `1px solid ${GREEN}25` }}>
                              <span className="text-xs font-bold" style={{ color: GREEN }}>CTA: </span>
                              <span className="text-xs" style={{ color: "#292524" }}>{campaign.instagram_post.story_cta}</span>
                            </div>
                          </div>
                          <button type="button" onClick={() => copyCampaign("story", [campaign.instagram_post.story_hook, ...(campaign.instagram_post.story_slides || []), campaign.instagram_post.story_cta].join("\n---\n"))}
                            className="flex items-center gap-1 text-xs font-bold"
                            style={{ color: copiedCampaign === "story" ? GREEN : AMBER }}>
                            {copiedCampaign === "story" ? <><Check className="w-3 h-3" /> Copiat!</> : <><Copy className="w-3 h-3" /> Copiază Story</>}
                          </button>
                        </>
                      )}

                      {activeCampaignTab === "tiktok" && campaign.tiktok && (
                        <>
                          <div className="rounded-lg px-3 py-2" style={{ backgroundColor: `${AMBER}10`, border: `1px solid ${AMBER}30` }}>
                            <span className="text-xs font-bold" style={{ color: "#78614E" }}>🎣 Hook (primele 3 sec): </span>
                            <span className="text-xs font-bold" style={{ color: "#292524" }}>{campaign.tiktok.hook}</span>
                          </div>
                          <p className="text-xs font-bold" style={{ color: "#78614E" }}>📝 Script voiceover</p>
                          <div className="relative">
                            <textarea value={campaign.tiktok.script} readOnly rows={6}
                              className="w-full px-4 py-3 rounded-xl text-sm resize-none focus:outline-none"
                              style={{ border: `1px solid ${AMBER}25`, backgroundColor: "#FFFDF9", color: "#292524" }} />
                            <button type="button" onClick={() => copyCampaign("tiktok", `HOOK: ${campaign.tiktok.hook}\n\n${campaign.tiktok.script}\n\nCTA: ${campaign.tiktok.cta}`)}
                              className="absolute top-2 right-2 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold"
                              style={{ backgroundColor: copiedCampaign === "tiktok" ? `${GREEN}15` : `${AMBER}15`, color: copiedCampaign === "tiktok" ? GREEN : AMBER }}>
                              {copiedCampaign === "tiktok" ? <><Check className="w-3 h-3" /> Copiat!</> : <><Copy className="w-3 h-3" /> Copiază</>}
                            </button>
                          </div>
                          <div className="flex gap-2">
                            <div className="flex-1 rounded-lg px-3 py-2" style={{ backgroundColor: `${GREEN}08`, border: `1px solid ${GREEN}25` }}>
                              <span className="text-xs font-bold" style={{ color: GREEN }}>CTA final: </span>
                              <span className="text-xs" style={{ color: "#292524" }}>{campaign.tiktok.cta}</span>
                            </div>
                          </div>
                          <p className="text-xs font-bold" style={{ color: "#78614E" }}>Caption + hashtags</p>
                          <div className="relative">
                            <textarea value={campaign.tiktok.caption} readOnly rows={2}
                              className="w-full px-4 py-3 rounded-xl text-sm resize-none focus:outline-none"
                              style={{ border: `1px solid ${AMBER}25`, backgroundColor: "#FFFDF9", color: "#292524" }} />
                            <button type="button" onClick={() => copyCampaign("tiktok_cap", campaign.tiktok.caption)}
                              className="absolute top-2 right-2 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold"
                              style={{ backgroundColor: copiedCampaign === "tiktok_cap" ? `${GREEN}15` : `${AMBER}15`, color: copiedCampaign === "tiktok_cap" ? GREEN : AMBER }}>
                              {copiedCampaign === "tiktok_cap" ? <><Check className="w-3 h-3" /> Copiat!</> : <><Copy className="w-3 h-3" /> Copiază</>}
                            </button>
                          </div>
                        </>
                      )}

                      {activeCampaignTab === "landing_page" && campaign.landing_page && (
                        <>
                          <div className="space-y-2">
                            <div className="rounded-xl px-4 py-3 text-center" style={{ background: `linear-gradient(135deg, ${AMBER}10, ${AMBER}05)`, border: `1px solid ${AMBER}25` }}>
                              <p className="font-bold text-lg" style={{ color: "#292524" }}>{campaign.landing_page.headline}</p>
                              <p className="text-sm mt-1" style={{ color: "#78614E" }}>{campaign.landing_page.subheadline}</p>
                            </div>
                            <p className="text-xs font-bold" style={{ color: "#78614E" }}>✅ Beneficii</p>
                            <div className="space-y-1">
                              {(campaign.landing_page.bullets || []).map((b, i) => (
                                <div key={i} className="flex items-start gap-2 text-sm" style={{ color: "#292524" }}>
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
                              <p className="text-xs whitespace-pre-wrap" style={{ color: "#292524" }}>{campaign.landing_page.contact_block}</p>
                            </div>
                          </div>
                          <button type="button" onClick={() => copyCampaign("lp", [campaign.landing_page.headline, campaign.landing_page.subheadline, ...(campaign.landing_page.bullets || []).map(b => `✓ ${b}`), campaign.landing_page.cta_button, campaign.landing_page.contact_block].join("\n\n"))}
                            className="flex items-center gap-1 text-xs font-bold"
                            style={{ color: copiedCampaign === "lp" ? GREEN : AMBER }}>
                            {copiedCampaign === "lp" ? <><Check className="w-3 h-3" /> Copiat!</> : <><Copy className="w-3 h-3" /> Copiază tot</>}
                          </button>
                        </>
                      )}

                      {activeCampaignTab === "video_brief" && campaign.video_brief && (
                        <>
                          <div className="rounded-lg px-3 py-2" style={{ backgroundColor: `${AMBER}08`, border: `1px solid ${AMBER}20` }}>
                            <span className="text-xs font-bold" style={{ color: "#78614E" }}>Concept: </span>
                            <span className="text-xs" style={{ color: "#292524" }}>{campaign.video_brief.concept}</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-xs px-2 py-1 rounded-full font-semibold" style={{ backgroundColor: `${AMBER}10`, color: AMBER }}>⏱ {campaign.video_brief.duration}</span>
                            <span className="text-xs px-2 py-1 rounded-full font-semibold" style={{ backgroundColor: "rgba(245,215,160,0.08)", color: "#78614E" }}>🎵 {campaign.video_brief.music}</span>
                          </div>
                          <p className="text-xs font-bold" style={{ color: "#78614E" }}>🎬 Scene</p>
                          <div className="space-y-2">
                            {(campaign.video_brief.scenes || []).map((scene, i) => (
                              <div key={i} className="rounded-lg px-3 py-2" style={{ backgroundColor: "rgba(245,215,160,0.05)", border: `1px solid ${AMBER}15` }}>
                                <span className="text-xs font-bold" style={{ color: AMBER }}>Scenă {i + 1}: </span>
                                <span className="text-xs" style={{ color: "#292524" }}>{scene}</span>
                              </div>
                            ))}
                          </div>
                          <div className="rounded-lg px-3 py-2" style={{ backgroundColor: `${GREEN}08`, border: `1px solid ${GREEN}25` }}>
                            <span className="text-xs font-bold" style={{ color: GREEN }}>Caption: </span>
                            <span className="text-xs" style={{ color: "#292524" }}>{campaign.video_brief.caption}</span>
                          </div>
                          <button type="button" onClick={() => copyCampaign("vb", [campaign.video_brief.concept, `Durată: ${campaign.video_brief.duration}`, `Muzică: ${campaign.video_brief.music}`, ...(campaign.video_brief.scenes || []).map((s, i) => `Scenă ${i+1}: ${s}`), `Caption: ${campaign.video_brief.caption}`].join("\n\n"))}
                            className="flex items-center gap-1 text-xs font-bold"
                            style={{ color: copiedCampaign === "vb" ? GREEN : AMBER }}>
                            {copiedCampaign === "vb" ? <><Check className="w-3 h-3" /> Copiat!</> : <><Copy className="w-3 h-3" /> Copiază Brief</>}
                          </button>
                        </>
                      )}

                      {activeCampaignTab === "photo_brief" && campaign.photo_brief && (
                        <>
                          <div className="rounded-lg px-3 py-2" style={{ backgroundColor: `${AMBER}08`, border: `1px solid ${AMBER}20` }}>
                            <span className="text-xs font-bold" style={{ color: "#78614E" }}>Concept: </span>
                            <span className="text-xs" style={{ color: "#292524" }}>{campaign.photo_brief.concept}</span>
                          </div>
                          <div className="rounded-lg px-3 py-2" style={{ backgroundColor: "rgba(245,215,160,0.05)", border: `1px solid ${AMBER}15` }}>
                            <span className="text-xs font-bold" style={{ color: "#78614E" }}>Stil: </span>
                            <span className="text-xs" style={{ color: "#292524" }}>{campaign.photo_brief.style}</span>
                          </div>
                          <p className="text-xs font-bold" style={{ color: "#78614E" }}>📷 Fotografii de făcut</p>
                          <div className="space-y-2">
                            {(campaign.photo_brief.shots || []).map((shot, i) => (
                              <div key={i} className="rounded-lg px-3 py-2" style={{ backgroundColor: "rgba(245,215,160,0.05)", border: `1px solid ${AMBER}15` }}>
                                <span className="text-xs font-bold" style={{ color: AMBER }}>Foto {i + 1}: </span>
                                <span className="text-xs" style={{ color: "#292524" }}>{shot}</span>
                              </div>
                            ))}
                          </div>
                          <div className="rounded-lg px-3 py-2" style={{ backgroundColor: `${GREEN}08`, border: `1px solid ${GREEN}25` }}>
                            <span className="text-xs font-bold" style={{ color: GREEN }}>Caption postare: </span>
                            <span className="text-xs" style={{ color: "#292524" }}>{campaign.photo_brief.caption}</span>
                          </div>
                          <button type="button" onClick={() => copyCampaign("pb", [campaign.photo_brief.concept, `Stil: ${campaign.photo_brief.style}`, ...(campaign.photo_brief.shots || []).map((s, i) => `Foto ${i+1}: ${s}`), `Caption: ${campaign.photo_brief.caption}`].join("\n\n"))}
                            className="flex items-center gap-1 text-xs font-bold"
                            style={{ color: copiedCampaign === "pb" ? GREEN : AMBER }}>
                            {copiedCampaign === "pb" ? <><Check className="w-3 h-3" /> Copiat!</> : <><Copy className="w-3 h-3" /> Copiază Brief</>}
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
                <ArrowLeft className="w-4 h-4" /> Înapoi la leads
              </button>
              <button type="button" onClick={() => { setStep(1); setOfferText(""); setSuggestion(null); setLeads([]); setOutreach(null); }}
                className="flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm"
                style={{ backgroundColor: "rgba(245,215,160,0.08)", color: "#78614E", border: "1px solid rgba(245,215,160,0.15)" }}>
                <RefreshCw className="w-4 h-4" /> Caută altceva
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
