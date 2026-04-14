"use client";

/**
 * /offer — AI Marketing Accelerator — Founding Client landing page.
 *
 * Two geo-based tiers (RO €499 / Global €1000), one-time Stripe Checkout,
 * no pre-existing account required. Built for cold outreach conversion.
 */

import { useState, useEffect } from "react";
import {
  Sparkles, Check, Zap, Clock, TrendingUp, Image as ImageIcon,
  Calendar, Users, Loader2, Globe, MapPin,
} from "lucide-react";

type Tier = "ro" | "global";

const TIERS: Record<Tier, { price: number; currency: string; label: string; regular: number }> = {
  ro:     { price: 499,  currency: "€", label: "Romania",          regular: 999 },
  global: { price: 1000, currency: "€", label: "Global (EU/UK/US)", regular: 1999 },
};

const INCLUDED = [
  { icon: Sparkles,   text: "Brand voice analysis + 30-day content strategy" },
  { icon: Calendar,   text: "60 platform-optimized captions (LinkedIn, IG, FB, X, TikTok)" },
  { icon: ImageIcon,  text: "20 AI-generated branded images for campaigns" },
  { icon: Users,      text: "50 qualified leads in your niche + outreach setup" },
  { icon: TrendingUp, text: "1-hour strategy call (Zoom) + 30-day performance report" },
  { icon: Zap,        text: "All scheduled automatically — you review and approve" },
];

