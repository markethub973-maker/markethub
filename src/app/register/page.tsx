"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Zap, Eye, EyeOff, Lock, Mail, User, Check, X, Loader2,
  Instagram, Clock, Users, Briefcase, BarChart2, Bot, Shield, Star,
} from "lucide-react";
import PasswordStrengthMeter from "@/components/ui/PasswordStrengthMeter";

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

const BADGES: Record<string, { label: string; color: string }> = {
  free_test:  { label: "Try Free",   color: "#78614E" },
  lite:       { label: "Start Here", color: "var(--color-primary)" },
  pro:        { label: "Best Value", color: "#8B5CF6" },
  business:   { label: "Studio",     color: "#E1306C" },
  agency: { label: "Agency",     color: "#16A34A" },
};

function fmtVal(n: number, suffix = "") {
  if (n === -1) return "Unlimited";
  return String(n) + suffix;
}

function fmtDays(n: number) {
  if (n === -1) return "Unlimited";
  if (n >= 365) return `${Math.round(n / 365)}yr`;
  return `${n}d`;
}

function Row({ icon, label, value, ok }: { icon: React.ReactNode; label: string; value?: string; ok?: boolean }) {
  const isCheck = ok !== undefined;
  return (
    <div className="flex items-center gap-2 py-1.5 border-b" style={{ borderColor: "rgba(245,215,160,0.15)" }}>
      <span style={{ color: "#C4AA8A" }} className="flex-shrink-0">{icon}</span>
      <span className="text-xs flex-1" style={{ color: "#78614E" }}>{label}</span>
      {isCheck ? (
        ok
          ? <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#16A34A" }} />
          : <X className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#D1C4B0" }} />
      ) : (
        <span className="text-xs font-bold" style={{ color: "var(--color-text)" }}>{value}</span>
      )}
    </div>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [step, setStep] = useState<"plan" | "form">("plan");
  const [selectedPlan, setSelectedPlan] = useState("free_test");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/pricing")
      .then(r => r.json())
      .then(d => { if (d.plans) setPlans(d.plans); })
      .finally(() => setLoadingPlans(false));
  }, []);

  // Generate a lightweight device fingerprint from browser signals
  function getDeviceFingerprint(): string {
    try {
      const nav = window.navigator;
      const parts = [
        nav.userAgent,
        nav.language,
        screen.width + "x" + screen.height + "x" + screen.colorDepth,
        new Date().getTimezoneOffset(),
        nav.hardwareConcurrency ?? "",
        (nav as any).deviceMemory ?? "",
      ].join("|");
      // Simple hash
      let hash = 0;
      for (let i = 0; i < parts.length; i++) {
        hash = ((hash << 5) - hash + parts.charCodeAt(i)) | 0;
      }
      return Math.abs(hash).toString(36);
    } catch { return ""; }
  }

  const handleSelectPlan = (planId: string) => {
    setSelectedPlan(planId);
    setStep("form");
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, plan: selectedPlan, device_fingerprint: getDeviceFingerprint() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "An error occurred."); setLoading(false); return; }
      setSuccess("Account created! Check your email for confirmation, then sign in.");
      setTimeout(() => router.push("/login"), 3000);
    } catch {
      setError("Network error. Try again.");
      setLoading(false);
    }
  };

  const currentPlan = plans.find(p => p.id === selectedPlan);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--color-bg)" }}>
      <div className="max-w-7xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex w-14 h-14 rounded-xl items-center justify-center mb-4"
            style={{ background: "linear-gradient(135deg,#F59E0B,#D97706)" }}>
            <Zap className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-1" style={{ color: "var(--color-text)" }}>MarketHub Pro</h1>
          <p className="text-sm" style={{ color: "#A8967E" }}>Choose your plan and start today</p>
        </div>

        {step === "plan" ? (
          <>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-1" style={{ color: "var(--color-text)" }}>Select Your Plan</h2>
              <p className="text-sm" style={{ color: "#A8967E" }}>Start free for 7 days, no credit card required</p>
            </div>

            {loadingPlans ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--color-primary)" }} />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
                {plans.map(plan => {
                  const badge = BADGES[plan.id] ?? { label: "Plan", color: "var(--color-primary)" };
                  const isFree = plan.id === "free_test";
                  const isSelected = selectedPlan === plan.id;

                  return (
                    <div key={plan.id}
                      onClick={() => handleSelectPlan(plan.id)}
                      className="rounded-2xl p-6 cursor-pointer transition-all hover:scale-[1.02] flex flex-col"
                      style={{
                        backgroundColor: "var(--color-bg-secondary)",
                        border: isSelected ? `2px solid ${badge.color}` : "1px solid rgba(245,215,160,0.25)",
                        boxShadow: isSelected ? `0 8px 24px ${badge.color}25` : "0 1px 3px rgba(120,97,78,0.08)",
                      }}>

                      {/* Badge */}
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full mb-4 inline-block self-start"
                        style={{ backgroundColor: `${badge.color}18`, color: badge.color }}>
                        {badge.label}
                      </span>

                      {/* Name + Price */}
                      <h3 className="text-xl font-bold mb-0.5" style={{ color: "var(--color-text)" }}>{plan.name}</h3>
                      <div className="flex items-end gap-1 mb-1">
                        {isFree ? (
                          <span className="text-3xl font-bold" style={{ color: badge.color }}>Free</span>
                        ) : (
                          <>
                            <span className="text-3xl font-bold" style={{ color: badge.color }}>${plan.price}</span>
                            <span className="text-sm mb-1" style={{ color: "#A8967E" }}>/month</span>
                          </>
                        )}
                      </div>
                      <p className="text-xs mb-5 font-semibold" style={{ color: "#A8967E" }}>
                        {isFree
                          ? "7-day trial · No card required"
                          : `${fmtVal(plan.premium_actions_per_month)} Premium AI Actions/month`}
                      </p>

                      {/* ── AI & Usage ── */}
                      <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: badge.color }}>AI &amp; Usage</p>
                      <Row icon={<Bot className="w-3.5 h-3.5" />} label="Premium AI Actions/month" value={fmtVal(plan.premium_actions_per_month)} />
                      <Row icon={<Bot className="w-3.5 h-3.5" />} label="Basic AI" value="Unlimited" />

                      {/* ── Accounts & Channels ── */}
                      <p className="text-xs font-bold uppercase tracking-wide mt-4 mb-1" style={{ color: badge.color }}>Accounts & Channels</p>
                      <Row icon={<Instagram className="w-3.5 h-3.5" />} label="Instagram accounts" value={fmtVal(plan.instagram_accounts)} />
                      <Row icon={<BarChart2 className="w-3.5 h-3.5" />} label="TikTok accounts" value={fmtVal(plan.tiktok_accounts)} />
                      <Row icon={<BarChart2 className="w-3.5 h-3.5" />} label="Tracked channels" value={fmtVal(plan.tracked_channels)} />
                      <Row icon={<BarChart2 className="w-3.5 h-3.5" />} label="Competitor brands" value={fmtVal(plan.competitor_brands)} />

                      {/* ── Team & Clients ── */}
                      <p className="text-xs font-bold uppercase tracking-wide mt-4 mb-1" style={{ color: badge.color }}>Team & Clients</p>
                      <Row icon={<Users className="w-3.5 h-3.5" />} label="Team members" value={fmtVal(plan.team_members)} />
                      <Row icon={<Briefcase className="w-3.5 h-3.5" />} label="Client accounts" value={fmtVal(plan.client_accounts)} />

                      {/* ── Data & History ── */}
                      <p className="text-xs font-bold uppercase tracking-wide mt-4 mb-1" style={{ color: badge.color }}>Data & History</p>
                      <Row icon={<Clock className="w-3.5 h-3.5" />} label="Analytics history" value={fmtDays(plan.history_days)} />

                      {/* ── Features ── */}
                      <p className="text-xs font-bold uppercase tracking-wide mt-4 mb-1" style={{ color: badge.color }}>Features</p>
                      <Row icon={<Check className="w-3.5 h-3.5" />} label="Post scheduler (calendar)" ok={plan.has_calendar} />
                      <Row icon={<Check className="w-3.5 h-3.5" />} label="TikTok analytics" ok={plan.has_tiktok} />
                      <Row icon={<Check className="w-3.5 h-3.5" />} label="API access" ok={plan.has_api_access} />
                      <Row icon={<Check className="w-3.5 h-3.5" />} label="White label reports" ok={plan.has_white_label} />
                      <Row icon={<Star className="w-3.5 h-3.5" />} label="Priority support" ok={plan.has_priority_support} />
                      {plan.sla_uptime !== null && (
                        <Row icon={<Shield className="w-3.5 h-3.5" />} label="SLA uptime" value={`${plan.sla_uptime}%`} />
                      )}

                      {/* CTA */}
                      <button className="w-full py-2.5 rounded-lg text-sm font-bold transition-all mt-5"
                        style={{
                          backgroundColor: isSelected ? badge.color : `${badge.color}15`,
                          color: isSelected ? "white" : badge.color,
                        }}>
                        {isSelected ? "Selected ✓" : isFree ? "Start Free" : `Choose ${plan.name}`}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <p className="text-center text-sm" style={{ color: "#A8967E" }}>
              Already have an account?{" "}
              <Link href="/login" className="font-semibold" style={{ color: "var(--color-primary)" }}>Sign in</Link>
            </p>
          </>
        ) : (
          /* Registration Form */
          <div className="max-w-md mx-auto">
            <button onClick={() => setStep("plan")}
              className="text-sm font-semibold mb-6 flex items-center gap-1.5"
              style={{ color: "var(--color-primary)" }}>
              ← Back to plans
            </button>

            {/* Selected plan summary */}
            {currentPlan && (
              <div className="rounded-xl p-4 mb-6"
                style={{ backgroundColor: `${(BADGES[currentPlan.id]?.color ?? "var(--color-primary)")}10`, border: `1px solid ${(BADGES[currentPlan.id]?.color ?? "var(--color-primary)")}30` }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold" style={{ color: "#A8967E" }}>Selected plan</p>
                    <p className="text-lg font-bold" style={{ color: "var(--color-text)" }}>{currentPlan.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: "#A8967E" }}>
                      {fmtVal(currentPlan.premium_actions_per_month)} Premium Actions · {fmtVal(currentPlan.instagram_accounts)} Instagram · {fmtDays(currentPlan.history_days)} history
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold" style={{ color: BADGES[currentPlan.id]?.color ?? "var(--color-primary)" }}>
                      {currentPlan.price === 0 ? "Free" : `$${currentPlan.price}/mo`}
                    </p>
                    <p className="text-xs" style={{ color: "#A8967E" }}>{currentPlan.period}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Form */}
            <div className="rounded-2xl p-8"
              style={{ backgroundColor: "var(--color-bg-secondary)", border: "1px solid rgba(245,215,160,0.35)", boxShadow: "0 4px 24px rgba(120,97,78,0.12)" }}>
              <h2 className="text-xl font-bold mb-1" style={{ color: "var(--color-text)" }}>Create Account</h2>
              <p className="text-sm mb-6" style={{ color: "#A8967E" }}>Start free, no card required</p>

              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold mb-1.5 block" style={{ color: "#78614E" }}>Full name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#C4AA8A" }} />
                    <input type="text" value={name} onChange={e => setName(e.target.value)}
                      placeholder="Your name" required
                      className="w-full pl-10 pr-4 py-3 text-sm rounded-lg focus:outline-none"
                      style={{ border: "1px solid rgba(245,215,160,0.4)", backgroundColor: "var(--color-bg)", color: "var(--color-text)" }} />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold mb-1.5 block" style={{ color: "#78614E" }}>Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#C4AA8A" }} />
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="email@example.com" required
                      className="w-full pl-10 pr-4 py-3 text-sm rounded-lg focus:outline-none"
                      style={{ border: "1px solid rgba(245,215,160,0.4)", backgroundColor: "var(--color-bg)", color: "var(--color-text)" }} />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold mb-1.5 block" style={{ color: "#78614E" }}>Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#C4AA8A" }} />
                    <input type={showPassword ? "text" : "password"} value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="At least 8 characters" required minLength={8}
                      className="w-full pl-10 pr-10 py-3 text-sm rounded-lg focus:outline-none"
                      style={{ border: "1px solid rgba(245,215,160,0.4)", backgroundColor: "var(--color-bg)", color: "var(--color-text)" }} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "#C4AA8A" }}>
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <PasswordStrengthMeter password={password} />
                </div>

                {error && (
                  <div className="text-sm px-3 py-2 rounded-lg"
                    style={{ backgroundColor: "rgba(239,68,68,0.08)", color: "#dc2626", border: "1px solid rgba(239,68,68,0.2)" }}>
                    {error}
                  </div>
                )}
                {success && (
                  <div className="text-sm px-3 py-2 rounded-lg"
                    style={{ backgroundColor: "rgba(22,163,74,0.08)", color: "#16a34a", border: "1px solid rgba(22,163,74,0.2)" }}>
                    {success}
                  </div>
                )}

                <button type="submit" disabled={loading}
                  className="w-full py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2"
                  style={{ backgroundColor: "var(--color-primary)", color: "#1C1814", opacity: loading ? 0.7 : 1 }}>
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? "Creating account..." : "Create free account"}
                </button>
              </form>

              <p className="text-center text-xs mt-5" style={{ color: "#A8967E" }}>
                Already have an account?{" "}
                <Link href="/login" className="font-semibold" style={{ color: "var(--color-primary)" }}>Sign in</Link>
              </p>
            </div>
          </div>
        )}

        <p className="text-center text-xs mt-8" style={{ color: "#C4AA8A" }}>
          © 2026 MarketHub Pro ·{" "}
          <a href="/privacy" style={{ color: "var(--color-primary)" }}>Privacy</a>{" "}·{" "}
          <a href="/terms" style={{ color: "var(--color-primary)" }}>Terms</a>
        </p>
      </div>
    </div>
  );
}
