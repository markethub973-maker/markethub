"use client";

import { useEffect, useState } from "react";
import { Check, X, Zap, ArrowRight, Menu } from "lucide-react";
import Link from "next/link";

const FREE_PLANS = ["free_test", "expired"];

const plans = [
  {
    id: "free_test",
    name: "Starter",
    duration: "14 Days",
    price: "$0",
    priceNum: 0,
    premiumActions: "5",
    description: "Test the platform for free",
    cta: "Start Free",
    popular: false,
    features: [
      "5 Premium AI Actions",
      "Unlimited Basic AI (captions, drafts)",
      "1 social account",
      "YouTube analytics",
      "TikTok analytics (50 req/day)",
      "Instagram analytics (50 req/day)",
      "Basic dashboard",
      "1 competitor brand",
    ],
    missing: ["Content calendar", "Lead Finder & CRM", "API access"],
  },
  {
    id: "lite",
    name: "Creator",
    duration: "/ month",
    price: "$24",
    priceNum: 24,
    premiumActions: "20",
    description: "For solo creators",
    cta: "Get Creator",
    popular: true,
    features: [
      "20 Premium AI Actions / month",
      "Unlimited Basic AI (captions, drafts)",
      "2 social accounts",
      "Instagram analytics (full)",
      "TikTok analytics",
      "Content calendar + scheduling",
      "Ads library access",
      "Email reports",
      "Link in Bio pages",
      "Hashtag manager",
      "Campaigns",
      "8 competitor brands",
      "12 tracked channels",
    ],
    missing: ["Lead Finder & CRM", "API access"],
  },
  {
    id: "pro",
    name: "Pro",
    duration: "/ month",
    price: "$49",
    priceNum: 49,
    premiumActions: "50",
    description: "For agencies & professionals",
    cta: "Get Pro",
    popular: false,
    features: [
      "50 Premium AI Actions / month",
      "Unlimited Basic AI (captions, drafts)",
      "5 client accounts",
      "Everything in Creator",
      "Lead Finder & CRM",
      "3 team members",
      "20 competitor brands",
      "30 tracked channels",
      "Priority support",
    ],
    missing: ["API access", "White label"],
  },
  {
    id: "business",
    name: "Studio",
    duration: "/ month",
    price: "$99",
    priceNum: 99,
    premiumActions: "200",
    description: "For digital marketing agencies",
    cta: "Get Studio",
    popular: false,
    features: [
      "200 Premium AI Actions / month",
      "Unlimited Basic AI (captions, drafts)",
      "20 client accounts",
      "Everything in Pro",
      "5 team members",
      "50 competitor brands",
      "10 Instagram/TikTok accounts",
      "API access",
      "99.5% SLA uptime",
      "2 years data history",
    ],
    missing: ["White label"],
  },
  {
    id: "enterprise",
    name: "Agency",
    duration: "/ month",
    price: "$249",
    priceNum: 249,
    premiumActions: "1,000",
    description: "For marketing agencies at scale",
    cta: "Contact Sales",
    popular: false,
    features: [
      "1,000 Premium AI Actions / month",
      "Unlimited Basic AI (captions, drafts)",
      "Unlimited client accounts",
      "Unlimited team members",
      "Unlimited competitor brands",
      "Unlimited Instagram/TikTok",
      "White label",
      "Dedicated Account Manager",
      "API access",
      "99.9% SLA uptime",
    ],
    missing: [],
  },
];

