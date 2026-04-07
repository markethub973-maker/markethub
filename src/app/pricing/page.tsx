"use client";

import { useEffect, useState } from "react";
import { Check, X, Zap, ArrowRight, Menu } from "lucide-react";
import Link from "next/link";

const FREE_PLANS = ["free_test", "expired"];

const plans = [
  {
    id: "free_test",
    name: "Free Trial",
    duration: "7 Days",
    price: "$0",
    priceNum: 0,
    tokens: "1,000",
    description: "Test the platform for free",
    cta: "Start Free",
    popular: false,
    features: [
      "1,000 tokens",
      "1 social account",
      "YouTube analytics",
      "Basic dashboard",
      "1 competitor brand",
    ],
    missing: ["TikTok analytics", "Content calendar", "Instagram analytics", "AI Hub"],
  },
  {
    id: "lite",
    name: "Lite",
    duration: "/ month",
    price: "$24",
    priceNum: 24,
    tokens: "50,000",
    description: "Everything a creator needs",
    cta: "Get Lite",
    popular: true,
    features: [
      "50,000 monthly tokens",
      "2 social accounts",
      "Instagram analytics (full)",
      "TikTok analytics",
      "Content calendar + scheduling",
      "Ads library access",
      "Email reports",
      "Link in Bio pages",
      "Hashtag manager",
      "Campaigns",
      "Marketing agent",
      "8 competitor brands",
      "12 tracked channels",
    ],
    missing: ["AI Hub", "Leads CRM", "API access"],
  },
  {
    id: "pro",
    name: "Pro",
    duration: "/ month",
    price: "$49",
    priceNum: 49,
    tokens: "150,000",
    description: "For agencies & professionals",
    cta: "Get Pro",
    popular: false,
    features: [
      "150,000 monthly tokens",
      "5 client accounts",
      "Everything in Lite",
      "AI Hub agents",
      "Lead finder & CRM",
      "3 team members",
      "20 competitor brands",
      "30 tracked channels",
      "Priority support",
    ],
    missing: ["API access", "White label"],
  },
  {
    id: "business",
    name: "Business",
    duration: "/ month",
    price: "$99",
    priceNum: 99,
    tokens: "500,000",
    description: "For digital marketing agencies",
    cta: "Get Business",
    popular: false,
    features: [
      "500,000 monthly tokens",
      "20 client accounts",
      "Everything in Pro",
      "5 team members",
      "50 competitor brands",
      "100 tracked channels",
      "API access",
    ],
    missing: ["White label"],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    duration: "/ month",
    price: "$249",
    priceNum: 249,
    tokens: "1.5M",
    description: "For large-scale operations",
    cta: "Contact Sales",
    popular: false,
    features: [
      "1,500,000 monthly tokens",
      "Everything in Business",
      "Unlimited team members",
      "White label",
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
          <Zap className="w-3 h-3" /> Token-based pricing — no waste
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold mb-4 leading-tight" style={{ color: "#1C1814" }}>
          Simple, transparent<br className="hidden sm:block" /> pricing
        </h1>
        <p className="text-lg max-w-xl mx-auto" style={{ color: "#78614E" }}>
          Pay only for what you use. Tokens carry over — no unused credits lost.
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
                    <span className="text-xs font-semibold text-blue-600">{plan.tokens} tokens/month</span>
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

      {/* Token info */}
      <div className="max-w-6xl mx-auto px-4 pb-16">
        <div className="rounded-2xl p-6 sm:p-8" style={{ background: "linear-gradient(135deg, #EFF6FF, #F5F3FF)", border: "1px solid rgba(99,102,241,0.2)" }}>
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-lg" style={{ color: "#1E40AF" }}>How tokens work</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "1 Caption", cost: "~800 tokens" },
              { label: "1 Analysis", cost: "~2,000 tokens" },
              { label: "1 PDF Report", cost: "~5,000 tokens" },
              { label: "Agent Chat", cost: "~10,000 tokens" },
            ].map((item) => (
              <div key={item.label} className="bg-white rounded-xl p-3 text-center" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <p className="text-xs font-semibold mb-1" style={{ color: "#1E40AF" }}>{item.label}</p>
                <p className="text-sm font-bold" style={{ color: "#292524" }}>{item.cost}</p>
              </div>
            ))}
          </div>
          <p className="text-sm mt-4" style={{ color: "#3730A3" }}>
            Tokens never expire. Buy extra packs at any time — from $15 for 10K tokens.
          </p>
        </div>
      </div>

      {/* FAQ */}
      <div className="max-w-4xl mx-auto px-4 pb-20">
        <h2 className="text-2xl font-bold text-center mb-8" style={{ color: "#1C1814" }}>Frequently asked questions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {[
            { q: "Do unused tokens carry over?", a: "Yes! All tokens are credited to your account and valid until used. No expiration." },
            { q: "Can I cancel anytime?", a: "Absolutely. No long-term contracts. Cancel from your account settings at any time." },
            { q: "What if I run out of tokens?", a: "You'll be notified at 80% usage. Buy extra token packs instantly without changing your plan." },
            { q: "Is there a money-back guarantee?", a: "Yes — 30-day money-back guarantee. Unused tokens are fully refundable." },
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
