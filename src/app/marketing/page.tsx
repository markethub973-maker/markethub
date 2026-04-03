"use client";

import { useState } from "react";
import { useUserRegion } from "@/lib/useUserRegion";
import { getLocalMarket } from "@/lib/localMarketConfig";
import Header from "@/components/layout/Header";
import {
  Sparkles, Search, Map, Instagram, Facebook, Play,
  Loader2, CheckCircle2, Circle, ChevronDown, ChevronUp,
  Phone, Globe, Star, ExternalLink, Users, TrendingUp,
  Zap, MessageSquare, Copy, Check, AlertCircle, RefreshCw,
  ThumbsUp, Eye, Hash, MapPin,
} from "lucide-react";

const card = { backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" };
const AMBER = "#F59E0B";
const IG = "#E1306C";
const FB = "#1877F2";
const TT = "#010101";
const GREEN = "#1DB954";

type StepStatus = "pending" | "running" | "done" | "error";

interface WorkflowStep {
  id: number;
  actor: string;
  label: string;
  icon: string;
  purpose: string;
  params: Record<string, unknown>;
  status: StepStatus;
  result?: any;
  error?: string;
  duration?: number;
}

interface Plan {
  goal_summary: string;
  target_audience: string;
  strategy: string;
  estimated_leads: string;
  steps: WorkflowStep[];
  ai_tips: string[];
}

const ACTOR_COLORS: Record<string, string> = {
  google_search: AMBER,
  google_maps: "#34A853",
  instagram_profile: IG,
  instagram_hashtag: IG,
  tiktok_profile: TT,
  tiktok_hashtag: TT,
  facebook_page: FB,
};

const ACTOR_ICONS: Record<string, React.ElementType> = {
  google_search: Search,
  google_maps: Map,
  instagram_profile: Instagram,
  instagram_hashtag: Hash,
  tiktok_profile: Play,
  tiktok_hashtag: Hash,
  facebook_page: Facebook,
};

const ACTOR_LABELS: Record<string, string> = {
  google_search: "Google Search",
  google_maps: "Google Maps",
  instagram_profile: "Instagram Profile",
  instagram_hashtag: "Instagram Hashtag",
  tiktok_profile: "TikTok Profile",
  tiktok_hashtag: "TikTok Hashtag",
  facebook_page: "Facebook Page",
};

const EXAMPLE_GOALS = [
  "Vreau să găsesc clienți pentru servicii DJ și solist voce/chitară la evenimente",
  "Caut restaurante și cafenele care ar putea fi interesate de produsele noastre de cafea",
  "Vreau să găsesc influenceri de fitness pentru o campanie de suplimente",
  "Caut agenții de wedding planning pentru parteneriat foto-video",
  "Vreau să identific competitorii mei din domeniul e-commerce de îmbrăcăminte",
];

function fmtNum(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(Math.round(n));
}

function StepIcon({ actor }: { actor: string }) {
  const Icon = ACTOR_ICONS[actor] || Search;
  const color = ACTOR_COLORS[actor] || AMBER;
  return (
    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
      style={{ backgroundColor: color + "18", border: `1px solid ${color}30` }}>
      <Icon className="w-4 h-4" style={{ color }} />
    </div>
  );
}

function ResultPreview({ step }: { step: WorkflowStep }) {
  const [expanded, setExpanded] = useState(false);
  const r = step.result;
  if (!r) return null;

  // Google Maps results
  if (r.places) {
    const withPhone = r.places.filter((p: any) => p.phone).length;
    return (
      <div className="mt-3 space-y-2">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-bold px-2 py-1 rounded-full"
            style={{ backgroundColor: "rgba(52,168,83,0.1)", color: "#34A853" }}>
            {r.total} locații găsite
          </span>
          <span className="text-xs" style={{ color: "#A8967E" }}>
            {withPhone} au număr de telefon
          </span>
          <button type="button" onClick={() => setExpanded(e => !e)}
            className="text-xs flex items-center gap-1 font-semibold" style={{ color: AMBER }}>
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {expanded ? "Ascunde" : "Vezi toate"}
          </button>
        </div>
        {expanded && (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {r.places.map((p: any, i: number) => (
              <div key={i} className="rounded-lg p-3 flex items-start gap-3"
                style={{ backgroundColor: "#FFF8F0", border: "1px solid rgba(245,215,160,0.2)" }}>
                <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: "#34A853" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold" style={{ color: "#292524" }}>{p.name}</p>
                  {p.category && <p className="text-xs" style={{ color: "#A8967E" }}>{p.category}</p>}
                  {p.address && <p className="text-xs mt-0.5" style={{ color: "#78614E" }}>{p.address}</p>}
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    {p.phone && (
                      <a href={`tel:${p.phone}`} className="flex items-center gap-1 text-xs font-semibold" style={{ color: "#34A853" }}>
                        <Phone className="w-3 h-3" />{p.phone}
                      </a>
                    )}
                    {p.rating && (
                      <span className="flex items-center gap-0.5 text-xs" style={{ color: AMBER }}>
                        <Star className="w-3 h-3" />{p.rating} ({p.reviewsCount || 0})
                      </span>
                    )}
                    {p.website && (
                      <a href={p.website} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs" style={{ color: "#A8967E" }}>
                        <Globe className="w-3 h-3" />website
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Google Search results
  if (r.results) {
    const organic = r.results.filter((x: any) => x.type === "organic");
    const ads = r.results.filter((x: any) => x.type === "ad");
    return (
      <div className="mt-3 space-y-2">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-bold px-2 py-1 rounded-full"
            style={{ backgroundColor: "rgba(245,158,11,0.1)", color: AMBER }}>
            {organic.length} rezultate organice
          </span>
          {ads.length > 0 && (
            <span className="text-xs px-2 py-1 rounded-full"
              style={{ backgroundColor: "rgba(239,68,68,0.08)", color: "#DC2626" }}>
              {ads.length} reclame active
            </span>
          )}
          <button type="button" onClick={() => setExpanded(e => !e)}
            className="text-xs flex items-center gap-1 font-semibold" style={{ color: AMBER }}>
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {expanded ? "Ascunde" : "Vezi toate"}
          </button>
        </div>
        {expanded && (
          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
            {organic.slice(0, 10).map((x: any, i: number) => (
              <a key={i} href={x.url} target="_blank" rel="noopener noreferrer"
                className="flex items-start gap-2 p-2 rounded-lg hover:opacity-80 transition-opacity"
                style={{ backgroundColor: "#FFF8F0", border: "1px solid rgba(245,215,160,0.2)" }}>
                <span className="text-xs font-bold w-4 flex-shrink-0" style={{ color: AMBER }}>{x.position}</span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold line-clamp-1" style={{ color: "#292524" }}>{x.title}</p>
                  <p className="text-xs" style={{ color: "#C4AA8A" }}>{x.displayedUrl}</p>
                </div>
                <ExternalLink className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: "#C4AA8A" }} />
              </a>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Instagram / Facebook posts
  if (r.posts) {
    return (
      <div className="mt-3 space-y-2">
        <div className="flex items-center gap-3">
          {r.profile && (
            <span className="text-xs font-bold px-2 py-1 rounded-full"
              style={{ backgroundColor: IG + "15", color: IG }}>
              @{r.profile.username} · {fmtNum(r.profile.followers || 0)} followers
            </span>
          )}
          <span className="text-xs font-bold px-2 py-1 rounded-full"
            style={{ backgroundColor: "rgba(227,48,108,0.1)", color: IG }}>
            {r.total} posts
          </span>
          <button type="button" onClick={() => setExpanded(e => !e)}
            className="text-xs flex items-center gap-1 font-semibold" style={{ color: AMBER }}>
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {expanded ? "Ascunde" : "Vezi toate"}
          </button>
        </div>
        {expanded && (
          <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
            {r.posts.slice(0, 8).map((p: any, i: number) => (
              <a key={i} href={p.url || `https://www.instagram.com/p/${p.shortCode}/`}
                target="_blank" rel="noopener noreferrer"
                className="rounded-lg p-2 flex gap-2"
                style={{ backgroundColor: "#FFF8F0", border: "1px solid rgba(245,215,160,0.2)" }}>
                {p.thumbnail && (
                  <img src={p.thumbnail} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" />
                )}
                <div className="min-w-0">
                  {p.ownerUsername && <p className="text-xs font-bold truncate" style={{ color: IG }}>@{p.ownerUsername}</p>}
                  <div className="flex gap-2 mt-0.5">
                    <span className="text-xs flex items-center gap-0.5" style={{ color: "#A8967E" }}>
                      <ThumbsUp className="w-2.5 h-2.5" />{fmtNum(p.likes)}
                    </span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    );
  }

  // TikTok videos
  if (r.videos) {
    return (
      <div className="mt-3 space-y-2">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold px-2 py-1 rounded-full"
            style={{ backgroundColor: "rgba(1,1,1,0.08)", color: TT }}>
            {r.total} videos
          </span>
          <button type="button" onClick={() => setExpanded(e => !e)}
            className="text-xs flex items-center gap-1 font-semibold" style={{ color: AMBER }}>
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {expanded ? "Ascunde" : "Vezi toate"}
          </button>
        </div>
        {expanded && (
          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
            {r.videos.slice(0, 6).map((v: any, i: number) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-lg"
                style={{ backgroundColor: "#FFF8F0", border: "1px solid rgba(245,215,160,0.2)" }}>
                {v.cover && <img src={v.cover} alt="" className="w-8 h-10 rounded object-cover flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold" style={{ color: "#292524" }}>@{v.author}</p>
                  {v.description && <p className="text-xs line-clamp-1" style={{ color: "#78614E" }}>{v.description}</p>}
                  <div className="flex gap-3 mt-0.5">
                    <span className="text-xs flex items-center gap-0.5" style={{ color: "#A8967E" }}>
                      <Eye className="w-2.5 h-2.5" />{fmtNum(v.plays)}
                    </span>
                    <span className="text-xs flex items-center gap-0.5" style={{ color: "#A8967E" }}>
                      <ThumbsUp className="w-2.5 h-2.5" />{fmtNum(v.likes)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return null;
}

export default function MarketingAgentPage() {
  const [goal, setGoal] = useState("");
  const [phase, setPhase] = useState<"idle" | "planning" | "running" | "analyzing" | "done">("idle");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [analysis, setAnalysis] = useState<any>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const { preferred_region, local_market_enabled } = useUserRegion();
  const localMarket = local_market_enabled ? getLocalMarket(preferred_region) : null;

  const handleStart = async () => {
    if (!goal.trim()) return;
    setPhase("planning");
    setError("");
    setPlan(null);
    setSteps([]);
    setAnalysis(null);

    // Step 1: Plan
    try {
      const res = await fetch("/api/agent/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal,
          ...(localMarket ? { region: localMarket.region, hints: localMarket.agentHints, language: localMarket.language } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.plan) {
        setError(data.error || "Planning failed");
        setPhase("idle");
        return;
      }

      const plannedSteps: WorkflowStep[] = data.plan.steps.map((s: any) => ({
        ...s,
        status: "pending" as StepStatus,
      }));
      setPlan(data.plan);
      setSteps(plannedSteps);
      setPhase("running");

      // Step 2: Execute each step sequentially
      const completedSteps: WorkflowStep[] = [...plannedSteps];
      for (let i = 0; i < plannedSteps.length; i++) {
        completedSteps[i] = { ...completedSteps[i], status: "running" };
        setSteps([...completedSteps]);

        const startTime = Date.now();
        try {
          const runRes = await fetch("/api/agent/run", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ step: plannedSteps[i] }),
          });
          const runData = await runRes.json();
          const duration = Math.round((Date.now() - startTime) / 1000);

          completedSteps[i] = {
            ...completedSteps[i],
            status: runRes.ok ? "done" : "error",
            result: runRes.ok ? runData.result : undefined,
            error: runRes.ok ? undefined : runData.error,
            duration,
          };
        } catch {
          completedSteps[i] = { ...completedSteps[i], status: "error", error: "Network error" };
        }
        setSteps([...completedSteps]);
      }

      // Step 3: AI Analysis
      setPhase("analyzing");
      const analyzeRes = await fetch("/api/agent/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal,
          steps_results: completedSteps.map(s => ({ label: s.label, result: s.result })),
        }),
      });
      const analyzeData = await analyzeRes.json();
      if (analyzeData.analysis) setAnalysis(analyzeData.analysis);

      setPhase("done");
    } catch (err: any) {
      setError(err.message);
      setPhase("idle");
    }
  };

  const handleReset = () => {
    setPhase("idle");
    setPlan(null);
    setSteps([]);
    setAnalysis(null);
    setError("");
    setGoal("");
  };

  const copyTemplate = () => {
    if (!analysis?.message_template) return;
    navigator.clipboard.writeText(analysis.message_template);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const qualityColor = (score: number) =>
    score >= 7 ? GREEN : score >= 5 ? AMBER : "#EF4444";

  return (
    <div>
      <Header title="Marketing Agent" subtitle="AI-powered research — describe your goal, the agent finds the strategy" />
      <div className="p-6 space-y-5">

        {/* Goal Input */}
        {phase === "idle" && (
          <div className="rounded-2xl p-6 space-y-4" style={card}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `linear-gradient(135deg, ${AMBER}, #D97706)` }}>
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-lg" style={{ color: "#292524" }}>Marketing Research Agent</h2>
                <p className="text-sm" style={{ color: "#A8967E" }}>
                  Descrie obiectivul tău de marketing și agentul va crea și executa automat planul de cercetare
                </p>
              </div>
            </div>

            {localMarket && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold"
                style={{ backgroundColor: `${localMarket.color}10`, border: `1px solid ${localMarket.color}30`, color: localMarket.color }}>
                <span>{localMarket.flag}</span>
                <span>Piața locală activă: {localMarket.label} — agentul folosește unelte și cuvinte-cheie specifice {localMarket.label}</span>
              </div>
            )}

            <textarea
              value={goal}
              onChange={e => setGoal(e.target.value)}
              placeholder="Ex: Vreau să găsesc clienți pentru servicii DJ și solist voce la events, restaurante, nunți și corporate în București și împrejurimi..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl text-sm resize-none focus:outline-none"
              style={{ border: `1px solid ${AMBER}40`, backgroundColor: "#FFFDF9", color: "#292524" }}
            />

            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex flex-wrap gap-2">
                {EXAMPLE_GOALS.slice(0, 3).map((eg, i) => (
                  <button key={i} type="button" onClick={() => setGoal(eg)}
                    className="text-xs px-3 py-1.5 rounded-full transition-all hover:opacity-80"
                    style={{ backgroundColor: "rgba(245,215,160,0.15)", color: "#78614E", border: "1px solid rgba(245,215,160,0.3)" }}>
                    {eg.slice(0, 45)}…
                  </button>
                ))}
              </div>
              <button type="button" onClick={handleStart} disabled={!goal.trim()}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40 transition-all"
                style={{ backgroundColor: AMBER, color: "#1C1814" }}>
                <Zap className="w-4 h-4" />
                Pornește Agentul
              </button>
            </div>

            {error && (
              <p className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg font-semibold"
                style={{ backgroundColor: "rgba(239,68,68,0.08)", color: "#DC2626", border: "1px solid rgba(239,68,68,0.15)" }}>
                <AlertCircle className="w-4 h-4" />{error}
              </p>
            )}
          </div>
        )}

        {/* Planning phase */}
        {phase === "planning" && (
          <div className="rounded-2xl p-8 flex flex-col items-center justify-center gap-4 text-center" style={card}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${AMBER}, #D97706)` }}>
              <Sparkles className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div>
              <p className="font-bold text-lg" style={{ color: "#292524" }}>Claude analizează cererea ta…</p>
              <p className="text-sm mt-1" style={{ color: "#A8967E" }}>
                Identifică audiența țintă și construiește planul de cercetare optim
              </p>
            </div>
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: AMBER }} />
          </div>
        )}

        {/* Plan + Workflow execution */}
        {(phase === "running" || phase === "analyzing" || phase === "done") && plan && (
          <div className="space-y-4">

            {/* Plan summary */}
            <div className="rounded-2xl p-5 space-y-3" style={{ ...card, borderColor: `${AMBER}30` }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" style={{ color: AMBER }} />
                  <span className="font-bold" style={{ color: "#292524" }}>Plan generat de AI</span>
                </div>
                {phase === "done" && (
                  <button type="button" onClick={handleReset}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                    style={{ backgroundColor: "rgba(245,215,160,0.15)", color: "#78614E" }}>
                    <RefreshCw className="w-3 h-3" />Cerere nouă
                  </button>
                )}
              </div>

              <p className="text-sm font-semibold" style={{ color: "#292524" }}>{plan.goal_summary}</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-xl p-3" style={{ backgroundColor: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)" }}>
                  <p className="text-xs font-bold mb-1" style={{ color: AMBER }}>Audiența țintă</p>
                  <p className="text-xs leading-relaxed" style={{ color: "#78614E" }}>{plan.target_audience}</p>
                </div>
                <div className="rounded-xl p-3" style={{ backgroundColor: "rgba(29,185,84,0.06)", border: "1px solid rgba(29,185,84,0.15)" }}>
                  <p className="text-xs font-bold mb-1" style={{ color: GREEN }}>Strategie</p>
                  <p className="text-xs leading-relaxed" style={{ color: "#78614E" }}>{plan.strategy}</p>
                </div>
                <div className="rounded-xl p-3" style={{ backgroundColor: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)" }}>
                  <p className="text-xs font-bold mb-1" style={{ color: "#6366F1" }}>Leads estimate</p>
                  <p className="text-xs font-bold text-lg" style={{ color: "#292524" }}>{plan.estimated_leads}</p>
                </div>
              </div>

              {plan.ai_tips?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {plan.ai_tips.map((tip, i) => (
                    <span key={i} className="text-xs px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: "rgba(245,215,160,0.15)", color: "#78614E", border: "1px solid rgba(245,215,160,0.25)" }}>
                      💡 {tip}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Steps */}
            <div className="space-y-3">
              {steps.map((step, i) => (
                <div key={step.id} className="rounded-2xl p-5" style={{
                  ...card,
                  borderColor: step.status === "done" ? `${ACTOR_COLORS[step.actor]}40`
                    : step.status === "running" ? `${ACTOR_COLORS[step.actor]}60`
                    : step.status === "error" ? "rgba(239,68,68,0.3)"
                    : "rgba(245,215,160,0.25)",
                }}>
                  <div className="flex items-start gap-3">
                    {/* Status indicator */}
                    <div className="flex-shrink-0 mt-0.5">
                      {step.status === "done" && <CheckCircle2 className="w-5 h-5" style={{ color: GREEN }} />}
                      {step.status === "running" && <Loader2 className="w-5 h-5 animate-spin" style={{ color: ACTOR_COLORS[step.actor] }} />}
                      {step.status === "error" && <AlertCircle className="w-5 h-5" style={{ color: "#EF4444" }} />}
                      {step.status === "pending" && <Circle className="w-5 h-5" style={{ color: "#C4AA8A" }} />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <StepIcon actor={step.actor} />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold px-1.5 py-0.5 rounded"
                              style={{ backgroundColor: "rgba(196,170,138,0.15)", color: "#A8967E" }}>
                              Pas {i + 1}
                            </span>
                            <span className="text-xs font-semibold" style={{ color: ACTOR_COLORS[step.actor] }}>
                              {ACTOR_LABELS[step.actor]}
                            </span>
                          </div>
                          <p className="text-sm font-bold mt-0.5" style={{ color: "#292524" }}>{step.label}</p>
                        </div>
                        {step.duration && (
                          <span className="ml-auto text-xs" style={{ color: "#C4AA8A" }}>
                            {step.duration}s
                          </span>
                        )}
                      </div>

                      <p className="text-xs mt-1.5" style={{ color: "#A8967E" }}>{step.purpose}</p>

                      {/* Params preview */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {Object.entries(step.params).map(([k, v]) => (
                          <span key={k} className="text-xs px-2 py-0.5 rounded-full font-mono"
                            style={{ backgroundColor: "rgba(245,215,160,0.12)", color: "#78614E" }}>
                            {k}: {String(v)}
                          </span>
                        ))}
                      </div>

                      {step.error && (
                        <p className="text-xs mt-2 px-2 py-1 rounded" style={{ backgroundColor: "rgba(239,68,68,0.08)", color: "#DC2626" }}>
                          {step.error}
                        </p>
                      )}

                      {step.status === "done" && step.result && <ResultPreview step={step} />}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Analyzing */}
            {phase === "analyzing" && (
              <div className="rounded-2xl p-6 flex items-center gap-4" style={{ ...card, borderColor: `${AMBER}30` }}>
                <Loader2 className="w-6 h-6 animate-spin flex-shrink-0" style={{ color: AMBER }} />
                <div>
                  <p className="font-bold" style={{ color: "#292524" }}>Claude analizează rezultatele…</p>
                  <p className="text-sm" style={{ color: "#A8967E" }}>Generează insights și recomandări personalizate</p>
                </div>
              </div>
            )}

            {/* Final Analysis */}
            {phase === "done" && analysis && (
              <div className="rounded-2xl p-5 space-y-4" style={{ ...card, borderColor: `${GREEN}30` }}>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" style={{ color: GREEN }} />
                  <span className="font-bold" style={{ color: "#292524" }}>Analiză finală AI</span>
                </div>

                {/* Headline + scores */}
                <div className="rounded-xl p-4" style={{ backgroundColor: "rgba(29,185,84,0.05)", border: "1px solid rgba(29,185,84,0.15)" }}>
                  <p className="font-semibold text-sm" style={{ color: "#292524" }}>{analysis.headline}</p>
                  <div className="flex items-center gap-4 mt-3">
                    <div className="text-center">
                      <p className="text-2xl font-bold" style={{ color: GREEN }}>{analysis.total_leads}</p>
                      <p className="text-xs" style={{ color: "#A8967E" }}>leads potențiali</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold" style={{ color: qualityColor(analysis.quality_score) }}>
                        {analysis.quality_score}/10
                      </p>
                      <p className="text-xs" style={{ color: "#A8967E" }}>calitate date</p>
                    </div>
                  </div>
                </div>

                {/* Key findings */}
                {analysis.key_findings?.length > 0 && (
                  <div>
                    <p className="text-xs font-bold mb-2" style={{ color: "#78614E" }}>Concluzii cheie</p>
                    <div className="space-y-1.5">
                      {analysis.key_findings.map((f: string, i: number) => (
                        <div key={i} className="flex items-start gap-2 text-xs" style={{ color: "#78614E" }}>
                          <span style={{ color: AMBER }}>→</span> {f}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Top opportunities */}
                {analysis.top_opportunities?.length > 0 && (
                  <div>
                    <p className="text-xs font-bold mb-2" style={{ color: "#78614E" }}>Oportunități top</p>
                    <div className="space-y-2">
                      {analysis.top_opportunities.map((opp: any, i: number) => (
                        <div key={i} className="rounded-xl p-3"
                          style={{ backgroundColor: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.15)" }}>
                          <p className="text-xs font-bold" style={{ color: "#292524" }}>{opp.name}</p>
                          <p className="text-xs mt-0.5" style={{ color: "#78614E" }}>{opp.reason}</p>
                          <p className="text-xs mt-1 font-semibold" style={{ color: AMBER }}>→ {opp.action}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Next actions */}
                {analysis.next_actions?.length > 0 && (
                  <div>
                    <p className="text-xs font-bold mb-2" style={{ color: "#78614E" }}>Pașii următori</p>
                    <div className="space-y-1">
                      {analysis.next_actions.map((a: string, i: number) => (
                        <div key={i} className="flex items-start gap-2 text-xs rounded-lg px-2 py-1.5"
                          style={{ backgroundColor: "rgba(99,102,241,0.05)", color: "#78614E" }}>
                          <span className="font-bold flex-shrink-0" style={{ color: "#6366F1" }}>{i + 1}.</span> {a}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Outreach template */}
                {analysis.message_template && (
                  <div className="rounded-xl p-4" style={{ backgroundColor: "rgba(245,215,160,0.08)", border: "1px solid rgba(245,215,160,0.25)" }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-3.5 h-3.5" style={{ color: AMBER }} />
                        <p className="text-xs font-bold" style={{ color: "#78614E" }}>Template mesaj de outreach</p>
                      </div>
                      <button type="button" onClick={copyTemplate}
                        className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg"
                        style={{ backgroundColor: copied ? "rgba(29,185,84,0.1)" : "rgba(245,158,11,0.1)", color: copied ? GREEN : AMBER }}>
                        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copied ? "Copiat!" : "Copiază"}
                      </button>
                    </div>
                    <p className="text-xs leading-relaxed whitespace-pre-line" style={{ color: "#78614E" }}>
                      {analysis.message_template}
                    </p>
                  </div>
                )}

                <button type="button" onClick={handleReset}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold"
                  style={{ backgroundColor: AMBER, color: "#1C1814" }}>
                  <Zap className="w-4 h-4" />
                  Cerere nouă
                </button>
              </div>
            )}
          </div>
        )}

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Search, label: "Google Search", desc: "Rezultate organice + reclame" },
            { icon: Map, label: "Google Maps", desc: "Locații, telefoane, recenzii" },
            { icon: Users, label: "Social Media", desc: "IG, TikTok, Facebook" },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="rounded-xl p-3 flex items-center gap-3" style={card}>
              <Icon className="w-4 h-4 flex-shrink-0" style={{ color: AMBER }} />
              <div>
                <p className="text-xs font-bold" style={{ color: "#292524" }}>{label}</p>
                <p className="text-xs" style={{ color: "#A8967E" }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
