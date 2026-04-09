"use client";

import { useState, useEffect } from "react";
import {
  Clock, Zap, Star, Building2, Check, X, Loader2,
  ArrowRight, Bot, Users, CalendarDays, BarChart2,
  Database, Globe, Shield,
} from "lucide-react";
import Link from "next/link";

interface Plan {
  id: string;
  name: string;
  price: number;
  period: string;
  premium_actions_per_month: number;
  basic_ai_unlimited: boolean;
  tracked_channels: number;
  instagram_accounts: number;
  tiktok_accounts: number;
  competitor_brands: number;
  team_members: number;
  client_accounts: number;
  history_days: number;
  has_calendar: boolean;
  has_tiktok: boolean;
  has_api_access: boolean;
  has_white_label: boolean;
  has_priority_support: boolean;
  sla_uptime: number | null;
}

const PLAN_COLORS: Record<string, string> = {
  lite:       "#F59E0B",
  pro:        "#8B5CF6",
  business:   "#E1306C",
  enterprise: "#16A34A",
};

const PLAN_ICONS: Record<string, React.ReactNode> = {
  lite:       <Star className="w-5 h-5" />,
  pro:        <BarChart2 className="w-5 h-5" />,
  business:   <Building2 className="w-5 h-5" />,
  enterprise: <Globe className="w-5 h-5" />,
};

function fmtVal(n: number) {
  if (n === -1) return "Unlimited";
  return String(n);
}

function fmtDays(n: number) {
  if (n === -1) return "Unlimited";
  if (n >= 365) return `${Math.round(n / 365)}yr`;
  return `${n}d`;
}

