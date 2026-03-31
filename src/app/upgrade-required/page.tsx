"use client";

import { useState } from "react";
import { AlertTriangle, Zap, Star, Building2, Check } from "lucide-react";
import Link from "next/link";

const PLANS = [
  {
    key: "lite",
    name: "Lite",
    price: "$19",
    period: "/mo",
    icon: <Zap className="w-5 h-5" />,
    color: "#F59E0B",
    features: ["50 AI calls/day", "4 social accounts", "Email reports", "$5 AI budget/mo"],
  },
  {
    key: "pro",
    name: "Pro",
    price: "$39",
    period: "/mo",
    icon: <Star className="w-5 h-5" />,
    color: "#F59E0B",
    highlight: true,
    features: ["200 AI calls/day", "8 social accounts", "Priority support", "Custom dashboard", "$9 AI budget/mo"],
  },
  {
    key: "business",
    name: "Business",
    price: "$99",
    period: "/mo",
    icon: <Building2 className="w-5 h-5" />,
    color: "#78614E",
    features: ["500 AI calls/day", "20 social accounts", "Webhook integration", "White-label ready", "$24 AI budget/mo"],
  },
];

export default function UpgradeRequiredPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  const handleUpgrade = async (plan: string) => {
    setError("");
    setLoading(plan);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        setLoading(null);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Network error. Please try again.");
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16" style={{ backgroundColor: "#FFF8F0" }}>
      {/* Warning badge */}
      <div
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-6"
        style={{ backgroundColor: "rgba(239,68,68,0.08)", color: "#dc2626", border: "1px solid rgba(239,68,68,0.2)" }}
      >
        <AlertTriangle className="w-4 h-4" />
        Your free trial has ended
      </div>

      <h1 className="text-3xl font-black mb-3 text-center" style={{ color: "#292524" }}>
        Upgrade to continue using MarketHub Pro
      </h1>
      <p className="text-sm mb-10 text-center max-w-md" style={{ color: "#A8967E" }}>
        Your 7-day free trial has expired. Choose a plan below to unlock all features and keep your data.
      </p>

      {error && (
        <div
          className="mb-6 text-sm px-4 py-3 rounded-xl text-center max-w-md"
          style={{ backgroundColor: "rgba(239,68,68,0.08)", color: "#dc2626", border: "1px solid rgba(239,68,68,0.2)" }}
        >
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl w-full mb-10">
        {PLANS.map((plan) => (
          <div
            key={plan.key}
            className="rounded-2xl p-6 flex flex-col"
            style={
              plan.highlight
                ? { background: "linear-gradient(135deg,#F59E0B,#D97706)", boxShadow: "0 8px 32px rgba(245,158,11,0.35)", color: "white" }
                : { backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" }
            }
          >
            {plan.highlight && (
              <div className="text-xs font-bold text-center mb-3 py-1 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.2)" }}>
                MOST POPULAR
              </div>
            )}
            <div className="flex items-center gap-2 mb-4" style={{ color: plan.highlight ? "white" : plan.color }}>
              {plan.icon}
              <span className="font-bold text-lg" style={{ color: plan.highlight ? "white" : "#292524" }}>{plan.name}</span>
            </div>
            <div className="mb-5">
              <span className="text-3xl font-black" style={{ color: plan.highlight ? "white" : "#292524" }}>{plan.price}</span>
              <span className="text-sm ml-1" style={{ color: plan.highlight ? "rgba(255,255,255,0.7)" : "#A8967E" }}>{plan.period}</span>
            </div>
            <ul className="space-y-2 flex-1 mb-5">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: plan.highlight ? "rgba(255,255,255,0.9)" : "#16a34a" }} />
                  <span style={{ color: plan.highlight ? "rgba(255,255,255,0.9)" : "#5C4A35" }}>{f}</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              disabled={loading === plan.key}
              onClick={() => handleUpgrade(plan.key)}
              className="w-full py-3 rounded-xl text-sm font-bold transition-all hover:opacity-90"
              style={
                plan.highlight
                  ? { backgroundColor: "rgba(255,255,255,0.95)", color: "#D97706", opacity: loading === plan.key ? 0.7 : 1 }
                  : { backgroundColor: "#F59E0B", color: "#1C1814", opacity: loading === plan.key ? 0.7 : 1 }
              }
            >
              {loading === plan.key ? "Loading..." : `Choose ${plan.name}`}
            </button>
          </div>
        ))}
      </div>

      <Link href="/login" className="text-xs underline" style={{ color: "#A8967E" }}>
        Sign in to a different account
      </Link>
    </div>
  );
}
