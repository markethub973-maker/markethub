"use client";

import { useState } from "react";
import {
  Search, Sparkles, Users, MapPin, TrendingUp, ShoppingBag,
  Heart, Clock, Zap, Star, ChevronRight, Copy, CheckCircle,
  AlertCircle, BarChart2, Target, Lightbulb
} from "lucide-react";

interface Persona {
  persona_name: string;
  persona_avatar_emoji: string;
  content_category: string;
  confidence_score: number;
  demographics: {
    primary_age_group: string;
    age_distribution: { range: string; pct: number }[];
    gender: { female: number; male: number };
    primary_locations: string[];
    urban_rural: string;
    education_level: string;
    income_level: string;
  };
  psychographics: {
    lifestyle: string;
    values: string[];
    pain_points: string[];
    aspirations: string[];
    personality_traits: string[];
  };
  buying_behavior: {
    peak_activity_hours: string;
    best_posting_days: string[];
    preferred_content_format: string;
    avg_purchase_decision_time: string;
    price_sensitivity: string;
    purchase_triggers: string[];
    purchase_barriers: string[];
  };
  interests: { topic: string; strength: "high" | "medium" | "low"; icon: string }[];
  affiliate_opportunities: {
    program: string;
    category: string;
    match_score: number;
    commission_range: string;
    why_it_fits: string;
    example_cta: string;
  }[];
  content_strategy: {
    recommended_formats: string[];
    best_cta_types: string[];
    content_pillars: string[];
    optimal_posting_frequency: string;
    caption_style: string;
    hashtag_strategy: string;
  };
  monetization_potential: {
    score: number;
    level: string;
    primary_revenue_streams: string[];
    estimated_cpm_range: string;
    affiliate_readiness: string;
  };
  ai_summary: string;
  quick_wins: string[];
}

interface ResultData {
  instagram: {
    username: string;
    followers: number;
    engagementRate: number;
    isVerified: boolean;
    category: string | null;
  };
  persona: Persona;
}

const NICHE_OPTIONS = [
  "Beauty & Makeup", "Fitness & Health", "Food & Nutrition", "Fashion & Style",
  "Travel & Lifestyle", "Business & Finance", "Technology", "Parenting & Family",
  "Home & Interior", "Music & Entertainment", "Sports", "Education",
];

const strengthColor = (s: string) =>
  s === "high" ? "#22c55e" : s === "medium" ? "#f59e0b" : "#94a3b8";

const incomeColor = (lvl: string) => {
  if (lvl?.includes("high")) return "#22c55e";
  if (lvl?.includes("medium")) return "#f59e0b";
  return "#94a3b8";
};

const monetizationColor = (score: number) => {
  if (score >= 75) return "#22c55e";
  if (score >= 50) return "#f59e0b";
  return "#ef4444";
};

