"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, User, Mail, Lock, Globe, ArrowLeft } from "lucide-react";

const TIER_LABELS: Record<string, { label: string; price: string }> = {
  emerging:  { label: "Emerging Markets",          price: "\u20AC29/mo" },
  southeast: { label: "SE Europe & LATAM",         price: "\u20AC49/mo" },
  europe:    { label: "Western Europe & East Asia", price: "\u20AC99/mo" },
  premium:   { label: "Premium Markets",           price: "$149/mo" },
  ultra:     { label: "Ultra-Premium Markets",     price: "$199/mo" },
};

const VALID_TIERS = Object.keys(TIER_LABELS);

export default function ResellerSignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center" style={{ background: "#0A0A0A" }}><Loader2 className="w-8 h-8 animate-spin text-amber-500" /></div>}>
      <ResellerSignupForm />
    </Suspense>
  );
}

function ResellerSignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTier = searchParams.get("tier") || "europe";
  const initialTier = VALID_TIERS.includes(rawTier) ? rawTier : "europe";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tier, setTier] = useState(initialTier);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const currentTier = TIER_LABELS[tier] || TIER_LABELS.europe;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("All fields are required.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/reseller/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, tier }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        setLoading(false);
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      } else {
        router.push("/reseller/dashboard");
      }
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen text-[#FAFAF5] flex items-center justify-center p-6"
      style={{
        background: "linear-gradient(180deg, #0A0A0A 0%, #1A1510 50%, #0A0A0A 100%)",
      }}
    >
      <div className="w-full max-w-md">
        <Link
          href={`/reseller/${tier}`}
          className="inline-flex items-center gap-1.5 text-sm text-[#A0A0A0] hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to {currentTier.label}
        </Link>

        <div
          className="rounded-2xl p-8"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <h1 className="text-2xl font-extrabold mb-2">Create Reseller Account</h1>
          <p className="text-[#A0A0A0] text-sm mb-1">
            {currentTier.label} &mdash; <span className="text-amber-400 font-bold">{currentTier.price}</span> per client seat
          </p>
          <p className="text-[#666] text-xs mb-6">Start managing clients in minutes.</p>

          {error && (
            <div
              className="rounded-xl px-4 py-3 text-sm mb-5"
              style={{
                background: "rgba(220,38,38,0.1)",
                border: "1px solid rgba(220,38,38,0.3)",
                color: "#FCA5A5",
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <label className="block">
              <span className="text-xs text-[#A0A0A0] flex items-center gap-1.5 mb-1.5">
                <User className="w-3.5 h-3.5" /> Full Name
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Smith"
                required
                className="w-full px-3.5 py-3 rounded-xl text-sm text-[#FAFAF5] outline-none"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              />
            </label>

            {/* Email */}
            <label className="block">
              <span className="text-xs text-[#A0A0A0] flex items-center gap-1.5 mb-1.5">
                <Mail className="w-3.5 h-3.5" /> Email
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@agency.com"
                required
                className="w-full px-3.5 py-3 rounded-xl text-sm text-[#FAFAF5] outline-none"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              />
            </label>

            {/* Password */}
            <label className="block">
              <span className="text-xs text-[#A0A0A0] flex items-center gap-1.5 mb-1.5">
                <Lock className="w-3.5 h-3.5" /> Password
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                required
                minLength={8}
                className="w-full px-3.5 py-3 rounded-xl text-sm text-[#FAFAF5] outline-none"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              />
            </label>

            {/* Region/Tier */}
            <label className="block">
              <span className="text-xs text-[#A0A0A0] flex items-center gap-1.5 mb-1.5">
                <Globe className="w-3.5 h-3.5" /> Region
              </span>
              <select
                value={tier}
                onChange={(e) => setTier(e.target.value)}
                className="w-full px-3.5 py-3 rounded-xl text-sm text-[#FAFAF5] outline-none cursor-pointer"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                {Object.entries(TIER_LABELS).map(([k, v]) => (
                  <option key={k} value={k} style={{ background: "#1A1510", color: "#FAFAF5" }}>
                    {v.label} &mdash; {v.price}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="btn-3d-active w-full py-3.5 rounded-xl font-bold text-base flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Creating account...
                </>
              ) : (
                `Create Account \u2014 ${currentTier.price}`
              )}
            </button>
          </form>

          <p className="text-center text-[#666] text-xs mt-5">
            Already have an account?{" "}
            <Link href="/login" className="text-amber-500 underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
