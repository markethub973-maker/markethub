"use client";

import { useState } from "react";
import Header from "@/components/layout/Header";
import { Check, X, Zap } from "lucide-react";
import { TOKEN_PLANS } from "@/lib/token-plan-config";

export default function PricingPage() {
  const [loading, setLoading] = useState(false);

  const plans = [
    {
      id: "free_test",
      name: "Free Trial",
      duration: "7 Days",
      price: "$0",
      tokens: "1,000",
      description: "Test the platform for free",
      cta: "Start Free Trial",
      popular: false,
      features: [
        { name: "Monthly Tokens", value: "1,000", included: true },
        { name: "Social Accounts", value: "1", included: true },
        { name: "Can Recharge", included: false },
        { name: "API Access", included: false },
        { name: "Priority Support", included: false },
        { name: "White Label", included: false },
      ],
    },
    {
      id: "starter",
      name: "Starter",
      duration: "Monthly",
      price: "$9",
      tokens: "10,000",
      description: "For creators & small teams",
      cta: "Subscribe Now",
      popular: false,
      features: [
        { name: "Monthly Tokens", value: "10,000", included: true },
        { name: "Extra Tokens", value: "$1.00/1K", included: true },
        { name: "Social Accounts", value: "2", included: true },
        { name: "TikTok Access", value: "10 videos/month", included: true },
        { name: "API Access", included: false },
        { name: "Priority Support", included: false },
      ],
    },
    {
      id: "lite",
      name: "Lite",
      duration: "Monthly",
      price: "$19",
      tokens: "50,000",
      description: "For growing businesses",
      cta: "Subscribe Now",
      popular: true,
      features: [
        { name: "Monthly Tokens", value: "50,000", included: true },
        { name: "Extra Tokens", value: "$0.90/1K", included: true },
        { name: "Social Accounts", value: "4", included: true },
        { name: "TikTok Access", included: true },
        { name: "Email Reports", included: true },
        { name: "Calendar", included: true },
      ],
    },
    {
      id: "pro",
      name: "Pro",
      duration: "Monthly",
      price: "$39",
      tokens: "150,000",
      description: "For agencies & professionals",
      cta: "Subscribe Now",
      popular: false,
      features: [
        { name: "Monthly Tokens", value: "150,000", included: true },
        { name: "Extra Tokens", value: "$0.80/1K", included: true },
        { name: "Social Accounts", value: "8", included: true },
        { name: "Team Members", value: "2", included: true },
        { name: "Competitor Tracking", value: "15", included: true },
        { name: "Priority Support", included: true },
      ],
    },
    {
      id: "business",
      name: "Business",
      duration: "Monthly",
      price: "$99",
      tokens: "500,000",
      description: "For digital marketing agencies",
      cta: "Subscribe Now",
      popular: false,
      features: [
        { name: "Monthly Tokens", value: "500,000", included: true },
        { name: "Extra Tokens", value: "$0.70/1K", included: true },
        { name: "Team Members", value: "5", included: true },
        { name: "Client Accounts", value: "20", included: true },
        { name: "API Access", included: true },
        { name: "SLA Uptime", value: "99.5%", included: true },
      ],
    },
    {
      id: "enterprise",
      name: "Enterprise",
      duration: "Monthly",
      price: "$249",
      tokens: "1.5M",
      description: "For large-scale operations",
      cta: "Contact Sales",
      popular: false,
      features: [
        { name: "Monthly Tokens", value: "1,500,000", included: true },
        { name: "Extra Tokens", value: "$0.60/1K", included: true },
        { name: "Team Members", value: "Unlimited", included: true },
        { name: "API Access", included: true },
        { name: "White Label", included: true },
        { name: "SLA Uptime", value: "99.9%", included: true },
      ],
    },
  ];

  const handleUpgrade = async (planId: string) => {
    if (planId === "free_test") {
      // Redirect to signup
      window.location.href = "/register";
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
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
      <Header title="Pricing Plans" subtitle="Token-based pricing: Pay only for what you use" />
      <div className="p-6 space-y-12">

        {/* Info Section */}
        <div className="rounded-xl p-6 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200">
          <div className="flex items-start gap-3">
            <Zap className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
            <div>
              <h3 className="font-semibold mb-3" style={{ color: "#1E40AF" }}>
                How Token Pricing Works
              </h3>
              <p className="text-sm" style={{ color: "#1E3A8A" }}>
                Each plan includes monthly tokens that you can use for AI features (captions, analysis, reports, agents).
                Need more? Buy additional tokens at discounted rates. Extra tokens carry over — no unused credits lost!
              </p>
              <div className="mt-3 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span style={{ color: "#1E40AF" }} className="font-semibold">1 Caption:</span>
                  <span style={{ color: "#1E3A8A" }}> ~800 tokens</span>
                </div>
                <div>
                  <span style={{ color: "#1E40AF" }} className="font-semibold">1 Analysis:</span>
                  <span style={{ color: "#1E3A8A" }}> ~2,000 tokens</span>
                </div>
                <div>
                  <span style={{ color: "#1E40AF" }} className="font-semibold">1 PDF Report:</span>
                  <span style={{ color: "#1E3A8A" }}> ~5,000 tokens</span>
                </div>
                <div>
                  <span style={{ color: "#1E40AF" }} className="font-semibold">Agent Chat:</span>
                  <span style={{ color: "#1E3A8A" }}> ~10,000 tokens</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-2xl p-8 transition-all ${
                plan.popular
                  ? "ring-2 ring-amber-400 transform lg:scale-105"
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
                <div className="flex items-baseline gap-2">
                  <Zap className="w-4 h-4 text-blue-600" />
                  <p className="text-sm font-semibold" style={{ color: "#1E40AF" }}>
                    {plan.tokens} tokens/month
                  </p>
                </div>
              </div>

              <p className="text-sm mb-6" style={{ color: "#78614E" }}>
                {plan.description}
              </p>

              <button
                onClick={() => handleUpgrade(plan.id)}
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
                        {typeof feature.value === "string" ? (
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

        {/* Token Recharge Section */}
        <div className="rounded-xl p-8" style={{ backgroundColor: "#F0F9FF", border: "1px solid rgba(59,130,246,0.25)" }}>
          <h3 className="text-xl font-bold mb-6" style={{ color: "#1E40AF" }}>
            💰 Token Recharge Packs
          </h3>
          <p className="text-sm mb-6" style={{ color: "#1E3A8A" }}>
            Ran out of tokens? Purchase additional tokens at discounted rates. Bonus tokens available on larger purchases!
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { tokens: "10K", price: "$15", bonus: "No bonus" },
              { tokens: "25K", price: "$35", bonus: "+10% bonus" },
              { tokens: "50K", price: "$65", bonus: "+15% bonus" },
              { tokens: "100K", price: "$185", bonus: "+20% bonus" },
            ].map((pack) => (
              <div key={pack.tokens} className="rounded-lg p-4 border border-blue-200 bg-white">
                <p className="font-bold text-blue-600 mb-1">{pack.tokens} Tokens</p>
                <p className="text-2xl font-bold mb-2" style={{ color: "#292524" }}>{pack.price}</p>
                <p className="text-xs" style={{ color: "#10B981" }}>{pack.bonus}</p>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="rounded-xl p-8" style={{ backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)" }}>
          <h3 className="text-xl font-bold mb-6" style={{ color: "#292524" }}>
            Frequently Asked Questions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2" style={{ color: "#292524" }}>
                Do unused tokens carry over?
              </h4>
              <p className="text-sm" style={{ color: "#78614E" }}>
                Yes! All tokens purchased in a month are credited to your account and valid until used. No token expiration.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2" style={{ color: "#292524" }}>
                Can I cancel anytime?
              </h4>
              <p className="text-sm" style={{ color: "#78614E" }}>
                Absolutely! No long-term contracts. Cancel subscription anytime from your account settings.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2" style={{ color: "#292524" }}>
                What if I exceed my tokens?
              </h4>
              <p className="text-sm" style={{ color: "#78614E" }}>
                You'll be notified at 80% usage. You can purchase additional tokens instantly or your account will be throttled.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2" style={{ color: "#292524" }}>
                Do you offer refunds?
              </h4>
              <p className="text-sm" style={{ color: "#78614E" }}>
                Yes! 30-day money-back guarantee if you're not satisfied. Unused tokens are fully refundable.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// Vercel force rebuild marker: 1774520187
