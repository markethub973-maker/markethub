"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Zap, Eye, EyeOff, Lock, Mail, User, Check, X } from "lucide-react";

const plans = [
  {
    id: "free_test",
    name: "Free Test",
    duration: "7 Days",
    badge: "Try First",
    description: "Perfect to test the platform",
    features: [
      { name: "AI Calls/Day", value: "5", included: true },
      { name: "Social Accounts", value: "2", included: true },
      { name: "Email Reports", included: false },
      { name: "Webhook Integration", included: false },
      { name: "Custom Dashboard", included: false },
      { name: "Priority Support", included: false },
    ],
  },
  {
    id: "lite",
    name: "Lite Plan",
    duration: "Monthly",
    badge: "Popular",
    description: "For growing businesses",
    features: [
      { name: "AI Calls/Day", value: "50", included: true },
      { name: "Social Accounts", value: "Unlimited", included: true },
      { name: "Email Reports", included: true },
      { name: "Webhook Integration", included: false },
      { name: "Custom Dashboard", included: false },
      { name: "Priority Support", included: false },
    ],
    note: "Max $20/month API cost",
  },
  {
    id: "pro",
    name: "Pro Plan",
    duration: "Monthly",
    badge: "Best Value",
    description: "For enterprises",
    features: [
      { name: "AI Calls/Day", value: "Unlimited", included: true },
      { name: "Social Accounts", value: "Unlimited", included: true },
      { name: "Email Reports", included: true },
      { name: "Webhook Integration", included: true },
      { name: "Custom Dashboard", included: true },
      { name: "Priority Support", included: true },
    ],
    note: "Max $40/month API cost",
  },
];

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<"plan" | "form">("plan");
  const [selectedPlan, setSelectedPlan] = useState("free_test");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

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
        body: JSON.stringify({ name, email, password, plan: selectedPlan }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "An error occurred.");
        setLoading(false);
        return;
      }
      setSuccess("Account created! Check your email for confirmation, then sign in.");
      setTimeout(() => router.push("/login"), 3000);
    } catch {
      setError("Network error. Try again.");
      setLoading(false);
    }
  };

  const currentPlan = plans.find((p) => p.id === selectedPlan);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#FFF8F0" }}>
      <div className="w-full max-w-6xl px-6 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center mb-3"
              style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)" }}
            >
              <Zap className="w-7 h-7 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-2" style={{ color: "#292524" }}>
            MarketHub Pro
          </h1>
          <p className="text-sm" style={{ color: "#A8967E" }}>
            Choose your plan and start today
          </p>
        </div>

        {step === "plan" ? (
          /* Plan Selection Step */
          <div>
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-bold mb-2" style={{ color: "#292524" }}>
                Select Your Plan
              </h2>
              <p className="text-sm" style={{ color: "#A8967E" }}>
                Start free with our 7-day trial, or jump straight to Lite/Pro
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className="rounded-2xl p-8 cursor-pointer transition-all transform hover:scale-105"
                  onClick={() => handleSelectPlan(plan.id)}
                  style={{
                    backgroundColor: "#FFFCF7",
                    border:
                      selectedPlan === plan.id
                        ? "2px solid #F59E0B"
                        : "1px solid rgba(245,215,160,0.25)",
                    boxShadow:
                      selectedPlan === plan.id
                        ? "0 10px 30px rgba(245,158,11,0.2)"
                        : "0 1px 3px rgba(120,97,78,0.08)",
                  }}
                >
                  {/* Badge */}
                  <div className="mb-4">
                    <span
                      className="text-xs font-bold px-3 py-1 rounded-full"
                      style={{ backgroundColor: "rgba(245,158,11,0.15)", color: "#F59E0B" }}
                    >
                      {plan.badge}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-2xl font-bold mb-1" style={{ color: "#292524" }}>
                    {plan.name}
                  </h3>
                  <p className="text-sm mb-4" style={{ color: "#A8967E" }}>
                    {plan.duration}
                  </p>

                  {/* Description */}
                  <p className="text-sm mb-6" style={{ color: "#78614E" }}>
                    {plan.description}
                  </p>

                  {/* Note */}
                  {plan.note && (
                    <div
                      className="mb-6 p-2 rounded text-xs font-semibold"
                      style={{ backgroundColor: "rgba(245,158,11,0.1)", color: "#F59E0B" }}
                    >
                      {plan.note}
                    </div>
                  )}

                  {/* Features */}
                  <div className="space-y-3 mb-6">
                    {plan.features.map((feature) => (
                      <div key={feature.name} className="flex items-center gap-2">
                        {feature.included ? (
                          <Check className="w-4 h-4 flex-shrink-0" style={{ color: "#10B981" }} />
                        ) : (
                          <X className="w-4 h-4 flex-shrink-0 text-gray-300" />
                        )}
                        <span
                          className="text-sm"
                          style={{ color: feature.included ? "#292524" : "#C4AA8A" }}
                        >
                          {feature.name}
                          {feature.value && <span className="font-semibold ml-2">{feature.value}</span>}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* CTA Button */}
                  <button
                    className="w-full py-3 rounded-lg font-semibold text-sm transition-all"
                    style={{
                      backgroundColor: selectedPlan === plan.id ? "#F59E0B" : "rgba(245,158,11,0.1)",
                      color: selectedPlan === plan.id ? "#1C1814" : "#F59E0B",
                    }}
                  >
                    {selectedPlan === plan.id ? "Selected ✓" : "Choose Plan"}
                  </button>
                </div>
              ))}
            </div>

            {/* Restrictions Info */}
            <div
              className="rounded-xl p-6 mb-8"
              style={{ backgroundColor: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.2)" }}
            >
              <h4 className="font-semibold mb-3" style={{ color: "#292524" }}>
                📋 Plan Restrictions & Limits
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                <div>
                  <p className="font-semibold mb-2" style={{ color: "#F59E0B" }}>
                    Free Test (7 days)
                  </p>
                  <ul className="space-y-1" style={{ color: "#78614E" }}>
                    <li>• Max 5 AI calls per day</li>
                    <li>• Only 2 social media accounts</li>
                    <li>• No email reports</li>
                    <li>• Auto-expires after 7 days</li>
                    <li>• Must upgrade to continue</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold mb-2" style={{ color: "#F59E0B" }}>
                    Lite Plan ($20/month)
                  </p>
                  <ul className="space-y-1" style={{ color: "#78614E" }}>
                    <li>• 50 AI calls per day</li>
                    <li>• Unlimited social accounts</li>
                    <li>• Email reports included</li>
                    <li>• Max $20 API cost/month</li>
                    <li>• Auto-throttled at limit</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold mb-2" style={{ color: "#F59E0B" }}>
                    Pro Plan ($40/month)
                  </p>
                  <ul className="space-y-1" style={{ color: "#78614E" }}>
                    <li>• Unlimited AI calls</li>
                    <li>• Unlimited accounts</li>
                    <li>• All features included</li>
                    <li>• Max $40 API cost/month</li>
                    <li>• Priority support 24/7</li>
                  </ul>
                </div>
              </div>
            </div>

            <p className="text-center text-xs" style={{ color: "#A8967E" }}>
              Already have an account?{" "}
              <Link href="/login" style={{ color: "#F59E0B", fontWeight: 600 }}>
                Sign in
              </Link>
            </p>
          </div>
        ) : (
          /* Registration Form Step */
          <div className="max-w-md mx-auto">
            {/* Back Button */}
            <button
              onClick={() => setStep("plan")}
              className="text-sm font-semibold mb-6 flex items-center gap-2"
              style={{ color: "#F59E0B" }}
            >
              ← Back to plans
            </button>

            {/* Selected Plan Summary */}
            <div
              className="rounded-xl p-4 mb-6"
              style={{ backgroundColor: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}
            >
              <p className="text-sm" style={{ color: "#292524" }}>
                <span className="font-semibold">You selected:</span>{" "}
                <span style={{ color: "#F59E0B" }}>{currentPlan?.name}</span>
              </p>
              {currentPlan?.note && (
                <p className="text-xs mt-2" style={{ color: "#A8967E" }}>
                  {currentPlan.note}
                </p>
              )}
            </div>

            {/* Form Card */}
            <div
              className="rounded-2xl p-8"
              style={{
                backgroundColor: "#FFFCF7",
                border: "1px solid rgba(245,215,160,0.35)",
                boxShadow: "0 4px 24px rgba(120,97,78,0.12)",
              }}
            >
              <h2 className="text-xl font-bold mb-1" style={{ color: "#292524" }}>
                Create Account
              </h2>
              <p className="text-sm mb-6" style={{ color: "#A8967E" }}>
                Start free, no card required
              </p>

              <form onSubmit={handleRegister} className="space-y-4">
                {/* Full name */}
                <div>
                  <label className="text-xs font-semibold mb-1.5 block" style={{ color: "#78614E" }}>
                    Full name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#C4AA8A" }} />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      required
                      className="w-full pl-10 pr-4 py-3 text-sm rounded-lg focus:outline-none transition-all"
                      style={{ border: "1px solid rgba(245,215,160,0.4)", backgroundColor: "#FFF8F0", color: "#292524" }}
                      onFocus={(e) => (e.currentTarget.style.border = "1px solid #F59E0B")}
                      onBlur={(e) => (e.currentTarget.style.border = "1px solid rgba(245,215,160,0.4)")}
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="text-xs font-semibold mb-1.5 block" style={{ color: "#78614E" }}>
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#C4AA8A" }} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@example.com"
                      required
                      className="w-full pl-10 pr-4 py-3 text-sm rounded-lg focus:outline-none transition-all"
                      style={{ border: "1px solid rgba(245,215,160,0.4)", backgroundColor: "#FFF8F0", color: "#292524" }}
                      onFocus={(e) => (e.currentTarget.style.border = "1px solid #F59E0B")}
                      onBlur={(e) => (e.currentTarget.style.border = "1px solid rgba(245,215,160,0.4)")}
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="text-xs font-semibold mb-1.5 block" style={{ color: "#78614E" }}>
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#C4AA8A" }} />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      required
                      minLength={8}
                      className="w-full pl-10 pr-10 py-3 text-sm rounded-lg focus:outline-none transition-all"
                      style={{ border: "1px solid rgba(245,215,160,0.4)", backgroundColor: "#FFF8F0", color: "#292524" }}
                      onFocus={(e) => (e.currentTarget.style.border = "1px solid #F59E0B")}
                      onBlur={(e) => (e.currentTarget.style.border = "1px solid rgba(245,215,160,0.4)")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ color: "#C4AA8A" }}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div
                    className="text-sm px-3 py-2 rounded-lg"
                    style={{ backgroundColor: "rgba(239,68,68,0.08)", color: "#dc2626", border: "1px solid rgba(239,68,68,0.2)" }}
                  >
                    {error}
                  </div>
                )}

                {/* Success */}
                {success && (
                  <div
                    className="text-sm px-3 py-2 rounded-lg"
                    style={{ backgroundColor: "rgba(22,163,74,0.08)", color: "#16a34a", border: "1px solid rgba(22,163,74,0.2)" }}
                  >
                    {success}
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-lg text-sm font-bold transition-opacity"
                  style={{ backgroundColor: "#F59E0B", color: "#1C1814", opacity: loading ? 0.7 : 1 }}
                >
                  {loading ? "Creating account..." : "Create free account"}
                </button>
              </form>

              <p className="text-center text-xs mt-5" style={{ color: "#A8967E" }}>
                Already have an account?{" "}
                <Link href="/login" style={{ color: "#F59E0B", fontWeight: 600 }}>
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        )}

        <p className="text-center text-xs mt-6" style={{ color: "#C4AA8A" }}>
          © 2026 MarketHub Pro ·{" "}
          <a href="/privacy" style={{ color: "#F59E0B" }}>
            Privacy
          </a>
          {" "}·{" "}
          <a href="/terms" style={{ color: "#F59E0B" }}>
            Terms
          </a>
        </p>
      </div>
    </div>
  );
}
