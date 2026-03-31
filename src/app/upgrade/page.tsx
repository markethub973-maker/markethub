"use client";

import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import { Check, Zap, Star, Building2, Settings } from "lucide-react";
import Link from "next/link";

const plans = [
  {
    key: null,
    name: "Free",
    price: "$0",
    period: "forever",
    icon: <Zap className="w-5 h-5" />,
    color: "#A8967E",
    features: [
      "10 tracked channels",
      "YouTube Analytics",
      "30 days history",
      "Export CSV",
      "Trending alerts (5 keywords)",
    ],
  },
  {
    key: "pro",
    name: "Pro",
    price: "$29",
    period: "/ month",
    icon: <Star className="w-5 h-5" />,
    color: "#F59E0B",
    highlight: true,
    features: [
      "Unlimited channels",
      "YouTube + TikTok + Instagram",
      "1 year history",
      "Export CSV + PDF",
      "Unlimited trending alerts",
      "Advanced comparisons",
      "Detailed demographics",
      "Weekly email reports",
    ],
  },
  {
    key: "enterprise",
    name: "Enterprise",
    price: "$99",
    period: "/ month",
    icon: <Building2 className="w-5 h-5" />,
    color: "#78614E",
    features: [
      "Everything in Pro",
      "Full API access",
      "White-label dashboard",
      "Multi-user (10 accounts)",
      "Dedicated account manager",
      "Slack/Webhook integration",
      "Real-time data (live)",
      "SLA 99.9% uptime",
    ],
  },
];

const FREE_PLANS = [null, "free_test", "expired"];