function Row({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {ok
        ? <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#16A34A" }} />
        : <X className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#D1C4B0" }} />}
      <span className="text-xs" style={{ color: ok ? "#5C4A35" : "#A8967E" }}>{label}</span>
    </div>
  );
}

export default function UpgradeRequiredPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/pricing")
      .then(r => r.json())
      .then(d => {
        if (d.plans) {
          // Exclude free_test from upgrade options
          setPlans(d.plans.filter((p: Plan) => p.id !== "free_test"));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleUpgrade = async (planId: string) => {
    setError("");
    setUpgrading(planId);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        setUpgrading(null);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Network error. Please try again.");
      setUpgrading(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16"
      style={{ backgroundColor: "#FFF8F0" }}>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <div className="flex justify-center mb-5">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
          style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)" }}>
          <Clock className="w-8 h-8 text-white" />
        </div>
      </div>

      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-5"
        style={{ backgroundColor: "rgba(245,158,11,0.1)", color: "#D97706", border: "1px solid rgba(245,158,11,0.25)" }}>
        Your free trial has ended
      </div>

      <h1 className="text-3xl md:text-4xl font-black mb-3 text-center max-w-xl"
        style={{ color: "#292524" }}>
        Enjoyed MarketHub Pro?<br />
        <span style={{ color: "#F59E0B" }}>Keep the momentum going.</span>
      </h1>

      <p className="text-base text-center max-w-lg mb-3" style={{ color: "#78716C" }}>
        Your 7-day trial is over. Choose a plan below to unlock all features,
        keep your data, and continue growing your brand with AI-powered insights.
      </p>

      <p className="text-sm font-semibold text-center mb-10" style={{ color: "#A8967E" }}>
        No contracts · Cancel anytime · Instant activation
      </p>

      {error && (
        <div className="mb-8 text-sm px-4 py-3 rounded-xl text-center max-w-md"
          style={{ backgroundColor: "rgba(239,68,68,0.07)", color: "#dc2626", border: "1px solid rgba(239,68,68,0.2)" }}>
          {error}
        </div>
      )}

      {/* ── Plan cards ──────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#F59E0B" }} />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5 w-full max-w-6xl mb-12">
          {plans.map(plan => {
            const color = PLAN_COLORS[plan.id] ?? "#F59E0B";
            const isPopular = plan.id === "pro";
            const isBusy = upgrading === plan.id;

            return (
              <div key={plan.id}
                className="rounded-2xl p-5 flex flex-col transition-all hover:scale-[1.02]"
                style={{
                  backgroundColor: isPopular ? color : "#FFFCF7",
                  border: isPopular ? "none" : `1px solid rgba(245,215,160,0.3)`,
                  boxShadow: isPopular ? `0 12px 40px ${color}40` : "0 2px 8px rgba(120,97,78,0.06)",
                }}>

                {isPopular && (
                  <div className="text-xs font-bold text-center py-1 px-3 rounded-full mb-3 self-center"
                    style={{ backgroundColor: "rgba(255,255,255,0.2)", color: "#fff" }}>
                    MOST POPULAR
                  </div>
                )}

                {/* Icon + name */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: isPopular ? "rgba(255,255,255,0.2)" : `${color}15`, color: isPopular ? "#fff" : color }}>
                    {PLAN_ICONS[plan.id] ?? <Zap className="w-4 h-4" />}
                  </div>
                  <span className="font-bold" style={{ color: isPopular ? "#fff" : "#292524" }}>
                    {plan.name}
                  </span>
                </div>

                {/* Price */}
                <div className="mb-4">
                  <span className="text-3xl font-black" style={{ color: isPopular ? "#fff" : color }}>
                    ${plan.price}
                  </span>
                  <span className="text-xs ml-1" style={{ color: isPopular ? "rgba(255,255,255,0.7)" : "#A8967E" }}>
                    /month
                  </span>
                </div>

                {/* Features */}
                <div className="space-y-2 flex-1 mb-5">
                  {/* Premium AI Actions */}
                  <div className="flex items-center gap-2">
                    <Bot className="w-3.5 h-3.5 flex-shrink-0"
                      style={{ color: isPopular ? "rgba(255,255,255,0.8)" : color }} />
                    <span className="text-xs" style={{ color: isPopular ? "rgba(255,255,255,0.9)" : "#5C4A35" }}>
                      {fmtVal(plan.premium_actions_per_month)} Premium AI Actions/mo
                    </span>
                  </div>
                  {/* Basic AI unlimited */}
                  <div className="flex items-center gap-2">
                    <Bot className="w-3.5 h-3.5 flex-shrink-0"
                      style={{ color: isPopular ? "rgba(255,255,255,0.8)" : color }} />
                    <span className="text-xs" style={{ color: isPopular ? "rgba(255,255,255,0.9)" : "#5C4A35" }}>
                      Basic AI: unlimited
                    </span>
                  </div>

                  {/* Channels */}
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 flex-shrink-0"
                      style={{ color: isPopular ? "rgba(255,255,255,0.8)" : color }} />
                    <span className="text-xs" style={{ color: isPopular ? "rgba(255,255,255,0.9)" : "#5C4A35" }}>
                      {fmtVal(plan.tracked_channels)} tracked channels
                    </span>
                  </div>

                  {/* History */}
                  <div className="flex items-center gap-2">
                    <Database className="w-3.5 h-3.5 flex-shrink-0"
                      style={{ color: isPopular ? "rgba(255,255,255,0.8)" : color }} />
                    <span className="text-xs" style={{ color: isPopular ? "rgba(255,255,255,0.9)" : "#5C4A35" }}>
                      {fmtDays(plan.history_days)} history
                    </span>
                  </div>

                  {/* Feature flags */}
                  <div className="pt-2 space-y-1.5">
                    {isPopular ? (
                      // Popular plan shows checks in white
                      <>
                        <CheckRow ok={plan.has_calendar} label="Content Calendar" popular />
                        <CheckRow ok={plan.has_tiktok} label="TikTok Analytics" popular />
                        <CheckRow ok={plan.has_api_access} label="API Access" popular />
                        <CheckRow ok={plan.has_white_label} label="White Label" popular />
                        <CheckRow ok={plan.has_priority_support} label="Priority Support" popular />
                        <CheckRow ok={plan.sla_uptime !== null} label={plan.sla_uptime ? `${plan.sla_uptime}% SLA` : "SLA Uptime"} popular />
                      </>
                    ) : (
                      <>
                        <Row ok={plan.has_calendar} label="Content Calendar" />
                        <Row ok={plan.has_tiktok} label="TikTok Analytics" />
                        <Row ok={plan.has_api_access} label="API Access" />
                        <Row ok={plan.has_white_label} label="White Label" />
                        <Row ok={plan.has_priority_support} label="Priority Support" />
                        <Row ok={plan.sla_uptime !== null} label={plan.sla_uptime ? `${plan.sla_uptime}% SLA` : "SLA Uptime"} />
                      </>
                    )}
                  </div>
                </div>

                {/* CTA */}
                <button
                  type="button"
                  disabled={!!upgrading}
                  onClick={() => handleUpgrade(plan.id)}
                  className="w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-60"
                  style={isPopular
                    ? { backgroundColor: "rgba(255,255,255,0.95)", color: color }
                    : { backgroundColor: color, color: "#fff" }}>
                  {isBusy ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>Choose {plan.name} <ArrowRight className="w-3.5 h-3.5" /></>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Footer links ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-3">
        <p className="text-sm text-center max-w-md" style={{ color: "#A8967E" }}>
          Still deciding? You can{" "}
          <Link href="/pricing" className="underline font-medium" style={{ color: "#F59E0B" }}>
            compare all plans
          </Link>{" "}
          or contact us at{" "}
          <a href="mailto:support@markethubpro.com" className="underline" style={{ color: "#F59E0B" }}>
            support@markethubpro.com
          </a>
        </p>
        <Link href="/login" className="text-xs" style={{ color: "#C4AA8A" }}>
          Sign in to a different account
        </Link>
      </div>
    </div>
  );
}

function CheckRow({ ok, label, popular }: { ok: boolean; label: string; popular?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {ok
        ? <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: popular ? "rgba(255,255,255,0.9)" : "#16A34A" }} />
        : <X className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "rgba(255,255,255,0.3)" }} />}
      <span className="text-xs" style={{ color: ok ? (popular ? "rgba(255,255,255,0.9)" : "#5C4A35") : (popular ? "rgba(255,255,255,0.4)" : "#A8967E") }}>
        {label}
      </span>
    </div>
  );
}
