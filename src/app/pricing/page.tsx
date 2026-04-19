"use client";

import { useEffect, useState } from "react";
import { Check, X, Zap, ArrowRight, Menu } from "lucide-react";
import Link from "next/link";
import GlassCard from "@/components/ui/GlassCard";
import GlassButton from "@/components/ui/GlassButton";

const FREE_PLANS = ["free_forever", "free_test", "expired"];

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
    id: "agency",
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
  const [annual, setAnnual] = useState(false);
  const isLoggedIn = currentPlan !== null;

  useEffect(() => {
    fetch("/api/billing")
      .then((r) => r.json())
      .then((d) => setCurrentPlan(d.plan ?? "guest"))
      .catch(() => setCurrentPlan("guest"));
  }, []);

  const handleCta = async (planId: string) => {
    if (planId === "free_forever") {
      window.location.href = "/register?plan=free_forever";
      return;
    }
    if (planId === "free_test") {
      window.location.href = "/register";
      return;
    }
    if (planId === "agency") {
      window.location.href = "mailto:markethub973@gmail.com?subject=Agency Plan";
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
        body: JSON.stringify({ plan: planId, interval: annual ? "year" : "month" }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setLoading(false);
    }
  };

  const displayPrice = (priceNum: number) => {
    if (priceNum === 0) return "$0";
    if (annual) {
      const yearly = Math.round(priceNum * 12 * 0.8); // 20% off annual
      return `$${yearly}`;
    }
    return `$${priceNum}`;
  };

  const displayDuration = (plan: (typeof plans)[number]) => {
    if (plan.priceNum === 0) return plan.duration;
    return annual ? "/ year" : "/ month";
  };

  return (
    <div
      className="relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #0d0b1e 0%, #1a0a2e 40%, #0a1628 100%)",
        minHeight: "100vh",
      }}
    >
      {/* Ambient blobs */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        aria-hidden="true"
      >
        <div
          className="absolute"
          style={{
            top: "-10%",
            left: "-10%",
            width: "50%",
            height: "50%",
            background: "radial-gradient(circle, rgba(168,85,247,0.2) 0%, transparent 70%)",
            filter: "blur(80px)",
          }}
        />
        <div
          className="absolute"
          style={{
            bottom: "-10%",
            right: "-10%",
            width: "50%",
            height: "50%",
            background: "radial-gradient(circle, rgba(245,158,11,0.18) 0%, transparent 70%)",
            filter: "blur(80px)",
          }}
        />
        <div
          className="absolute"
          style={{
            top: "40%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "40%",
            height: "40%",
            background: "radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)",
            filter: "blur(80px)",
          }}
        />
      </div>

      {/* Navbar */}
      <nav
        className="sticky top-0 z-50 border-b backdrop-blur-xl"
        style={{
          backgroundColor: "rgba(13,11,30,0.8)",
          borderColor: "rgba(245,215,160,0.1)",
        }}
      >
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #f59e0b, #d97706)",
              }}
            >
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg text-white">MarketHub Pro</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            {isLoggedIn && currentPlan !== "guest" ? (
              <>
                <Link
                  href="/"
                  className="text-sm font-medium"
                  style={{ color: "rgba(255,255,255,0.65)" }}
                >
                  Dashboard
                </Link>
                <Link
                  href="/dashboard/billing"
                  className="text-sm font-medium"
                  style={{ color: "rgba(255,255,255,0.65)" }}
                >
                  Billing
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-medium"
                  style={{ color: "rgba(255,255,255,0.65)" }}
                >
                  Sign in
                </Link>
                <GlassButton variant="primary" size="sm" onClick={() => (window.location.href = "/register")}>
                  Start free
                </GlassButton>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            aria-label="Toggle menu"
            className="md:hidden p-2"
            style={{ color: "rgba(255,255,255,0.65)" }}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <Menu size={22} />
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div
            className="md:hidden border-t px-4 py-4 space-y-3"
            style={{ borderColor: "rgba(245,215,160,0.1)" }}
          >
            {isLoggedIn && currentPlan !== "guest" ? (
              <>
                <Link href="/" className="block text-sm py-2" style={{ color: "rgba(255,255,255,0.65)" }}>
                  Dashboard
                </Link>
                <Link href="/dashboard/billing" className="block text-sm py-2" style={{ color: "rgba(255,255,255,0.65)" }}>
                  Billing
                </Link>
              </>
            ) : (
              <>
                <Link href="/login" className="block text-sm py-2" style={{ color: "rgba(255,255,255,0.65)" }}>
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="block w-full text-center py-3 rounded-xl text-sm font-bold"
                  style={{ backgroundColor: "#f59e0b", color: "#1C1814" }}
                >
                  Start free
                </Link>
              </>
            )}
          </div>
        )}
      </nav>

      {/* Content wrapper (above blobs) */}
      <div className="relative z-10">
        {/* Hero */}
        <div className="max-w-6xl mx-auto px-4 pt-14 pb-10 text-center">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6"
            style={{
              backgroundColor: "rgba(245,158,11,0.12)",
              color: "#f59e0b",
              border: "1px solid rgba(245,158,11,0.3)",
            }}
          >
            <Zap className="w-3 h-3" /> Premium AI Actions · Basic AI unlimited
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-4 leading-tight text-white">
            Simple, transparent
            <br className="hidden sm:block" /> pricing
          </h1>
          <p className="text-lg max-w-xl mx-auto" style={{ color: "rgba(255,255,255,0.55)" }}>
            Unlimited captions, drafts, and quick AI on every paid plan. Premium AI Actions (Lead
            Scoring, Outreach, Full Campaign, APEX Advisor) reset on the 1st of each month.
          </p>

          {/* Monthly / Annual toggle */}
          <div className="flex items-center justify-center gap-3 mt-8">
            <span
              className="text-sm font-medium"
              style={{ color: annual ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.9)" }}
            >
              Monthly
            </span>
            <button
              type="button"
              aria-label="Toggle billing period"
              onClick={() => setAnnual(!annual)}
              className="relative w-14 h-7 rounded-full transition-colors"
              style={{
                background: annual
                  ? "linear-gradient(135deg, #f59e0b, #d97706)"
                  : "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            >
              <div
                className="absolute top-0.5 w-6 h-6 rounded-full transition-all duration-300"
                style={{
                  left: annual ? "calc(100% - 1.625rem)" : "0.125rem",
                  background: annual ? "#1C1814" : "rgba(255,255,255,0.7)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                }}
              />
            </button>
            <span
              className="text-sm font-medium"
              style={{ color: annual ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.35)" }}
            >
              Annual
            </span>
            {annual && (
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{
                  background: "linear-gradient(135deg, rgba(245,158,11,0.2), rgba(245,158,11,0.1))",
                  color: "#f59e0b",
                  border: "1px solid rgba(245,158,11,0.3)",
                }}
              >
                Save 20%
              </span>
            )}
          </div>
        </div>

        {/* Plans grid */}
        <div className="max-w-6xl mx-auto px-4 pb-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {plans.map((plan) => {
              const isCurrent = plan.id === currentPlan;
              return (
                <div
                  key={plan.id}
                  className={`relative flex flex-col rounded-2xl p-6 transition-all duration-200 hover:translate-y-[-2px]`}
                  style={{
                    background: plan.popular
                      ? "linear-gradient(180deg, rgba(245,158,11,0.12) 0%, rgba(30,30,40,0.9) 30%)"
                      : "rgba(30, 30, 40, 0.85)",
                    border: plan.popular
                      ? "2px solid rgba(245,158,11,0.5)"
                      : "1px solid rgba(255,255,255,0.15)",
                    boxShadow: plan.popular
                      ? "0 8px 32px rgba(245,158,11,0.2), inset 0 1px 0 rgba(255,255,255,0.08)"
                      : "0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)",
                    backdropFilter: "blur(12px)",
                  }}
                >
                  {plan.popular && (
                    <>
                      {/* Amber top border */}
                      <div
                        className="absolute top-0 left-4 right-4 h-0.5 rounded-full"
                        style={{
                          background: "linear-gradient(90deg, transparent, #f59e0b, transparent)",
                        }}
                      />
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span
                          className="px-3 py-1 rounded-full text-xs font-bold"
                          style={{ backgroundColor: "#f59e0b", color: "#1C1814" }}
                        >
                          Most Popular
                        </span>
                      </div>
                    </>
                  )}
                  {isCurrent && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span
                        className="px-3 py-1 rounded-full text-xs font-bold"
                        style={{ backgroundColor: "#10B981", color: "#fff" }}
                      >
                        Current Plan
                      </span>
                    </div>
                  )}

                  <div className="mb-5">
                    <h3 className="text-xl font-bold mb-1 text-white">{plan.name}</h3>
                    <p className="text-sm mb-4" style={{ color: "rgba(255,255,255,0.45)" }}>
                      {plan.description}
                    </p>
                    <div className="flex items-baseline gap-1">
                      <span
                        className="text-4xl font-extrabold"
                        style={{
                          background: "linear-gradient(135deg, #f59e0b, #fbbf24)",
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                        }}
                      >
                        {displayPrice(plan.priceNum)}
                      </span>
                      <span className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
                        {displayDuration(plan)}
                      </span>
                    </div>
                    {annual && plan.priceNum > 0 && (
                      <p className="text-xs mt-1" style={{ color: "rgba(245,158,11,0.7)" }}>
                        ${Math.round(plan.priceNum * 0.8)}/mo · <span style={{ textDecoration: "line-through", color: "rgba(255,255,255,0.3)" }}>${plan.priceNum}/mo</span> · Save ${Math.round(plan.priceNum * 12 * 0.2)}/yr
                      </p>
                    )}
                    <div className="flex items-center gap-1 mt-1">
                      <Zap className="w-3.5 h-3.5" style={{ color: "#818cf8" }} />
                      <span className="text-xs font-semibold" style={{ color: "#a5b4fc" }}>
                        {`${plan.premiumActions} Premium AI Actions${plan.id === "free_test" ? " (trial)" : "/month"}`}
                      </span>
                    </div>
                  </div>

                  {isCurrent ? (
                    <div
                      className="w-full py-3 rounded-xl text-sm font-bold mb-6 flex items-center justify-center gap-2"
                      style={{
                        backgroundColor: "rgba(16,185,129,0.15)",
                        color: "#10B981",
                        border: "1px solid rgba(16,185,129,0.3)",
                      }}
                    >
                      Current Plan
                    </div>
                  ) : (
                    <button
                      type="button"
                      className={`w-full mb-6 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${plan.popular ? "btn-3d-active" : "btn-3d"}`}
                      onClick={() => handleCta(plan.id)}
                      disabled={loading}
                    >
                      {plan.cta}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}

                  <div className="space-y-2.5 flex-1">
                    {plan.features.map((f) => (
                      <div key={f} className="flex items-start gap-2.5">
                        <Check
                          className="w-4 h-4 flex-shrink-0 mt-0.5"
                          style={{ color: "#f59e0b" }}
                        />
                        <span className="text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>
                          {f}
                        </span>
                      </div>
                    ))}
                    {plan.missing.map((f) => (
                      <div key={f} className="flex items-start gap-2.5">
                        <X
                          className="w-4 h-4 flex-shrink-0 mt-0.5"
                          style={{ color: "rgba(255,255,255,0.2)" }}
                        />
                        <span className="text-sm" style={{ color: "rgba(255,255,255,0.2)" }}>
                          {f}
                        </span>
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
          <h2 className="text-2xl font-bold text-center mb-2 text-white">Compare all plans</h2>
          <p className="text-center text-sm mb-8" style={{ color: "rgba(255,255,255,0.45)" }}>
            Everything included in each plan at a glance
          </p>
          <GlassCard padding="p-0">
            <div className="overflow-x-auto rounded-2xl">
              <table className="w-full text-sm">
                <thead>
                  <tr
                    style={{
                      borderBottom: "1px solid rgba(255,255,255,0.08)",
                      backgroundColor: "rgba(0,0,0,0.3)",
                    }}
                  >
                    <th
                      className="text-left px-5 py-4 font-semibold"
                      style={{ color: "rgba(255,255,255,0.5)", minWidth: 180 }}
                    >
                      Feature
                    </th>
                    {[
                      { label: "Free", sub: "Forever", color: "#6B7280" },
                      { label: "Starter", sub: "14 days", color: "rgba(255,255,255,0.5)" },
                      { label: "Creator", sub: "$24/mo", color: "#f59e0b" },
                      { label: "Pro", sub: "$49/mo", color: "#a78bfa" },
                      { label: "Studio", sub: "$99/mo", color: "#f472b6" },
                      { label: "Agency", sub: "$249/mo", color: "#34d399" },
                    ].map(({ label, sub, color }) => (
                      <th key={label} className="text-center px-3 py-4" style={{ minWidth: 110 }}>
                        <span className="block text-xs font-bold" style={{ color }}>
                          {label}
                        </span>
                        <span
                          className="block text-xs mt-0.5"
                          style={{ color: "rgba(255,255,255,0.35)" }}
                        >
                          {sub}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      category: "AI Premium Actions",
                      rows: [
                        {
                          label: "Premium Actions / month",
                          values: ["\u2014", "5", "20", "50", "200", "1,000"],
                        },
                        {
                          label: "Basic AI (captions, drafts)",
                          values: ["10/mo", "Unlimited", "Unlimited", "Unlimited", "Unlimited", "Unlimited"],
                        },
                        { label: "Lead Scoring", values: [false, true, true, true, true, true] },
                        {
                          label: "Outreach Personalization",
                          values: [false, true, true, true, true, true],
                        },
                        {
                          label: "Full Campaign Generator",
                          values: [false, true, true, true, true, true],
                        },
                        { label: "APEX Marketing Advisor", values: [false, true, true, true, true, true] },
                      ],
                    },
                    {
                      category: "Social Platforms",
                      rows: [
                        {
                          label: "Social accounts",
                          values: ["1", "1", "2", "5", "10", "Unlimited"],
                        },
                        { label: "YouTube analytics", values: [true, true, true, true, true, true] },
                        { label: "Instagram analytics", values: [false, false, true, true, true, true] },
                        { label: "TikTok analytics", values: [false, false, true, true, true, true] },
                      ],
                    },
                    {
                      category: "Content Tools",
                      rows: [
                        { label: "Content calendar", values: [false, false, true, true, true, true] },
                        { label: "Ads library", values: [false, false, true, true, true, true] },
                        { label: "Hashtag manager", values: [false, false, true, true, true, true] },
                        { label: "Link in Bio pages", values: [false, false, true, true, true, true] },
                        { label: "Campaigns", values: [false, false, true, true, true, true] },
                        { label: "Email reports", values: [false, false, true, true, true, true] },
                        { label: "Marketing agent", values: [false, false, true, true, true, true] },
                        { label: "Monthly Report AI", values: [false, false, true, true, true, true] },
                      ],
                    },
                    {
                      category: "Research & AI",
                      rows: [
                        { label: "AI Hub agents", values: [false, false, false, true, true, true] },
                        { label: "Lead Finder", values: [false, false, false, true, true, true] },
                        { label: "Leads CRM", values: [false, false, false, true, true, true] },
                        {
                          label: "Competitor brands",
                          values: ["1", "1", "8", "20", "25", "50"],
                        },
                        {
                          label: "Tracked channels",
                          values: ["1", "2", "12", "30", "100", "Unlimited"],
                        },
                      ],
                    },
                    {
                      category: "Team & Clients",
                      rows: [
                        { label: "Team members", values: ["\u2014", "1", "1", "3", "2", "5"] },
                        { label: "Client accounts", values: ["\u2014", "1", "2", "5", "10", "20"] },
                        {
                          label: "Multi-account clients",
                          values: [false, false, true, true, true, true],
                        },
                      ],
                    },
                    {
                      category: "Advanced",
                      rows: [
                        { label: "API access", values: [false, false, false, false, true, true] },
                        { label: "White label", values: [false, false, false, false, false, true] },
                        { label: "Priority support", values: [false, false, false, true, true, true] },
                        {
                          label: "Data history",
                          values: ["7 days", "7 days", "90 days", "1 year", "1 year", "2 years"],
                        },
                        {
                          label: "SLA uptime",
                          values: ["\u2014", "\u2014", "\u2014", "\u2014", "99.5%", "99.9%"],
                        },
                      ],
                    },
                  ].map(({ category, rows }) => (
                    <>
                      <tr
                        key={category}
                        style={{
                          backgroundColor: "rgba(255,255,255,0.03)",
                          borderTop: "1px solid rgba(255,255,255,0.06)",
                        }}
                      >
                        <td colSpan={7} className="px-5 py-2">
                          <span
                            className="text-xs font-bold uppercase tracking-wider"
                            style={{ color: "#f59e0b" }}
                          >
                            {category}
                          </span>
                        </td>
                      </tr>
                      {rows.map(({ label, values }, ri) => (
                        <tr
                          key={label}
                          style={{
                            borderTop: "1px solid rgba(255,255,255,0.04)",
                            backgroundColor:
                              ri % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)",
                          }}
                        >
                          <td
                            className="px-5 py-3 font-medium"
                            style={{ color: "rgba(255,255,255,0.65)" }}
                          >
                            {label}
                          </td>
                          {values.map((val, i) => (
                            <td key={i} className="text-center px-3 py-3">
                              {val === true ? (
                                <Check className="w-4 h-4 mx-auto" style={{ color: "#f59e0b" }} />
                              ) : val === false ? (
                                <span style={{ color: "rgba(255,255,255,0.15)" }}>{"\u2014"}</span>
                              ) : (
                                <span
                                  className="text-xs font-semibold"
                                  style={{ color: "rgba(255,255,255,0.65)" }}
                                >
                                  {val}
                                </span>
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
          </GlassCard>
        </div>

        {/* Premium Actions info */}
        <div className="max-w-6xl mx-auto px-4 pb-16">
          <GlassCard accent padding="p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5" style={{ color: "#818cf8" }} />
              <h3 className="font-bold text-lg text-white">How Premium AI Actions work</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Lead Scoring", cost: "1 Action" },
                { label: "Outreach Message", cost: "1 Action" },
                { label: "Full Campaign", cost: "1 Action" },
                { label: "APEX Advisor", cost: "1 Action" },
              ].map((item) => (
                <GlassCard key={item.label} padding="p-3">
                  <div className="text-center">
                    <p className="text-xs font-semibold mb-1" style={{ color: "#a5b4fc" }}>
                      {item.label}
                    </p>
                    <p className="text-sm font-bold text-white">{item.cost}</p>
                  </div>
                </GlassCard>
              ))}
            </div>
            <p className="text-sm mt-4" style={{ color: "rgba(255,255,255,0.55)" }}>
              Captions, drafts, and quick AI helpers are{" "}
              <strong className="text-white">unlimited</strong> on every paid plan. Premium Actions
              reset on the 1st of each month — only the four heavy AI workflows above debit your
              monthly counter.
            </p>
          </GlassCard>
        </div>

        {/* FAQ */}
        <div className="max-w-4xl mx-auto px-4 pb-20">
          <h2 className="text-2xl font-bold text-center mb-8 text-white">
            Frequently asked questions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
              {
                q: "What counts as a Premium AI Action?",
                a: "Only the four heavy workflows: Lead Scoring, Outreach Personalization, Full Campaign Generator, and APEX Marketing Advisor. Captions, drafts, and quick AI are unlimited.",
              },
              {
                q: "When do Premium Actions reset?",
                a: "On the 1st of every month (UTC). Unused actions don\u2019t carry over \u2014 but they don\u2019t run out mid-month either, you start each month with a full counter.",
              },
              {
                q: "Can I cancel anytime?",
                a: "Absolutely. No long-term contracts. Cancel from your account settings at any time.",
              },
              {
                q: "What if I run out of Premium Actions?",
                a: "Heavy workflows are paused until next month\u2019s reset, or you can upgrade to a higher plan instantly. Basic AI keeps working unlimited.",
              },
            ].map((item) => (
              <div key={item.q} className="rounded-2xl p-5" style={{
                background: "rgba(30, 30, 40, 0.85)",
                border: "1px solid rgba(255,255,255,0.15)",
                boxShadow: "0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)",
                backdropFilter: "blur(12px)",
              }}>
                <h4 className="font-semibold mb-2 text-white">{item.q}</h4>
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.65)", lineHeight: 1.6 }}>
                  {item.a}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA banner */}
        <div className="max-w-6xl mx-auto px-4 pb-20">
          <GlassCard accent padding="p-8 sm:p-12">
            <div className="text-center">
              <h2 className="text-3xl font-extrabold mb-3 text-white">Ready to grow faster?</h2>
              <p className="mb-6" style={{ color: "rgba(255,255,255,0.55)" }}>
                Start your 7-day free trial. No credit card required.
              </p>
              <GlassButton
                variant="primary"
                size="lg"
                className="inline-flex items-center gap-2"
                onClick={() => (window.location.href = "/register")}
              >
                Start for free <ArrowRight className="w-5 h-5" />
              </GlassButton>
            </div>
          </GlassCard>
        </div>

        {/* Footer */}
        <footer
          className="border-t py-8"
          style={{ borderColor: "rgba(255,255,255,0.06)" }}
        >
          <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-md flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}
              >
                <Zap className="w-3 h-3 text-white" />
              </div>
              <span className="text-sm font-bold text-white">MarketHub Pro</span>
            </div>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
              &copy; 2026 MarketHub Pro &middot; All rights reserved
            </p>
            <div className="flex gap-4">
              <Link
                href="/login"
                className="text-xs"
                style={{ color: "rgba(255,255,255,0.35)" }}
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="text-xs"
                style={{ color: "rgba(255,255,255,0.35)" }}
              >
                Register
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