export default function UpgradePage() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState("");
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/billing")
      .then((r) => r.json())
      .then((d) => setCurrentPlan(d.plan ?? null))
      .catch(() => {});
  }, []);

  const handleUpgrade = async (planKey: string) => {
    setCheckoutError("");
    setLoadingPlan(planKey);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planKey }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCheckoutError(data.error || "An error occurred. Please try again.");
        setLoadingPlan(null);
        return;
      }
      window.location.href = data.url;
    } catch {
      setCheckoutError("Network error. Please try again.");
      setLoadingPlan(null);
    }
  };

  const isPaid = currentPlan && !FREE_PLANS.includes(currentPlan);

  return (
    <div>
      <Header title="Upgrade Plan" subtitle="Choose the right plan for you" />

      <div className="p-6">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-4" style={{ backgroundColor: "rgba(245,158,11,0.12)", color: "#D97706" }}>
            <Zap className="w-3.5 h-3.5" />
            Upgrade and get access to all platforms
          </div>
          <h2 className="text-3xl font-black mb-2" style={{ color: "#292524" }}>Simple and transparent pricing</h2>
          <p className="text-sm" style={{ color: "#A8967E" }}>No contracts. Cancel anytime.</p>
        </div>

        {/* Manage subscription banner for paid users */}
        {isPaid && (
          <div className="max-w-md mx-auto mb-8 flex items-center gap-3 px-5 py-3.5 rounded-xl text-sm" style={{ backgroundColor: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)" }}>
            <Settings className="w-4 h-4 flex-shrink-0" style={{ color: "#F59E0B" }} />
            <span style={{ color: "#78614E" }}>
              You're on the <strong style={{ color: "#292524" }}>{currentPlan!.charAt(0).toUpperCase() + currentPlan!.slice(1)}</strong> plan.{" "}
              <Link href="/dashboard/billing" className="font-semibold underline" style={{ color: "#F59E0B" }}>
                Manage subscription
              </Link>
            </span>
          </div>
        )}

        {/* Error banner */}
        {checkoutError && (
          <div className="max-w-md mx-auto mb-6 text-sm px-4 py-3 rounded-xl text-center" style={{ backgroundColor: "rgba(239,68,68,0.08)", color: "#dc2626", border: "1px solid rgba(239,68,68,0.2)" }}>
            {checkoutError}
          </div>
        )}

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {plans.map((plan) => {
            const isCurrent =
              plan.key === currentPlan ||
              (plan.key === null && FREE_PLANS.includes(currentPlan));

            return (
              <div
                key={plan.name}
                className="rounded-2xl p-6 flex flex-col"
                style={plan.highlight
                  ? { background: "linear-gradient(135deg, #F59E0B, #D97706)", boxShadow: "0 8px 32px rgba(245,158,11,0.35)", color: "white" }
                  : { backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" }
                }
              >
                {plan.highlight && !isCurrent && (
                  <div className="text-xs font-bold text-center mb-3 py-1 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.2)" }}>
                    POPULAR
                  </div>
                )}
                {isCurrent && (
                  <div
                    className="text-xs font-bold text-center mb-3 py-1 rounded-full"
                    style={plan.highlight
                      ? { backgroundColor: "rgba(255,255,255,0.2)", color: "white" }
                      : { backgroundColor: "rgba(245,158,11,0.12)", color: "#D97706" }
                    }
                  >
                    CURRENT PLAN
                  </div>
                )}

                <div className="flex items-center gap-2 mb-4" style={{ color: plan.highlight ? "white" : plan.color }}>
                  {plan.icon}
                  <span className="font-bold text-lg" style={{ color: plan.highlight ? "white" : "#292524" }}>{plan.name}</span>
                </div>

                <div className="mb-6">
                  <span className="text-4xl font-black" style={{ color: plan.highlight ? "white" : "#292524" }}>{plan.price}</span>
                  <span className="text-sm ml-1" style={{ color: plan.highlight ? "rgba(255,255,255,0.7)" : "#A8967E" }}>{plan.period}</span>
                </div>

                <ul className="space-y-2 flex-1 mb-6">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: plan.highlight ? "rgba(255,255,255,0.9)" : "#16a34a" }} />
                      <span style={{ color: plan.highlight ? "rgba(255,255,255,0.9)" : "#5C4A35" }}>{f}</span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  disabled={isCurrent || loadingPlan === plan.key}
                  onClick={() => plan.key && !isCurrent && handleUpgrade(plan.key)}
                  className="w-full py-3 rounded-xl text-sm font-bold transition-all"
                  style={isCurrent
                    ? { backgroundColor: "rgba(245,215,160,0.15)", color: "#A8967E", cursor: "default" }
                    : plan.highlight
                    ? { backgroundColor: "rgba(255,255,255,0.95)", color: "#D97706", opacity: loadingPlan === plan.key ? 0.7 : 1 }
                    : { backgroundColor: "#F59E0B", color: "#1C1814", opacity: loadingPlan === plan.key ? 0.7 : 1 }
                  }
                >
                  {loadingPlan === plan.key
                    ? "Loading..."
                    : isCurrent
                    ? "Current Plan"
                    : isPaid
                    ? "Switch to " + plan.name
                    : "Choose " + plan.name}
                </button>
              </div>
            );
          })}
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto mt-12 space-y-4">
          <h3 className="text-lg font-bold text-center mb-6" style={{ color: "#292524" }}>Frequently Asked Questions</h3>
          {[
            { q: "Can I cancel anytime?", a: "Yes, you can cancel your subscription at any time without penalties." },
            { q: "What platforms are supported?", a: "Free: YouTube. Pro and Enterprise: YouTube, TikTok, Instagram, Facebook." },
            { q: "Is the data real or estimated?", a: "YouTube is 100% real. TikTok and Instagram require API approval (in progress). Demographics are estimated based on channel category." },
            { q: "How do I pay?", a: "We accept credit/debit cards. Secure payment through Stripe." },
          ].map(item => (
            <div key={item.q} className="rounded-xl p-4" style={{ backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.2)" }}>
              <p className="font-semibold text-sm mb-1" style={{ color: "#292524" }}>{item.q}</p>
              <p className="text-sm" style={{ color: "#A8967E" }}>{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
