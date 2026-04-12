"use client";

import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import { Check, X, Zap, Settings } from "lucide-react";
import Link from "next/link";

const FREE_PLANS = [null, "free_test", "expired"];

const plans = [
  {
    id: "free_test",
    name: "Starter",
    duration: "14 Days",
    price: "$0",
    premiumActions: "5",
    description: "Test the platform for free",
    cta: "Start Free",
    popular: false,
    features: [
      { name: "Premium AI Actions", value: "5", included: true },
      { name: "Basic AI", value: "Unlimited", included: true },
      { name: "Social Accounts", value: "1", included: true },
      { name: "API Access", included: false },
      { name: "Priority Support", included: false },
      { name: "White Label", included: false },
    ],
  },
  {
    id: "lite",
    name: "Creator",
    duration: "Monthly",
    price: "$24",
    premiumActions: "20",
    description: "For solo creators",
    cta: "Choose Creator",
    popular: false,
    features: [
      { name: "Premium AI Actions", value: "20 / month", included: true },
      { name: "Basic AI", value: "Unlimited", included: true },
      { name: "Social Accounts", value: "2", included: true },
      { name: "TikTok Access", included: true },
      { name: "Email Reports", included: true },
      { name: "Calendar", included: true },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    duration: "Monthly",
    price: "$49",
    premiumActions: "50",
    description: "For agencies & professionals",
    cta: "Choose Pro",
    popular: true,
    features: [
      { name: "Premium AI Actions", value: "50 / month", included: true },
      { name: "Basic AI", value: "Unlimited", included: true },
      { name: "Social Accounts", value: "4", included: true },
      { name: "Team Members", value: "3", included: true },
      { name: "Competitor Tracking", value: "20", included: true },
      { name: "Priority Support", included: true },
    ],
  },
  {
    id: "business",
    name: "Studio",
    duration: "Monthly",
    price: "$99",
    premiumActions: "200",
    description: "For digital marketing agencies",
    cta: "Choose Studio",
    popular: false,
    features: [
      { name: "Premium AI Actions", value: "200 / month", included: true },
      { name: "Basic AI", value: "Unlimited", included: true },
      { name: "Team Members", value: "5", included: true },
      { name: "Client Accounts", value: "20", included: true },
      { name: "API Access", included: true },
      { name: "SLA Uptime", value: "99.5%", included: true },
    ],
  },
  {
    id: "enterprise",
    name: "Agency",
    duration: "Monthly",
    price: "$249",
    premiumActions: "1,000",
    description: "For marketing agencies at scale",
    cta: "Contact Sales",
    popular: false,
    features: [
      { name: "Premium AI Actions", value: "1,000 / month", included: true },
      { name: "Basic AI", value: "Unlimited", included: true },
      { name: "Team Members", value: "Unlimited", included: true },
      { name: "API Access", included: true },
      { name: "White Label", included: true },
      { name: "SLA Uptime", value: "99.9%", included: true },
    ],
  },
];

export default function UpgradePage() {
  const [loading, setLoading] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState("");

  useEffect(() => {
    fetch("/api/billing")
      .then((r) => r.json())
      .then((d) => setCurrentPlan(d.plan ?? null))
      .catch(() => {});
  }, []);

  const isPaid = currentPlan && !FREE_PLANS.includes(currentPlan);

  const handleUpgrade = async (planId: string) => {
    if (planId === "free_test") {
      window.location.href = "/register";
      return;
    }
    setCheckoutError("");
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCheckoutError(data.error || "An error occurred. Please try again.");
        return;
      }
      if (data.url) window.location.href = data.url;
    } catch {
      setCheckoutError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Header title="Upgrade Plan" subtitle="Premium AI Actions monthly · Basic AI unlimited" />

      <div className="p-6 space-y-10">
        {/* Manage subscription banner */}
        {isPaid && (
          <div className="flex items-center gap-3 px-5 py-3.5 rounded-xl text-sm" style={{ backgroundColor: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)" }}>
            <Settings className="w-4 h-4 flex-shrink-0" style={{ color: "#F59E0B" }} />
            <span style={{ color: "#78614E" }}>
              You&apos;re on the <strong style={{ color: "#292524" }}>{currentPlan!.charAt(0).toUpperCase() + currentPlan!.slice(1)}</strong> plan.{" "}
              <Link href="/dashboard/billing" className="font-semibold underline" style={{ color: "#F59E0B" }}>
                Manage subscription
              </Link>
            </span>
          </div>
        )}

        {/* How Premium AI Actions work */}
        <div className="rounded-xl p-6 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200">
          <div className="flex items-start gap-3">
            <Zap className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
            <div>
              <h3 className="font-semibold mb-2" style={{ color: "#1E40AF" }}>How Premium AI Actions Work</h3>
              <p className="text-sm" style={{ color: "#1E3A8A" }}>
                Each plan includes a monthly quota of <strong>Premium AI Actions</strong> for advanced features like Lead Scoring, Outreach Generator, Full Campaign Builder and APEX Marketing Advisor. <strong>Basic AI</strong> (captions, drafts, Haiku-powered helpers) stays unlimited on every paid plan. Quotas reset on the 1st of each month.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                {[
                  ["Lead Scoring", "1 Action"],
                  ["Outreach Message", "1 Action"],
                  ["Full Campaign", "1 Action"],
                  ["APEX Advisor", "1 Action"],
                ].map(([label, val]) => (
                  <div key={label}>
                    <span style={{ color: "#1E40AF" }} className="font-semibold">{label}:</span>
                    <span style={{ color: "#1E3A8A" }}> {val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Error */}
        {checkoutError && (
          <div className="text-sm px-4 py-3 rounded-xl text-center" style={{ backgroundColor: "rgba(239,68,68,0.08)", color: "#dc2626", border: "1px solid rgba(239,68,68,0.2)" }}>
            {checkoutError}
          </div>
        )}

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isCurrent = plan.id === currentPlan || (plan.id === "free_test" && FREE_PLANS.includes(currentPlan));

            return (
              <div
                key={plan.id}
                className={`rounded-2xl p-8 transition-all ${
                  plan.popular && !isCurrent
                    ? "ring-2 ring-amber-400 lg:scale-105"
                    : isCurrent
                    ? "ring-2 ring-green-400"
                    : "border border-amber-200"
                }`}
                style={{
                  backgroundColor: "#FFFCF7",
                  boxShadow: plan.popular ? "0 10px 30px rgba(245,158,11,0.2)" : "0 1px 3px rgba(120,97,78,0.08)",
                }}
              >
                {isCurrent ? (
                  <div className="mb-4">
                    <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ backgroundColor: "rgba(34,197,94,0.12)", color: "#16a34a" }}>
                      Current Plan
                    </span>
                  </div>
                ) : plan.popular ? (
                  <div className="mb-4">
                    <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ backgroundColor: "rgba(245,158,11,0.15)", color: "#F59E0B" }}>
                      Most Popular
                    </span>
                  </div>
                ) : (
                  <div className="mb-4 h-6" />
                )}

                <h3 className="text-2xl font-bold mb-1" style={{ color: "#292524" }}>{plan.name}</h3>
                <p className="text-sm mb-4" style={{ color: "#A8967E" }}>{plan.duration}</p>

                <div className="mb-6">
                  <p className="text-4xl font-bold mb-1" style={{ color: "#F59E0B" }}>{plan.price}</p>
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-blue-600" />
                    <p className="text-sm font-semibold" style={{ color: "#1E40AF" }}>{plan.premiumActions} Premium AI Actions/month</p>
                  </div>
                </div>

                <p className="text-sm mb-6" style={{ color: "#78614E" }}>{plan.description}</p>

                <button
                  type="button"
                  onClick={() => !isCurrent && handleUpgrade(plan.id)}
                  disabled={loading || isCurrent}
                  className="w-full py-3 rounded-lg font-semibold text-sm mb-8 transition-all"
                  style={isCurrent ? {
                    backgroundColor: "rgba(34,197,94,0.1)",
                    color: "#16a34a",
                    cursor: "default",
                  } : {
                    backgroundColor: plan.popular ? "#F59E0B" : "rgba(245,158,11,0.1)",
                    color: plan.popular ? "#1C1814" : "#F59E0B",
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {isCurrent ? "Current Plan" : loading ? "Processing..." : isPaid ? "Switch to " + plan.name : plan.cta}
                </button>

                <div className="space-y-3">
                  {plan.features.map((feature) => (
                    <div key={feature.name} className="flex items-start gap-3">
                      {feature.included ? (
                        <Check className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#10B981" }} />
                      ) : (
                        <X className="w-5 h-5 flex-shrink-0 mt-0.5 text-gray-300" />
                      )}
                      <p className="text-sm" style={{ color: feature.included ? "#292524" : "#C4AA8A" }}>
                        {feature.name}
                        {typeof (feature as any).value === "string" && (
                          <span className="font-semibold ml-2">{(feature as any).value}</span>
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