export default function OfferPage() {
  const [detectedTier, setDetectedTier] = useState<Tier>("global");
  const [email, setEmail] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [website, setWebsite] = useState("");
  const [loading, setLoading] = useState<Tier | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [slotsLeft, setSlotsLeft] = useState(10);

  // Detect country via browser timezone (fast, no API call, no geolocation prompt).
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      if (tz.includes("Bucharest") || tz.includes("Europe/Bucharest")) {
        setDetectedTier("ro");
      }
    } catch { /* noop */ }
    // Soft scarcity — 7 of 10 remaining, decrements slowly client-side.
    setSlotsLeft(7);
  }, []);

  const checkout = async (tier: Tier) => {
    setError(null);
    setLoading(tier);
    try {
      const res = await fetch("/api/offer/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier,
          email: email.trim() || undefined,
          business_name: businessName.trim() || undefined,
          website: website.trim() || undefined,
        }),
      });
      const d = await res.json();
      if (!res.ok || !d.url) throw new Error(d.error || "Checkout failed");
      window.location.href = d.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed");
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FAFAF8", color: "#1C1814" }}>
      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-16 pb-8 text-center">
        <div
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-4"
          style={{ backgroundColor: "#FEF3C7", color: "#92400E" }}
        >
          <Clock className="w-3 h-3" /> Founding client pricing — only {slotsLeft} of 10 spots left
        </div>
        <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-4">
          Your next 30 days of <span style={{ color: "#F59E0B" }}>marketing</span>,<br />
          done for you in 5 days.
        </h1>
        <p className="text-lg opacity-70 max-w-2xl mx-auto mb-6">
          60 captions, 20 AI images, a 30-day content calendar and 50 qualified leads —
          shipped to your inbox. You review, approve, watch it publish.
        </p>
        <p className="text-sm font-semibold" style={{ color: "#D97706" }}>
          ⏱ 5-7 day delivery · 💳 Secure payment via Stripe · 💯 No subscription
        </p>
      </section>

      {/* Optional context form */}
      <section className="max-w-3xl mx-auto px-6 mb-6">
        <div
          className="rounded-xl p-4 grid grid-cols-1 md:grid-cols-3 gap-3"
          style={{ backgroundColor: "white", border: "1px solid rgba(0,0,0,0.06)" }}
        >
          <input
            type="email"
            placeholder="Your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="px-3 py-2 rounded-md text-sm"
            style={{ border: "1px solid rgba(0,0,0,0.1)", outline: "none" }}
          />
          <input
            type="text"
            placeholder="Business name"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className="px-3 py-2 rounded-md text-sm"
            style={{ border: "1px solid rgba(0,0,0,0.1)", outline: "none" }}
          />
          <input
            type="url"
            placeholder="Website (optional)"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            className="px-3 py-2 rounded-md text-sm"
            style={{ border: "1px solid rgba(0,0,0,0.1)", outline: "none" }}
          />
        </div>
        <p className="text-xs opacity-50 mt-2 text-center">
          Optional — helps us prepare your account before the strategy call.
        </p>
      </section>

      {/* Pricing cards */}
      <section className="max-w-5xl mx-auto px-6 py-6 grid grid-cols-1 md:grid-cols-2 gap-5">
        {(Object.entries(TIERS) as [Tier, typeof TIERS[Tier]][]).map(([key, cfg]) => {
          const isDetected = key === detectedTier;
          const Icon = key === "ro" ? MapPin : Globe;
          return (
            <div
              key={key}
              className="rounded-2xl p-6 flex flex-col"
              style={{
                backgroundColor: "white",
                border: isDetected ? "2px solid #F59E0B" : "1px solid rgba(0,0,0,0.08)",
                boxShadow: isDetected ? "0 8px 24px rgba(245,158,11,0.15)" : "0 2px 6px rgba(0,0,0,0.03)",
                position: "relative",
              }}
            >
              {isDetected && (
                <div
                  className="absolute -top-3 left-5 px-3 py-0.5 rounded-full text-xs font-bold"
                  style={{ backgroundColor: "#F59E0B", color: "white" }}
                >
                  Best match for you
                </div>
              )}
              <div className="flex items-center gap-2 mb-3">
                <Icon className="w-5 h-5" style={{ color: "#F59E0B" }} />
                <h3 className="text-lg font-bold">{cfg.label}</h3>
              </div>
              <div className="mb-5">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold">{cfg.currency}{cfg.price}</span>
                  <span className="text-sm opacity-50 line-through">
                    {cfg.currency}{cfg.regular}
                  </span>
                </div>
                <p className="text-xs opacity-60 mt-1">One-time · Delivered in 5–7 days · No subscription</p>
              </div>
              <ul className="space-y-2 mb-6 flex-1">
                {INCLUDED.map((item, i) => {
                  const I = item.icon;
                  return (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <I className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#F59E0B" }} />
                      <span>{item.text}</span>
                    </li>
                  );
                })}
              </ul>
              <button
                type="button"
                onClick={() => checkout(key)}
                disabled={loading !== null}
                className="w-full py-3 rounded-xl font-bold text-sm disabled:opacity-50 inline-flex items-center justify-center gap-2"
                style={{
                  background: "linear-gradient(135deg, #F59E0B, #D97706)",
                  color: "white",
                }}
              >
                {loading === key ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Redirecting to checkout...</>
                ) : (
                  <><Check className="w-4 h-4" /> Claim my spot — {cfg.currency}{cfg.price}</>
                )}
              </button>
            </div>
          );
        })}
      </section>

      {error && (
        <p className="max-w-3xl mx-auto px-6 text-sm font-semibold text-center" style={{ color: "#B91C1C" }}>
          {error}
        </p>
      )}

      {/* Trust / FAQ strip */}
      <section className="max-w-4xl mx-auto px-6 py-10">
        <h2 className="text-xl font-bold text-center mb-6">What happens after you pay</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          {[
            { n: 1, t: "Onboarding email (5 min)", d: "Quick intake form — your brand, audience, goals." },
            { n: 2, t: "Strategy call (day 1)",    d: "30-min Zoom to align direction + approve voice." },
            { n: 3, t: "Delivery (day 5–7)",       d: "60 captions + 20 images + calendar in your inbox." },
            { n: 4, t: "30-day report",            d: "Performance snapshot + next-step recommendations." },
          ].map((s) => (
            <div key={s.n} className="p-4 rounded-xl" style={{ backgroundColor: "white", border: "1px solid rgba(0,0,0,0.06)" }}>
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm mb-2"
                style={{ backgroundColor: "#F59E0B", color: "white" }}
              >
                {s.n}
              </div>
              <p className="font-bold text-sm mb-1">{s.t}</p>
              <p className="text-xs opacity-70">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="max-w-4xl mx-auto px-6 py-10 text-center text-xs opacity-50">
        <p>
          Built on MarketHub Pro · Secure payment by Stripe ·
          Questions? <a href="mailto:eduard@markethubpromo.com" style={{ color: "#F59E0B" }}>eduard@markethubpromo.com</a>
        </p>
      </footer>
    </div>
  );
}