export default function PricingPage() {
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isLoggedIn = currentPlan !== null;

  useEffect(() => {
    fetch("/api/billing")
      .then((r) => r.json())
      .then((d) => setCurrentPlan(d.plan ?? "guest"))
      .catch(() => setCurrentPlan("guest"));
  }, []);

  const handleCta = async (planId: string) => {
    if (planId === "free_test") {
      window.location.href = "/register";
      return;
    }
    if (planId === "enterprise") {
      window.location.href = "mailto:markethub973@gmail.com?subject=Enterprise Plan";
      return;
    }
    if (!isLoggedIn || currentPlan === "guest") {
      window.location.href = `/register?plan=${planId}`;
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FAFAF8" }}>

      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b" style={{ backgroundColor: "#1C1814", borderColor: "rgba(245,215,160,0.1)" }}>
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)" }}>
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg" style={{ color: "#FFF8F0" }}>MarketHub Pro</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            {isLoggedIn && currentPlan !== "guest" ? (
              <>
                <Link href="/" className="text-sm font-medium" style={{ color: "#A8967E" }}>Dashboard</Link>
                <Link href="/dashboard/billing" className="text-sm font-medium" style={{ color: "#A8967E" }}>Billing</Link>
              </>
            ) : (
              <>
                <Link href="/login" className="text-sm font-medium" style={{ color: "#A8967E" }}>Sign in</Link>
                <Link href="/register" className="px-4 py-2 rounded-lg text-sm font-bold" style={{ backgroundColor: "#F59E0B", color: "#1C1814" }}>
                  Start free
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button type="button" aria-label="Toggle menu" className="md:hidden p-2" style={{ color: "#A8967E" }} onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            <Menu size={22} />
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t px-4 py-4 space-y-3" style={{ borderColor: "rgba(245,215,160,0.1)" }}>
            {isLoggedIn && currentPlan !== "guest" ? (
              <>
                <Link href="/" className="block text-sm py-2" style={{ color: "#A8967E" }}>Dashboard</Link>
                <Link href="/dashboard/billing" className="block text-sm py-2" style={{ color: "#A8967E" }}>Billing</Link>
              </>
            ) : (
              <>
                <Link href="/login" className="block text-sm py-2" style={{ color: "#A8967E" }}>Sign in</Link>
                <Link href="/register" className="block w-full text-center py-3 rounded-xl text-sm font-bold" style={{ backgroundColor: "#F59E0B", color: "#1C1814" }}>
                  Start free
                </Link>
              </>
            )}
          </div>
        )}
      </nav>

      {/* Hero */}
      <div className="max-w-6xl mx-auto px-4 pt-14 pb-10 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6" style={{ backgroundColor: "rgba(245,158,11,0.12)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.3)" }}>
          <Zap className="w-3 h-3" /> Premium AI Actions · Basic AI unlimited
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold mb-4 leading-tight" style={{ color: "#1C1814" }}>
          Simple, transparent<br className="hidden sm:block" /> pricing
        </h1>
        <p className="text-lg max-w-xl mx-auto" style={{ color: "#78614E" }}>
          Unlimited captions, drafts, and quick AI on every paid plan. Premium AI Actions
          (Lead Scoring, Outreach, Full Campaign, APEX Advisor) reset on the 1st of each month.
        </p>
      </div>

      {/* Plans grid */}
      <div className="max-w-6xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {plans.map((plan) => {
            const isCurrent = plan.id === currentPlan;
            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl p-6 flex flex-col ${plan.popular ? "ring-2 ring-amber-400" : "border"}`}
                style={{
                  backgroundColor: plan.popular ? "#FFFBF0" : "#FFFFFF",
                  borderColor: "rgba(245,215,160,0.4)",
                  boxShadow: plan.popular ? "0 8px 32px rgba(245,158,11,0.15)" : "0 1px 4px rgba(0,0,0,0.06)",
                }}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: "#F59E0B", color: "#1C1814" }}>
                      Most Popular
                    </span>
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: "#10B981", color: "#fff" }}>
                      Current Plan
                    </span>
                  </div>
                )}

                <div className="mb-5">
                  <h3 className="text-xl font-bold mb-1" style={{ color: "#1C1814" }}>{plan.name}</h3>
                  <p className="text-sm mb-4" style={{ color: "#A8967E" }}>{plan.description}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold" style={{ color: "#F59E0B" }}>{plan.price}</span>
                    <span className="text-sm" style={{ color: "#A8967E" }}>{plan.duration}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <Zap className="w-3.5 h-3.5 text-blue-500" />
                    <span className="text-xs font-semibold text-blue-600">
                      {plan.premiumActions} Premium AI Actions{plan.id === "free_test" ? " (trial)" : "/month"}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => !isCurrent && handleCta(plan.id)}
                  disabled={loading || isCurrent}
                  className="w-full py-3 rounded-xl text-sm font-bold mb-6 flex items-center justify-center gap-2 transition-all"
                  style={isCurrent ? {
                    backgroundColor: "rgba(16,185,129,0.1)",
                    color: "#10B981",
                    cursor: "default",
                  } : plan.popular ? {
                    backgroundColor: "#F59E0B",
                    color: "#1C1814",
                  } : {
                    backgroundColor: "rgba(245,158,11,0.1)",
                    color: "#F59E0B",
                  }}
                >
                  {isCurrent ? "Current Plan" : plan.cta}
                  {!isCurrent && <ArrowRight className="w-4 h-4" />}
                </button>

                <div className="space-y-2.5 flex-1">
                  {plan.features.map((f) => (
                    <div key={f} className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#10B981" }} />
                      <span className="text-sm" style={{ color: "#292524" }}>{f}</span>
                    </div>
                  ))}
                  {plan.missing.map((f) => (
                    <div key={f} className="flex items-start gap-2.5 opacity-40">
                      <X className="w-4 h-4 flex-shrink-0 mt-0.5 text-gray-400" />
                      <span className="text-sm text-gray-400">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Full Comparison Table */}
      <div className="max-w-6xl mx-auto px-4 pb-16">
        <h2 className="text-2xl font-bold text-center mb-2" style={{ color: "#1C1814" }}>Compare all plans</h2>
        <p className="text-center text-sm mb-8" style={{ color: "#78614E" }}>Everything included in each plan at a glance</p>
        <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: "rgba(245,215,160,0.3)" }}>
          <table className="w-full text-sm" style={{ backgroundColor: "#fff" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid rgba(245,215,160,0.3)", backgroundColor: "#1C1814" }}>
                <th className="text-left px-5 py-4 font-semibold" style={{ color: "#A8967E", minWidth: 180 }}>Feature</th>
                {[
                  { label: "Starter", sub: "14 days", color: "#78614E" },
                  { label: "Creator", sub: "$24/mo", color: "#F59E0B" },
                  { label: "Pro", sub: "$49/mo", color: "#8B5CF6" },
                  { label: "Studio", sub: "$99/mo", color: "#E1306C" },
                  { label: "Agency", sub: "$249/mo", color: "#16A34A" },
                ].map(({ label, sub, color }) => (
                  <th key={label} className="text-center px-3 py-4" style={{ minWidth: 110 }}>
                    <span className="block text-xs font-bold" style={{ color }}>{label}</span>
                    <span className="block text-xs mt-0.5" style={{ color: "#A8967E" }}>{sub}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                {
                  category: "AI Premium Actions",
                  rows: [
                    { label: "Premium Actions / month", values: ["5", "20", "50", "200", "1,000"] },
                    { label: "Basic AI (captions, drafts)", values: ["Unlimited", "Unlimited", "Unlimited", "Unlimited", "Unlimited"] },
                    { label: "Lead Scoring", values: [true, true, true, true, true] },
                    { label: "Outreach Personalization", values: [true, true, true, true, true] },
                    { label: "Full Campaign Generator", values: [true, true, true, true, true] },
                    { label: "APEX Marketing Advisor", values: [true, true, true, true, true] },
                  ],
                },
                {
                  category: "Social Platforms",
                  rows: [
                    { label: "Social accounts", values: ["1", "2", "5", "10", "Unlimited"] },
                    { label: "YouTube analytics", values: [true, true, true, true, true] },
                    { label: "Instagram analytics", values: [false, true, true, true, true] },
                    { label: "TikTok analytics", values: [false, true, true, true, true] },
                  ],
                },
                {
                  category: "Content Tools",
                  rows: [
                    { label: "Content calendar", values: [false, true, true, true, true] },
                    { label: "Ads library", values: [false, true, true, true, true] },
                    { label: "Hashtag manager", values: [false, true, true, true, true] },
                    { label: "Link in Bio pages", values: [false, true, true, true, true] },
                    { label: "Campaigns", values: [false, true, true, true, true] },
                    { label: "Email reports", values: [false, true, true, true, true] },
                    { label: "Marketing agent", values: [false, true, true, true, true] },
                    { label: "Monthly Report AI", values: [false, true, true, true, true] },
                  ],
                },
                {
                  category: "Research & AI",
                  rows: [
                    { label: "AI Hub agents", values: [false, false, true, true, true] },
                    { label: "Lead Finder", values: [false, false, true, true, true] },
                    { label: "Leads CRM", values: [false, false, true, true, true] },
                    { label: "Competitor brands", values: ["1", "8", "20", "25", "50"] },
                    { label: "Tracked channels", values: ["2", "12", "30", "100", "Unlimited"] },
                  ],
                },
                {
                  category: "Team & Clients",
                  rows: [
                    { label: "Team members", values: ["1", "1", "3", "2", "5"] },
                    { label: "Client accounts", values: ["1", "2", "5", "10", "20"] },
                    { label: "Multi-account clients", values: [false, true, true, true, true] },
                  ],
                },
                {
                  category: "Advanced",
                  rows: [
                    { label: "API access", values: [false, false, false, true, true] },
                    { label: "White label", values: [false, false, false, false, true] },
                    { label: "Priority support", values: [false, false, true, true, true] },
                    { label: "Data history", values: ["7 days", "90 days", "1 year", "1 year", "2 years"] },
                    { label: "SLA uptime", values: ["—", "—", "—", "99.5%", "99.9%"] },
                  ],
                },
              ].map(({ category, rows }) => (
                <>
                  <tr key={category} style={{ backgroundColor: "rgba(245,215,160,0.06)", borderTop: "1px solid rgba(245,215,160,0.2)" }}>
                    <td colSpan={6} className="px-5 py-2">
                      <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#A8967E" }}>{category}</span>
                    </td>
                  </tr>
                  {rows.map(({ label, values }, ri) => (
                    <tr key={label} style={{ borderTop: "1px solid rgba(0,0,0,0.04)", backgroundColor: ri % 2 === 0 ? "#fff" : "#FAFAF8" }}>
                      <td className="px-5 py-3 font-medium" style={{ color: "#292524" }}>{label}</td>
                      {values.map((val, i) => (
                        <td key={i} className="text-center px-3 py-3">
                          {val === true ? (
                            <Check className="w-4 h-4 mx-auto text-emerald-500" />
                          ) : val === false ? (
                            <span className="text-gray-300">—</span>
                          ) : (
                            <span className="text-xs font-semibold" style={{ color: "#292524" }}>{val}</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Premium Actions info */}
      <div className="max-w-6xl mx-auto px-4 pb-16">
        <div className="rounded-2xl p-6 sm:p-8" style={{ background: "linear-gradient(135deg, #EFF6FF, #F5F3FF)", border: "1px solid rgba(99,102,241,0.2)" }}>
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-lg" style={{ color: "#1E40AF" }}>How Premium AI Actions work</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Lead Scoring", cost: "1 Action" },
              { label: "Outreach Message", cost: "1 Action" },
              { label: "Full Campaign", cost: "1 Action" },
              { label: "APEX Advisor", cost: "1 Action" },
            ].map((item) => (
              <div key={item.label} className="bg-white rounded-xl p-3 text-center" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <p className="text-xs font-semibold mb-1" style={{ color: "#1E40AF" }}>{item.label}</p>
                <p className="text-sm font-bold" style={{ color: "#292524" }}>{item.cost}</p>
              </div>
            ))}
          </div>
          <p className="text-sm mt-4" style={{ color: "#3730A3" }}>
            Captions, drafts, and quick AI helpers are <strong>unlimited</strong> on every paid plan.
            Premium Actions reset on the 1st of each month — only the four heavy AI workflows above debit your monthly counter.
          </p>
        </div>
      </div>

      {/* FAQ */}
      <div className="max-w-4xl mx-auto px-4 pb-20">
        <h2 className="text-2xl font-bold text-center mb-8" style={{ color: "#1C1814" }}>Frequently asked questions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {[
            { q: "What counts as a Premium AI Action?", a: "Only the four heavy workflows: Lead Scoring, Outreach Personalization, Full Campaign Generator, and APEX Marketing Advisor. Captions, drafts, and quick AI are unlimited." },
            { q: "When do Premium Actions reset?", a: "On the 1st of every month (UTC). Unused actions don't carry over — but they don't run out mid-month either, you start each month with a full counter." },
            { q: "Can I cancel anytime?", a: "Absolutely. No long-term contracts. Cancel from your account settings at any time." },
            { q: "What if I run out of Premium Actions?", a: "Heavy workflows are paused until next month's reset, or you can upgrade to a higher plan instantly. Basic AI keeps working unlimited." },
          ].map((item) => (
            <div key={item.q} className="bg-white rounded-xl p-5" style={{ border: "1px solid rgba(245,215,160,0.4)" }}>
              <h4 className="font-semibold mb-2" style={{ color: "#1C1814" }}>{item.q}</h4>
              <p className="text-sm" style={{ color: "#78614E" }}>{item.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA banner */}
      <div className="max-w-6xl mx-auto px-4 pb-20">
        <div className="rounded-2xl p-8 sm:p-12 text-center" style={{ background: "linear-gradient(135deg, #1C1814, #2D2218)" }}>
          <h2 className="text-3xl font-extrabold mb-3" style={{ color: "#FFF8F0" }}>Ready to grow faster?</h2>
          <p className="mb-6" style={{ color: "#A8967E" }}>Start your 7-day free trial. No credit card required.</p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-base font-bold"
            style={{ backgroundColor: "#F59E0B", color: "#1C1814" }}
          >
            Start for free <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t py-8" style={{ borderColor: "rgba(245,215,160,0.2)" }}>
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)" }}>
              <Zap className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm font-bold" style={{ color: "#292524" }}>MarketHub Pro</span>
          </div>
          <p className="text-xs" style={{ color: "#A8967E" }}>© 2026 MarketHub Pro · All rights reserved</p>
          <div className="flex gap-4">
            <Link href="/login" className="text-xs" style={{ color: "#A8967E" }}>Sign in</Link>
            <Link href="/register" className="text-xs" style={{ color: "#A8967E" }}>Register</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