export default function AdminBuyerPersona() {
  const [username, setUsername] = useState("");
  const [niche, setNiche] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [result, setResult] = useState<ResultData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const loadingSteps = [
    "Se scrapeaza profilul Instagram...",
    "Se analizează hashtag-urile și conținutul...",
    "Claude AI generează persona...",
    "Se finalizează raportul...",
  ];

  const generate = async () => {
    if (!username.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setLoadingStep(0);

    // Simulate step progression
    const stepInterval = setInterval(() => {
      setLoadingStep(s => Math.min(s + 1, loadingSteps.length - 1));
    }, 1800);

    try {
      const res = await fetch("/api/admin/buyer-persona", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), niche }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      clearInterval(stepInterval);
      setLoading(false);
      setLoadingStep(0);
    }
  };

  const copyText = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const p = result?.persona;
  const ig = result?.instagram;

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.3)" }}>

      {/* ── Header ── */}
      <div className="p-6 border-b" style={{ borderColor: "rgba(245,215,160,0.25)", background: "linear-gradient(135deg, rgba(194,133,76,0.08) 0%, rgba(245,215,160,0.1) 100%)" }}>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "rgba(194,133,76,0.15)" }}>
            <Users size={20} style={{ color: "#C2854C" }} />
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: "#292524" }}>Buyer Persona Builder</h2>
            <p className="text-xs" style={{ color: "#A8967E" }}>Analizează orice cont Instagram public și generează un profil detaliat al cumpărătorului ideal</p>
          </div>
          <span className="ml-auto text-xs px-2.5 py-1 rounded-full font-medium" style={{ backgroundColor: "rgba(245,158,11,0.12)", color: "#d97706", border: "1px solid rgba(245,158,11,0.2)" }}>
            👑 Admin · Beta
          </span>
        </div>
      </div>

      {/* ── Search form ── */}
      <div className="p-6 border-b" style={{ borderColor: "rgba(245,215,160,0.2)" }}>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium" style={{ color: "#A8967E" }}>@</span>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={e => e.key === "Enter" && generate()}
              placeholder="username instagram (ex: georgetudormusic)"
              className="w-full pl-7 pr-4 py-2.5 rounded-xl text-sm border outline-none"
              style={{ backgroundColor: "rgba(245,215,160,0.1)", borderColor: "rgba(245,215,160,0.4)", color: "#292524" }}
            />
          </div>
          <select
            value={niche}
            onChange={e => setNiche(e.target.value)}
            className="px-3 py-2.5 rounded-xl text-sm border outline-none"
            style={{ backgroundColor: "rgba(245,215,160,0.1)", borderColor: "rgba(245,215,160,0.4)", color: niche ? "#292524" : "#A8967E", minWidth: 160 }}
          >
            <option value="">Nișă (opțional)</option>
            {NICHE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <button
            onClick={generate}
            disabled={loading || !username.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{ backgroundColor: loading || !username.trim() ? "rgba(194,133,76,0.3)" : "#C2854C", color: "white", cursor: loading || !username.trim() ? "not-allowed" : "pointer" }}
          >
            {loading ? (
              <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "white" }} />
            ) : (
              <Sparkles size={15} />
            )}
            {loading ? "Generez..." : "Generează Persona"}
          </button>
        </div>

        {/* Loading steps */}
        {loading && (
          <div className="mt-4 space-y-2">
            {loadingSteps.map((step, i) => (
              <div key={i} className="flex items-center gap-2.5 text-sm">
                {i < loadingStep ? (
                  <CheckCircle size={14} style={{ color: "#22c55e" }} />
                ) : i === loadingStep ? (
                  <div className="w-3.5 h-3.5 border-2 rounded-full animate-spin shrink-0" style={{ borderColor: "rgba(194,133,76,0.2)", borderTopColor: "#C2854C" }} />
                ) : (
                  <div className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: "rgba(245,215,160,0.3)" }} />
                )}
                <span style={{ color: i <= loadingStep ? "#292524" : "#A8967E", fontWeight: i === loadingStep ? 500 : 400 }}>{step}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="mx-6 mt-4 flex items-center gap-2.5 p-4 rounded-xl" style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
          <AlertCircle size={16} style={{ color: "#ef4444" }} />
          <p className="text-sm" style={{ color: "#dc2626" }}>{error}</p>
        </div>
      )}

      {/* ══ PERSONA RESULT ════════════════════════════════════════════════════ */}
      {result && p && ig && (
        <div className="p-6 space-y-6">

          {/* ── Persona header card ── */}
          <div className="rounded-2xl p-6" style={{ background: "linear-gradient(135deg, rgba(194,133,76,0.12) 0%, rgba(245,215,160,0.15) 100%)", border: "1px solid rgba(194,133,76,0.25)" }}>
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shrink-0"
                style={{ backgroundColor: "rgba(255,255,255,0.7)", border: "1px solid rgba(194,133,76,0.2)" }}>
                {p.persona_avatar_emoji}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xl font-bold" style={{ color: "#292524" }}>{p.persona_name}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(194,133,76,0.15)", color: "#C2854C" }}>
                    {p.content_category}
                  </span>
                  {ig.isVerified && <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(24,119,242,0.1)", color: "#1877F2" }}>✓ Verificat</span>}
                </div>
                <p className="text-sm mt-1" style={{ color: "#78614E" }}>
                  Profilul audienței contului <strong>@{ig.username}</strong> ({ig.followers.toLocaleString()} urmăritori · {ig.engagementRate}% engagement)
                </p>
              </div>
              {/* Confidence + Monetization scores */}
              <div className="flex gap-3 shrink-0">
                <div className="text-center">
                  <div className="text-2xl font-bold" style={{ color: "#C2854C" }}>{p.confidence_score}%</div>
                  <div className="text-xs" style={{ color: "#A8967E" }}>Confidență</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold" style={{ color: monetizationColor(p.monetization_potential.score) }}>
                    {p.monetization_potential.score}%
                  </div>
                  <div className="text-xs" style={{ color: "#A8967E" }}>Monetizare</div>
                </div>
              </div>
            </div>

            {/* AI Summary */}
            <div className="mt-4 p-4 rounded-xl" style={{ backgroundColor: "rgba(255,255,255,0.6)" }}>
              <p className="text-sm leading-relaxed" style={{ color: "#292524" }}>{p.ai_summary}</p>
            </div>
          </div>

          {/* ── Grid: Demographics + Buying Behavior ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* Demographics */}
            <div className="rounded-xl border p-5" style={{ borderColor: "rgba(245,215,160,0.25)" }}>
              <h4 className="font-bold mb-4 flex items-center gap-2" style={{ color: "#292524" }}>
                <Users size={16} style={{ color: "#C2854C" }} /> Demografii
              </h4>

              {/* Gender split */}
              <div className="mb-4">
                <div className="flex justify-between text-xs mb-1.5" style={{ color: "#78614E" }}>
                  <span>♀ Femei {p.demographics.gender.female}%</span>
                  <span>♂ Bărbați {p.demographics.gender.male}%</span>
                </div>
                <div className="flex h-3 rounded-full overflow-hidden">
                  <div style={{ width: `${p.demographics.gender.female}%`, background: "#E8A96B" }} />
                  <div style={{ width: `${p.demographics.gender.male}%`, background: "#7C3AED" }} />
                </div>
              </div>

              {/* Age distribution */}
              <div className="space-y-2 mb-4">
                <p className="text-xs font-medium" style={{ color: "#78614E" }}>Distribuție vârstă</p>
                {p.demographics.age_distribution.map(({ range, pct }) => (
                  <div key={range} className="flex items-center gap-2">
                    <span className="text-xs w-12 shrink-0" style={{ color: "#78614E" }}>{range}</span>
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(245,215,160,0.3)" }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: "#C2854C" }} />
                    </div>
                    <span className="text-xs w-8 text-right" style={{ color: "#292524" }}>{pct}%</span>
                  </div>
                ))}
              </div>

              {/* Locations */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {p.demographics.primary_locations.map(loc => (
                  <span key={loc} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: "rgba(245,215,160,0.2)", color: "#78614E" }}>
                    <MapPin size={10} />{loc}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg p-2" style={{ backgroundColor: "rgba(245,215,160,0.12)" }}>
                  <p style={{ color: "#A8967E" }}>Venit</p>
                  <p className="font-semibold capitalize" style={{ color: incomeColor(p.demographics.income_level) }}>
                    {p.demographics.income_level}
                  </p>
                </div>
                <div className="rounded-lg p-2" style={{ backgroundColor: "rgba(245,215,160,0.12)" }}>
                  <p style={{ color: "#A8967E" }}>Mediu</p>
                  <p className="font-semibold" style={{ color: "#292524" }}>{p.demographics.urban_rural}</p>
                </div>
              </div>
            </div>

            {/* Buying Behavior */}
            <div className="rounded-xl border p-5" style={{ borderColor: "rgba(245,215,160,0.25)" }}>
              <h4 className="font-bold mb-4 flex items-center gap-2" style={{ color: "#292524" }}>
                <ShoppingBag size={16} style={{ color: "#C2854C" }} /> Comportament de Cumpărare
              </h4>

              <div className="space-y-3">
                <div className="flex items-center gap-2.5 p-2.5 rounded-lg" style={{ backgroundColor: "rgba(245,215,160,0.12)" }}>
                  <Clock size={14} style={{ color: "#C2854C" }} />
                  <div>
                    <p className="text-xs" style={{ color: "#A8967E" }}>Peak activity</p>
                    <p className="text-sm font-semibold" style={{ color: "#292524" }}>{p.buying_behavior.peak_activity_hours}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 p-2.5 rounded-lg" style={{ backgroundColor: "rgba(245,215,160,0.12)" }}>
                  <BarChart2 size={14} style={{ color: "#C2854C" }} />
                  <div>
                    <p className="text-xs" style={{ color: "#A8967E" }}>Format preferat</p>
                    <p className="text-sm font-semibold" style={{ color: "#292524" }}>{p.buying_behavior.preferred_content_format}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium mb-2" style={{ color: "#78614E" }}>✅ Ce îi face să cumpere</p>
                  {p.buying_behavior.purchase_triggers.slice(0, 3).map((t, i) => (
                    <div key={i} className="flex items-start gap-2 mb-1">
                      <ChevronRight size={12} className="mt-0.5 shrink-0" style={{ color: "#22c55e" }} />
                      <p className="text-xs" style={{ color: "#78614E" }}>{t}</p>
                    </div>
                  ))}
                </div>

                <div>
                  <p className="text-xs font-medium mb-2" style={{ color: "#78614E" }}>⚠️ Ce îi oprește</p>
                  {p.buying_behavior.purchase_barriers.slice(0, 2).map((b, i) => (
                    <div key={i} className="flex items-start gap-2 mb-1">
                      <ChevronRight size={12} className="mt-0.5 shrink-0" style={{ color: "#f59e0b" }} />
                      <p className="text-xs" style={{ color: "#78614E" }}>{b}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Interests ── */}
          <div className="rounded-xl border p-5" style={{ borderColor: "rgba(245,215,160,0.25)" }}>
            <h4 className="font-bold mb-4 flex items-center gap-2" style={{ color: "#292524" }}>
              <Heart size={16} style={{ color: "#C2854C" }} /> Interese & Pasiuni
            </h4>
            <div className="flex flex-wrap gap-2">
              {p.interests.map((interest, i) => (
                <span key={i} className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full font-medium"
                  style={{
                    backgroundColor: interest.strength === "high" ? "rgba(34,197,94,0.1)" : interest.strength === "medium" ? "rgba(245,158,11,0.1)" : "rgba(148,163,184,0.1)",
                    color: strengthColor(interest.strength),
                    border: `1px solid ${strengthColor(interest.strength)}33`
                  }}>
                  {interest.icon} {interest.topic}
                </span>
              ))}
            </div>
          </div>

          {/* ── Affiliate Opportunities ── */}
          <div className="rounded-xl border p-5" style={{ borderColor: "rgba(245,215,160,0.25)" }}>
            <h4 className="font-bold mb-1 flex items-center gap-2" style={{ color: "#292524" }}>
              <TrendingUp size={16} style={{ color: "#C2854C" }} /> Oportunități Afiliate Recomandate
            </h4>
            <p className="text-xs mb-4" style={{ color: "#A8967E" }}>Programe de afiliere potrivite pentru audiența acestui cont</p>

            <div className="space-y-3">
              {p.affiliate_opportunities.map((opp, i) => (
                <div key={i} className="rounded-xl p-4" style={{ backgroundColor: opp.match_score >= 80 ? "rgba(34,197,94,0.06)" : "rgba(245,215,160,0.1)", border: `1px solid ${opp.match_score >= 80 ? "rgba(34,197,94,0.2)" : "rgba(245,215,160,0.3)"}` }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold" style={{ color: "#292524" }}>{opp.program}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(194,133,76,0.1)", color: "#C2854C" }}>
                          {opp.category}
                        </span>
                        <span className="text-xs font-semibold" style={{ color: "#16a34a" }}>{opp.commission_range}</span>
                      </div>
                      <p className="text-xs mb-2" style={{ color: "#78614E" }}>{opp.why_it_fits}</p>
                      {/* Example CTA */}
                      <div className="flex items-center gap-2 p-2.5 rounded-lg" style={{ backgroundColor: "rgba(255,255,255,0.7)" }}>
                        <p className="text-xs flex-1 italic" style={{ color: "#292524" }}>"{opp.example_cta}"</p>
                        <button onClick={() => copyText(opp.example_cta, i)}
                          className="shrink-0 p-1 rounded transition-all"
                          style={{ color: copiedIdx === i ? "#22c55e" : "#A8967E" }}>
                          {copiedIdx === i ? <CheckCircle size={13} /> : <Copy size={13} />}
                        </button>
                      </div>
                    </div>
                    {/* Match score */}
                    <div className="shrink-0 text-center">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold"
                        style={{ backgroundColor: opp.match_score >= 80 ? "rgba(34,197,94,0.15)" : "rgba(245,158,11,0.15)", color: opp.match_score >= 80 ? "#16a34a" : "#d97706" }}>
                        {opp.match_score}%
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: "#A8967E" }}>match</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Psychographics + Content Strategy ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            <div className="rounded-xl border p-5" style={{ borderColor: "rgba(245,215,160,0.25)" }}>
              <h4 className="font-bold mb-3 flex items-center gap-2" style={{ color: "#292524" }}>
                <Target size={16} style={{ color: "#C2854C" }} /> Psihografie
              </h4>
              <p className="text-xs mb-3 leading-relaxed" style={{ color: "#78614E" }}>{p.psychographics.lifestyle}</p>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold mb-1.5" style={{ color: "#292524" }}>Valori</p>
                  <div className="flex flex-wrap gap-1">
                    {p.psychographics.values.map(v => (
                      <span key={v} className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(124,58,237,0.08)", color: "#7C3AED" }}>{v}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold mb-1.5" style={{ color: "#292524" }}>Pain Points</p>
                  {p.psychographics.pain_points.map((pp, i) => (
                    <div key={i} className="flex items-start gap-2 mb-1">
                      <span className="text-xs mt-0.5 shrink-0">😣</span>
                      <p className="text-xs" style={{ color: "#78614E" }}>{pp}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-xl border p-5" style={{ borderColor: "rgba(245,215,160,0.25)" }}>
              <h4 className="font-bold mb-3 flex items-center gap-2" style={{ color: "#292524" }}>
                <Zap size={16} style={{ color: "#C2854C" }} /> Strategie Conținut
              </h4>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold mb-1.5" style={{ color: "#292524" }}>Piloni conținut</p>
                  {p.content_strategy.content_pillars.map((cp, i) => (
                    <div key={i} className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold w-4" style={{ color: "#C2854C" }}>{i + 1}.</span>
                      <p className="text-xs" style={{ color: "#78614E" }}>{cp}</p>
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-xs font-semibold mb-1.5" style={{ color: "#292524" }}>Zile optime postare</p>
                  <div className="flex flex-wrap gap-1">
                    {p.buying_behavior.best_posting_days.map(d => (
                      <span key={d} className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(194,133,76,0.12)", color: "#C2854C" }}>{d}</span>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg p-3" style={{ backgroundColor: "rgba(245,215,160,0.12)" }}>
                  <p className="text-xs" style={{ color: "#A8967E" }}>Frecvență optimă</p>
                  <p className="text-sm font-semibold" style={{ color: "#292524" }}>{p.content_strategy.optimal_posting_frequency}</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Quick Wins ── */}
          <div className="rounded-xl p-5" style={{ background: "linear-gradient(135deg, rgba(194,133,76,0.1), rgba(245,215,160,0.15))", border: "1px solid rgba(194,133,76,0.25)" }}>
            <h4 className="font-bold mb-3 flex items-center gap-2" style={{ color: "#292524" }}>
              <Lightbulb size={16} style={{ color: "#C2854C" }} /> Quick Wins — Acțiuni Imediate
            </h4>
            <p className="text-xs mb-3" style={{ color: "#A8967E" }}>Fă aceste 3 lucruri această săptămână pentru a crește venitul din afiliere:</p>
            <div className="space-y-2">
              {p.quick_wins.map((win, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg" style={{ backgroundColor: "rgba(255,255,255,0.6)" }}>
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ backgroundColor: "#C2854C", color: "white" }}>{i + 1}</span>
                  <p className="text-sm" style={{ color: "#292524" }}>{win}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Monetization potential bar */}
          <div className="rounded-xl border p-4" style={{ borderColor: "rgba(245,215,160,0.25)" }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Star size={15} style={{ color: "#C2854C" }} />
                <span className="text-sm font-bold" style={{ color: "#292524" }}>Potențial de Monetizare: <span style={{ color: monetizationColor(p.monetization_potential.score) }}>{p.monetization_potential.level.toUpperCase()}</span></span>
              </div>
              <span className="text-lg font-bold" style={{ color: monetizationColor(p.monetization_potential.score) }}>{p.monetization_potential.score}/100</span>
            </div>
            <div className="w-full h-3 rounded-full overflow-hidden mb-2" style={{ backgroundColor: "rgba(245,215,160,0.3)" }}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${p.monetization_potential.score}%`, backgroundColor: monetizationColor(p.monetization_potential.score) }} />
            </div>
            <p className="text-xs" style={{ color: "#A8967E" }}>
              Surse venit principale: {p.monetization_potential.primary_revenue_streams.join(" · ")}
              {" · "} CPM estimat: {p.monetization_potential.estimated_cpm_range}
            </p>
          </div>

        </div>
      )}
    </div>
  );
}
