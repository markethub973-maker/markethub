"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/layout/Header";
import InstagramConnect from "@/components/settings/InstagramConnect";
import { createClient } from "@/lib/supabase/client";
import {
  Zap, User, Plug, CreditCard, CheckCircle, XCircle,
  AlertTriangle, Sparkles, TrendingUp, RefreshCw, Key,
  ExternalLink, ChevronDown, ChevronUp
} from "lucide-react";
import { CREDIT_PACKS } from "@/lib/plan-config";

// ── Types ─────────────────────────────────────────────────────────────────────
type Profile = { email: string; name: string; plan: string };
type BudgetStatus = {
  plan: string; plan_name: string; budget_usd: number;
  extra_credits_usd: number; total_budget_usd: number;
  spent_usd: number; remaining_usd: number;
  usage_pct: number; is_exhausted: boolean; can_purchase_credits: boolean;
};
type Tab = "profile" | "integrations" | "credits" | "api-keys";

// ── API key definitions (admin only) ─────────────────────────────────────────
const API_KEYS = [
  {
    id: "anthropic",
    name: "Anthropic Claude AI",
    icon: "🤖",
    status: "active",
    statusLabel: "Activ — credite plătite",
    color: "#7C3AED",
    colorLight: "rgba(124,58,237,0.08)",
    colorBorder: "rgba(124,58,237,0.25)",
    dashboardUrl: "https://console.anthropic.com/settings/billing",
    docsUrl: "https://docs.anthropic.com",
    env: ["ANTHROPIC_API_KEY", "ANTHROPIC_API_KEY_APP"],
    using: [
      "Generare captions AI (3 variante / set)",
      "Agent Marketing — strategie conținut",
      "Agent Email — copywriting campanii",
      "Agent Financial — analiză costuri",
      "Agent Support — asistență clienți",
      "Agent Competitor — analiză competitori",
    ],
    untapped: [
      { label: "Rapoarte PDF narative", desc: "Generare automată raport lunar cu analiză narativă completă" },
      { label: "Rezumate trend săptămânale", desc: "Email automat către clienți cu top 5 trenduri ale săptămânii" },
      { label: "Generator titluri A/B", desc: "10 variante titlu/thumbnail pentru același video — test rapid" },
      { label: "Analiză sentiment comentarii", desc: "Procesează comentariile YouTube/IG și extrage sentimentul dominant" },
    ],
    cost: "Pay-per-token (~$0.003/1K tokens Sonnet)",
  },
  {
    id: "youtube",
    name: "YouTube Data API v3",
    icon: "▶️",
    status: "active",
    statusLabel: "Activ — free tier (10K cereri/zi)",
    color: "#FF0000",
    colorLight: "rgba(255,0,0,0.06)",
    colorBorder: "rgba(255,0,0,0.2)",
    dashboardUrl: "https://console.cloud.google.com/apis/api/youtube.googleapis.com/quotas",
    docsUrl: "https://developers.google.com/youtube/v3/docs",
    env: ["YOUTUBE_API_KEY"],
    using: [
      "Statistici canal propriu (abonați, views, videos)",
      "Top videos cu engagement rate",
      "Trending videos pe țară + categorie",
      "Global trending (worldwide)",
      "Căutare canale competitori",
      "Analiză videos canal competitor",
    ],
    untapped: [
      { label: "Analiză comentarii video", desc: "commentThreads API — întrebări frecvente, sentiment, FAQ extragere" },
      { label: "Comparare categorii", desc: "Ce categorii de content performează cel mai bine în nișa ta" },
      { label: "Playlist strategy analysis", desc: "Cum organizează competitorii playlist-urile — structură conținut" },
      { label: "YouTube Analytics API", desc: "Retenție vizionare, demografii detaliate, surse trafic (necesită OAuth)" },
      { label: "Trending regional multi-țară", desc: "Aceeași nișă comparat în RO/DE/UK/US simultan" },
    ],
    cost: "GRATUIT — 10.000 unități/zi (quota)",
  },
  {
    id: "meta",
    name: "Meta Graph API",
    icon: "📘",
    status: "active",
    statusLabel: "Activ — Instagram + Facebook + Ads Library",
    color: "#1877F2",
    colorLight: "rgba(24,119,242,0.06)",
    colorBorder: "rgba(24,119,242,0.2)",
    dashboardUrl: "https://developers.facebook.com/apps/957533736630710/dashboard/",
    docsUrl: "https://developers.facebook.com/docs/graph-api",
    env: ["META_APP_ID", "META_APP_SECRET", "INSTAGRAM_APP_ID"],
    using: [
      "Instagram analytics (reach, impressions, engagement)",
      "Media posts + metrici detaliate",
      "Hashtag performance (#trending)",
      "Demografii audiență (vârstă, gen, țară)",
      "Facebook Ads Library — analiza reclamelor",
      "Facebook Page Insights",
    ],
    untapped: [
      { label: "Instagram Stories Analytics", desc: "Vizualizări story, exit rate, reply rate, reach unic (necesită permisiune instagram_content_publish)" },
      { label: "Instagram Reels Insights", desc: "Plays, reach, shares pentru Reels — format cu cea mai mare creștere" },
      { label: "Facebook Ad Account Insights", desc: "CPM, CPC, CTR, ROAS pentru conturile de ads ale clienților (necesită ads_read)" },
      { label: "Cross-platform content comparison", desc: "Același post pe FB vs IG — care performat mai bine și de ce" },
      { label: "Audience Overlap analysis", desc: "Câți % din audiența IG se suprapune cu FB — evitare duplicare bugete ads" },
    ],
    cost: "GRATUIT — rate limits: 200 req/oră/user",
  },
  {
    id: "rapidapi",
    name: "RapidAPI — 2 servicii active",
    icon: "⚡",
    status: "active",
    statusLabel: "Activ — TikTok Trends + Instagram Scraper",
    color: "#0E6AC7",
    colorLight: "rgba(14,106,199,0.06)",
    colorBorder: "rgba(14,106,199,0.2)",
    dashboardUrl: "https://rapidapi.com/developer/dashboard",
    docsUrl: "https://rapidapi.com/hub",
    env: ["RAPIDAPI_KEY"],
    using: [
      "🎵 TikTok Trend Analysis API — căutare videos, useri, hashtag-uri",
      "📸 Instagram Public Bulk Scraper — profil public + ultimele 12 posts competitor",
      "Calcul engagement rate competitor Instagram",
      "Date TikTok: plays, likes, comments, shares",
    ],
    untapped: [
      { label: "TikTok Trending Sounds", desc: "Ce sunete/melodii sunt virale acum — esențial pentru Reels și TikTok organic" },
      { label: "TikTok Category Trends", desc: "Trenduri pe categorii (beauty, food, business) — găsești nișa înainte să explodeze" },
      { label: "Instagram Batch Scraping", desc: "Analizează 10-20 competitori simultan în loc de unul câte unul" },
      { label: "Twitter/X Trending Topics", desc: "Adaugă serviciu RapidAPI pentru Twitter — trending topics pentru context campanii" },
      { label: "Reddit Sentiment API", desc: "Ce vorbește comunitatea despre brandul/nișa clientului — research organic" },
    ],
    cost: "Plătit — verifică planul în dashboard RapidAPI",
  },
  {
    id: "resend",
    name: "Resend — Email API",
    icon: "✉️",
    status: "active",
    statusLabel: "Activ — trimitere rapoarte email",
    color: "#000000",
    colorLight: "rgba(0,0,0,0.04)",
    colorBorder: "rgba(0,0,0,0.12)",
    dashboardUrl: "https://resend.com/overview",
    docsUrl: "https://resend.com/docs",
    env: ["RESEND_API_KEY"],
    using: [
      "Trimitere rapoarte marketing PDF pe email",
      "Email-uri transacționale (confirmare cont, etc.)",
    ],
    untapped: [
      { label: "Weekly digest automat", desc: "Email automat săptămânal către clienți cu top 3 metrici canal lor" },
      { label: "Alert-uri engagement", desc: "Notificare când engagement rate scade sub pragul setat de client" },
      { label: "Email campanii onboarding", desc: "Secvență automată 5 emailuri pentru useri noi care explică platforma" },
      { label: "Raport lunar automat", desc: "PDF generat AI + trimis automat în ziua 1 a lunii fiecărui client" },
    ],
    cost: "GRATUIT — 3.000 emailuri/lună (free tier)",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("profile");

  // Credits tab
  const [budget, setBudget] = useState<BudgetStatus | null>(null);
  const [budgetLoading, setBudgetLoading] = useState(false);
  const [purchasingPack, setPurchasingPack] = useState<string | null>(null);
  const [successPack, setSuccessPack] = useState<string | null>(null);
  const [wasCancelled, setWasCancelled] = useState(false);

  // API keys tab
  const [expandedApi, setExpandedApi] = useState<string | null>(null);

  useEffect(() => {
    const tab = searchParams.get("tab") as Tab | null;
    const success = searchParams.get("success");
    const pack = searchParams.get("pack");
    const cancelled = searchParams.get("cancelled");
    if (tab) setActiveTab(tab);
    if (success === "1" && pack) setSuccessPack(pack);
    if (cancelled === "1") setWasCancelled(true);
  }, [searchParams]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const isAdminAuth =
          typeof window !== "undefined" &&
          localStorage.getItem("admin_authenticated") === "true";

        if (isAdminAuth) {
          setIsAdmin(true);
          setProfile({ email: "admin@markethubpro.com", name: "Admin", plan: "Admin" });
          setLoading(false);
          return;
        }

        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push("/login"); return; }

        const { data } = await supabase
          .from("profiles")
          .select("email, name, plan")
          .eq("id", user.id)
          .single();
        if (data) setProfile(data);
      } catch (err) {
        console.error("Error fetching profile:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [router]);

  const fetchBudget = useCallback(async () => {
    setBudgetLoading(true);
    try {
      const res = await fetch("/api/ai-budget");
      if (res.ok) setBudget(await res.json());
    } catch (err) {
      console.error("Failed to fetch budget:", err);
    } finally {
      setBudgetLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "credits" && !isAdmin) fetchBudget();
  }, [activeTab, isAdmin, fetchBudget]);

  const handlePurchase = async (packId: string) => {
    setPurchasingPack(packId);
    try {
      const res = await fetch("/api/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pack_id: packId }),
      });
      const data = await res.json();
      if (data.checkout_url) window.location.href = data.checkout_url;
    } catch (err) {
      console.error("Purchase failed:", err);
      setPurchasingPack(null);
    }
  };

  const barColor = (pct: number, exhausted: boolean) => {
    if (exhausted) return "#ef4444";
    if (pct >= 80) return "#f59e0b";
    return "linear-gradient(90deg, #C2854C, #E8A96B)";
  };

  const successPackLabel = successPack
    ? CREDIT_PACKS.find(p => p.id === successPack)?.label ?? "Credits"
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 rounded-full animate-spin"
          style={{ borderColor: "rgba(194,133,76,0.2)", borderTopColor: "#C2854C" }} />
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
    { id: "profile",      label: "Profile",       icon: <User size={15} /> },
    { id: "integrations", label: "Integrations",  icon: <Plug size={15} /> },
    ...(!isAdmin ? [{ id: "credits" as Tab, label: "AI Credits", icon: <Zap size={15} /> }] : []),
    ...(isAdmin  ? [{ id: "api-keys" as Tab, label: "API Keys & Oportunități", icon: <Key size={15} />, adminOnly: true }] : []),
  ];

  return (
    <div>
      <Header title="Settings" subtitle="Manage your account and integrations" />

      <div className="p-6 space-y-6">

        {/* ── Tab bar ─────────────────────────────────────────────────────── */}
        <div className="flex gap-1 border-b flex-wrap" style={{ borderColor: "rgba(245,215,160,0.3)" }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all -mb-px rounded-t-md"
              style={
                activeTab === tab.id
                  ? { color: "#C2854C", borderBottom: "2px solid #C2854C", backgroundColor: "rgba(194,133,76,0.05)" }
                  : { color: "#A8967E" }
              }
            >
              {tab.icon}
              {tab.label}
              {tab.id === "credits" && budget?.is_exhausted && (
                <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
              )}
            </button>
          ))}
        </div>

        {/* ══ Profile Tab ════════════════════════════════════════════════════ */}
        {activeTab === "profile" && (
          <div className="rounded-xl border p-6" style={{ backgroundColor: "#FFFCF7", borderColor: "rgba(245,215,160,0.25)" }}>
            <h2 className="text-lg font-bold mb-5" style={{ color: "#292524" }}>Profile Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {[
                { label: "Name",  value: profile?.name || "Not set" },
                { label: "Email", value: profile?.email || "—" },
                { label: "Plan",  value: profile?.plan || "Free" },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-lg p-4" style={{ backgroundColor: "rgba(245,215,160,0.12)" }}>
                  <p className="text-xs font-medium mb-1" style={{ color: "#78614E" }}>{label}</p>
                  <p className="font-semibold" style={{ color: "#292524" }}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ Integrations Tab ═══════════════════════════════════════════════ */}
        {activeTab === "integrations" && (
          <div>
            <h2 className="text-lg font-bold mb-4" style={{ color: "#292524" }}>Integrations</h2>
            <InstagramConnect />
          </div>
        )}

        {/* ══ AI Credits Tab ═════════════════════════════════════════════════ */}
        {activeTab === "credits" && !isAdmin && (
          <div className="space-y-6">
            {successPack && (
              <div className="flex items-start gap-3 p-4 rounded-xl" style={{ backgroundColor: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)" }}>
                <CheckCircle size={20} className="mt-0.5 shrink-0" style={{ color: "#22c55e" }} />
                <div>
                  <p className="font-semibold" style={{ color: "#15803d" }}>Payment successful! 🎉</p>
                  <p className="text-sm mt-0.5" style={{ color: "#16a34a" }}>
                    <strong>{successPackLabel}</strong> have been added to your account and are ready to use immediately.
                  </p>
                </div>
              </div>
            )}
            {wasCancelled && !successPack && (
              <div className="flex items-center gap-3 p-4 rounded-xl" style={{ backgroundColor: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.18)" }}>
                <XCircle size={20} className="shrink-0" style={{ color: "#ef4444" }} />
                <p className="text-sm" style={{ color: "#dc2626" }}>Payment was cancelled — no credits were purchased.</p>
              </div>
            )}

            {/* Budget card */}
            <div className="rounded-xl border p-6" style={{ backgroundColor: "#FFFCF7", borderColor: "rgba(245,215,160,0.3)" }}>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(194,133,76,0.12)" }}>
                    <Zap size={16} style={{ color: "#C2854C" }} />
                  </div>
                  <div>
                    <h3 className="font-bold" style={{ color: "#292524" }}>AI Budget</h3>
                    <p className="text-xs" style={{ color: "#A8967E" }}>
                      {new Date().toLocaleString("default", { month: "long", year: "numeric" })}
                    </p>
                  </div>
                </div>
                <button onClick={fetchBudget} disabled={budgetLoading}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-all"
                  style={{ backgroundColor: "rgba(194,133,76,0.1)", color: "#C2854C" }}>
                  <RefreshCw size={12} className={budgetLoading ? "animate-spin" : ""} />
                  Refresh
                </button>
              </div>

              {budgetLoading && !budget ? (
                <div className="h-24 flex items-center justify-center">
                  <div className="w-7 h-7 border-2 rounded-full animate-spin"
                    style={{ borderColor: "rgba(194,133,76,0.15)", borderTopColor: "#C2854C" }} />
                </div>
              ) : budget ? (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: "Plan Budget", value: `$${budget.budget_usd}`, sub: `${budget.plan_name} / mo`, red: false },
                      { label: "Extra Credits", value: budget.extra_credits_usd > 0 ? `+$${budget.extra_credits_usd}` : "$0", sub: budget.extra_credits_usd > 0 ? "purchased" : "none yet", red: false, green: budget.extra_credits_usd > 0 },
                      { label: "Used This Month", value: `$${budget.spent_usd.toFixed(2)}`, sub: `${budget.usage_pct}% of budget`, red: false },
                      { label: "Remaining", value: `$${budget.remaining_usd.toFixed(2)}`, sub: `of $${budget.total_budget_usd.toFixed(0)} total`, red: budget.is_exhausted },
                    ].map(({ label, value, sub, red, green }) => (
                      <div key={label} className="rounded-lg p-3 text-center"
                        style={{
                          backgroundColor: red ? "rgba(239,68,68,0.08)" : green ? "rgba(34,197,94,0.08)" : "rgba(245,215,160,0.15)",
                          border: red ? "1px solid rgba(239,68,68,0.25)" : green ? "1px solid rgba(34,197,94,0.2)" : "none",
                        }}>
                        <p className="text-xs mb-1" style={{ color: red ? "#dc2626" : green ? "#16a34a" : "#78614E" }}>{label}</p>
                        <p className="text-2xl font-bold" style={{ color: red ? "#ef4444" : green ? "#15803d" : "#292524" }}>{value}</p>
                        <p className="text-xs mt-0.5" style={{ color: "#A8967E" }}>{sub}</p>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-2" style={{ color: "#A8967E" }}>
                      <span>Monthly usage</span>
                      <span className="font-medium" style={{ color: budget.is_exhausted ? "#ef4444" : budget.usage_pct >= 80 ? "#d97706" : "#78614E" }}>
                        {budget.usage_pct}%
                      </span>
                    </div>
                    <div className="w-full h-3 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(245,215,160,0.3)" }}>
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${budget.usage_pct}%`, background: barColor(budget.usage_pct, budget.is_exhausted) }} />
                    </div>
                    <div className="flex justify-between text-xs mt-1.5" style={{ color: "#A8967E" }}>
                      <span>$0</span><span>${budget.total_budget_usd.toFixed(0)}</span>
                    </div>
                  </div>
                  {budget.is_exhausted && (
                    <div className="flex items-start gap-2.5 p-3.5 rounded-lg text-sm" style={{ backgroundColor: "rgba(239,68,68,0.08)", color: "#dc2626" }}>
                      <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                      <span>Bugetul AI pentru această lună este <strong>complet epuizat</strong>. Cumpără credite extra pentru a continua.</span>
                    </div>
                  )}
                  {!budget.is_exhausted && budget.usage_pct >= 80 && (
                    <div className="flex items-start gap-2.5 p-3.5 rounded-lg text-sm" style={{ backgroundColor: "rgba(245,158,11,0.08)", color: "#d97706" }}>
                      <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                      <span>Ai folosit <strong>{budget.usage_pct}%</strong> din bugetul lunar AI. Consideră achiziționarea de credite extra.</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-center py-4" style={{ color: "#A8967E" }}>Unable to load budget status.</p>
              )}
            </div>

            {/* Credit packs */}
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <Sparkles size={18} style={{ color: "#C2854C" }} />
                <h3 className="font-bold text-lg" style={{ color: "#292524" }}>Buy Extra AI Credits</h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: "rgba(194,133,76,0.1)", color: "#C2854C" }}>
                  One-time · No subscription
                </span>
              </div>
              <p className="text-sm mb-5" style={{ color: "#A8967E" }}>
                Credits kick in automatically after your plan&apos;s monthly budget runs out.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {CREDIT_PACKS.map(pack => {
                  const captionSets = Math.floor(pack.credits / 25);
                  const agentMsgs  = Math.floor(pack.credits / 35);
                  const isPopular   = pack.bonus_pct === 15;
                  const isBest      = pack.bonus_pct === 20;
                  return (
                    <div key={pack.id} className="relative rounded-xl border p-5 flex flex-col gap-4 transition-all hover:shadow-lg"
                      style={{ backgroundColor: "#FFFCF7", borderColor: isBest ? "rgba(194,133,76,0.6)" : isPopular ? "rgba(194,133,76,0.35)" : "rgba(245,215,160,0.3)" }}>
                      {(isPopular || isBest) && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-bold whitespace-nowrap"
                          style={{ backgroundColor: isBest ? "#292524" : "#C2854C", color: "white" }}>
                          {isBest ? "✦ BEST VALUE" : "★ POPULAR"}
                        </div>
                      )}
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-3xl font-extrabold" style={{ color: "#292524" }}>${pack.usd}</span>
                        <span className="text-sm" style={{ color: "#A8967E" }}>USD</span>
                      </div>
                      <div>
                        <p className="font-semibold text-base" style={{ color: "#292524" }}>{pack.credits.toLocaleString()} credits</p>
                        {pack.bonus_pct > 0 ? (
                          <div className="flex items-center gap-1 mt-1">
                            <TrendingUp size={12} style={{ color: "#22c55e" }} />
                            <span className="text-xs font-semibold" style={{ color: "#16a34a" }}>+{pack.bonus_pct}% bonus included</span>
                          </div>
                        ) : <p className="text-xs mt-1" style={{ color: "#A8967E" }}>No bonus</p>}
                      </div>
                      <div className="rounded-lg p-3 space-y-1" style={{ backgroundColor: "rgba(245,215,160,0.12)" }}>
                        <p className="text-xs" style={{ color: "#78614E" }}>≈ <strong style={{ color: "#292524" }}>{captionSets.toLocaleString()}</strong> caption sets</p>
                        <p className="text-xs" style={{ color: "#78614E" }}>≈ <strong style={{ color: "#292524" }}>{agentMsgs.toLocaleString()}</strong> agent messages</p>
                      </div>
                      <button onClick={() => handlePurchase(pack.id)} disabled={purchasingPack !== null}
                        className="mt-auto w-full py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2"
                        style={{ backgroundColor: isBest || isPopular ? "#C2854C" : "rgba(194,133,76,0.12)", color: isBest || isPopular ? "white" : "#C2854C", opacity: purchasingPack !== null ? 0.65 : 1 }}>
                        {purchasingPack === pack.id ? (
                          <><div className="w-3.5 h-3.5 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "white" }} />Redirecting...</>
                        ) : (
                          <><CreditCard size={14} />Buy ${pack.usd}</>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="rounded-xl p-4 text-sm" style={{ backgroundColor: "rgba(245,215,160,0.1)", border: "1px solid rgba(245,215,160,0.25)" }}>
              <p style={{ color: "#78614E" }}>
                <strong style={{ color: "#292524" }}>💡 How credits work:</strong>{" "}
                Your plan includes a monthly AI budget. Extra credits are consumed automatically once that budget runs out. Credits expire at end of billing month.
              </p>
            </div>
          </div>
        )}

        {/* ══ API Keys Tab (admin only) ══════════════════════════════════════ */}
        {activeTab === "api-keys" && isAdmin && (
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold" style={{ color: "#292524" }}>API Keys — Monitorizare & Oportunități</h2>
                <p className="text-sm mt-1" style={{ color: "#A8967E" }}>
                  Toate API-urile active ale platformei, cu link-uri directe la console și analiza datelor neutilizate.
                </p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ backgroundColor: "rgba(245,158,11,0.12)", color: "#d97706", border: "1px solid rgba(245,158,11,0.25)" }}>
                👑 Admin only
              </span>
            </div>

            {API_KEYS.map(api => {
              const isExpanded = expandedApi === api.id;
              return (
                <div key={api.id} className="rounded-xl border overflow-hidden transition-all"
                  style={{ backgroundColor: "#FFFCF7", borderColor: isExpanded ? api.colorBorder : "rgba(245,215,160,0.25)" }}>

                  {/* Header row */}
                  <div className="p-5 flex items-center gap-4">
                    {/* Icon + color strip */}
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                      style={{ backgroundColor: api.colorLight, border: `1px solid ${api.colorBorder}` }}>
                      {api.icon}
                    </div>

                    {/* Name + status */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold" style={{ color: "#292524" }}>{api.name}</h3>
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: "rgba(34,197,94,0.1)", color: "#16a34a", border: "1px solid rgba(34,197,94,0.2)" }}>
                          ✓ {api.statusLabel}
                        </span>
                      </div>
                      <p className="text-xs mt-1" style={{ color: "#A8967E" }}>
                        Env: <code className="px-1 py-0.5 rounded text-xs" style={{ backgroundColor: "rgba(0,0,0,0.05)" }}>
                          {api.env.join(" · ")}
                        </code>
                        <span className="ml-3" style={{ color: "#C2854C" }}>💰 {api.cost}</span>
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <a href={api.dashboardUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all hover:opacity-80"
                        style={{ backgroundColor: api.colorLight, color: api.color, border: `1px solid ${api.colorBorder}` }}>
                        <ExternalLink size={12} />
                        Dashboard
                      </a>
                      <a href={api.docsUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
                        style={{ backgroundColor: "rgba(245,215,160,0.15)", color: "#78614E" }}>
                        <ExternalLink size={12} />
                        Docs
                      </a>
                      <button onClick={() => setExpandedApi(isExpanded ? null : api.id)}
                        className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
                        style={{ backgroundColor: "rgba(194,133,76,0.1)", color: "#C2854C" }}>
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        {isExpanded ? "Ascunde" : "Detalii"}
                      </button>
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t px-5 pb-5 pt-4 grid grid-cols-1 md:grid-cols-2 gap-5"
                      style={{ borderColor: "rgba(245,215,160,0.25)" }}>

                      {/* Currently using */}
                      <div>
                        <h4 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: "#292524" }}>
                          <CheckCircle size={15} style={{ color: "#22c55e" }} />
                          Folosit curent în platformă
                        </h4>
                        <ul className="space-y-2">
                          {api.using.map((item, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "#78614E" }}>
                              <span className="mt-0.5 text-green-500 shrink-0">✓</span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Untapped potential */}
                      <div>
                        <h4 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: "#292524" }}>
                          <Sparkles size={15} style={{ color: "#C2854C" }} />
                          Date valoroase neutilizate încă
                        </h4>
                        <ul className="space-y-3">
                          {api.untapped.map((item, i) => (
                            <li key={i} className="rounded-lg p-3" style={{ backgroundColor: "rgba(194,133,76,0.06)", border: "1px solid rgba(194,133,76,0.15)" }}>
                              <p className="text-sm font-semibold" style={{ color: "#C2854C" }}>💡 {item.label}</p>
                              <p className="text-xs mt-0.5" style={{ color: "#78614E" }}>{item.desc}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Footer note */}
            <div className="rounded-xl p-4 text-sm" style={{ backgroundColor: "rgba(245,215,160,0.08)", border: "1px solid rgba(245,215,160,0.2)" }}>
              <p style={{ color: "#78614E" }}>
                <strong style={{ color: "#292524" }}>📌 Notă:</strong>{" "}
                Soldul real al contului Anthropic se vede doar la{" "}
                <a href="https://console.anthropic.com/settings/billing" target="_blank" rel="noopener noreferrer"
                  className="underline font-medium" style={{ color: "#7C3AED" }}>
                  console.anthropic.com/settings/billing
                </a>.
                {" "}Platforma nu poate citi soldul din API — Anthropic nu oferă un endpoint pentru asta.
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
