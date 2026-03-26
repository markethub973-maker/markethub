"use client";

import { useState } from "react";
import Header from "@/components/layout/Header";
import { Check, X } from "lucide-react";

const plans = [
  {
    name: "Free Test",
    duration: "7 Days",
    price: "FREE",
    description: "Test the platform for free",
    cta: "Start Free Trial",
    popular: false,
    features: [
      { name: "AI Calls/Day", value: 5, included: true },
      { name: "Social Accounts", value: 2, included: true },
      { name: "Email Reports", included: false },
      { name: "Webhook Integration", included: false },
      { name: "Custom Dashboard", included: false },
      { name: "Priority Support", included: false },
    ],
  },
  {
    name: "Lite",
    duration: "Monthly",
    price: "Variable",
    maxPrice: "$20/mo",
    description: "For growing businesses",
    cta: "Upgrade to Lite",
    popular: true,
    features: [
      { name: "AI Calls/Day", value: 50, included: true },
      { name: "Social Accounts", value: "Unlimited", included: true },
      { name: "Email Reports", included: true },
      { name: "Webhook Integration", included: false },
      { name: "Custom Dashboard", included: false },
      { name: "Priority Support", included: false },
    ],
  },
  {
    name: "Pro",
    duration: "Monthly",
    price: "Variable",
    maxPrice: "$40/mo",
    description: "For enterprises",
    cta: "Upgrade to Pro",
    popular: false,
    features: [
      { name: "AI Calls/Day", value: "Unlimited", included: true },
      { name: "Social Accounts", value: "Unlimited", included: true },
      { name: "Email Reports", included: true },
      { name: "Webhook Integration", included: true },
      { name: "Custom Dashboard", included: true },
      { name: "Priority Support", included: true },
    ],
  },
];

export default function PricingPage() {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async (plan: string) => {
    setLoading(true);
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: plan.toLowerCase() }),
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Upgrade error:", error);
      alert("Error processing upgrade. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Header title="Pricing Plans" subtitle="Choose the perfect plan for your needs" />
      <div className="p-6 space-y-12">

        {/* Info Section */}
        <div className="rounded-xl p-6 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200">
          <h3 className="font-semibold mb-3" style={{ color: "#292524" }}>
            How Pricing Works
          </h3>
          <p className="text-sm" style={{ color: "#78614E" }}>
            All paid plans have a maximum monthly API cost cap. You only pay for what you use, and we
            automatically throttle your account if you approach the limit. No surprise charges!
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl p-8 transition-all ${
                plan.popular
                  ? "ring-2 ring-amber-400 transform scale-105"
                  : "border border-amber-200"
              }`}
              style={{
                backgroundColor: "#FFFCF7",
                boxShadow: plan.popular ? "0 10px 30px rgba(245,158,11,0.2)" : "0 1px 3px rgba(120,97,78,0.08)",
              }}
            >
              {plan.popular && (
                <div className="mb-4">
                  <span
                    className="text-xs font-bold px-3 py-1 rounded-full"
                    style={{ backgroundColor: "rgba(245,158,11,0.15)", color: "#F59E0B" }}
                  >
                    Most Popular
                  </span>
                </div>
              )}

              <h3 className="text-2xl font-bold mb-2" style={{ color: "#292524" }}>
                {plan.name}
              </h3>
              <p className="text-sm mb-4" style={{ color: "#A8967E" }}>
                {plan.duration}
              </p>

              <div className="mb-6">
                <p className="text-4xl font-bold mb-1" style={{ color: "#F59E0B" }}>
                  {plan.price}
                </p>
                {plan.maxPrice && (
                  <p className="text-xs" style={{ color: "#C4AA8A" }}>
                    max {plan.maxPrice}
                  </p>
                )}
              </div>

              <p className="text-sm mb-6" style={{ color: "#78614E" }}>
                {plan.description}
              </p>

              <button
                onClick={() => handleUpgrade(plan.name)}
                disabled={loading}
                className="w-full py-3 rounded-lg font-semibold text-sm mb-8 transition-all"
                style={{
                  backgroundColor: plan.popular ? "#F59E0B" : "rgba(245,158,11,0.1)",
                  color: plan.popular ? "#1C1814" : "#F59E0B",
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? "Processing..." : plan.cta}
              </button>

              <div className="space-y-3">
                {plan.features.map((feature) => (
                  <div key={feature.name} className="flex items-start gap-3">
                    {feature.included ? (
                      <Check className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#10B981" }} />
                    ) : (
                      <X className="w-5 h-5 flex-shrink-0 mt-0.5 text-gray-300" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm" style={{ color: feature.included ? "#292524" : "#C4AA8A" }}>
                        {feature.name}
                        {typeof feature.value === "number" || typeof feature.value === "string" ? (
                          <span className="font-semibold ml-2">{feature.value}</span>
                        ) : null}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="rounded-xl p-8" style={{ backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)" }}>
          <h3 className="text-xl font-bold mb-6" style={{ color: "#292524" }}>
            Frequently Asked Questions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2" style={{ color: "#292524" }}>
                Can I cancel anytime?
              </h4>
              <p className="text-sm" style={{ color: "#78614E" }}>
                Yes! No long-term contracts. Cancel your subscription at any time from your account settings.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2" style={{ color: "#292524" }}>
                Do you offer refunds?
              </h4>
              <p className="text-sm" style={{ color: "#78614E" }}>
                We offer a 30-day money-back guarantee if you're not satisfied with the service.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2" style={{ color: "#292524" }}>
                What happens after the trial?
              </h4>
              <p className="text-sm" style={{ color: "#78614E" }}>
                After 7 days, your account will be limited. Upgrade to Lite or Pro to continue using the platform.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2" style={{ color: "#292524" }}>
                Can I change plans?
              </h4>
              <p className="text-sm" style={{ color: "#78614E" }}>
                Yes! Upgrade or downgrade your plan at any time. Changes take effect immediately.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
