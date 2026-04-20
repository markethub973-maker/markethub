"use client";

/**
 * /offer-intl — AI Marketing Accelerator — International page (EU/UK/US/etc).
 * Single price €1000. Only shared with non-RO prospects.
 */

import { useState } from "react";
import {
  Sparkles, Check, Zap, Clock, TrendingUp, Image as ImageIcon,
  Calendar, Users, Loader2,
} from "lucide-react";

const INCLUDED = [
  { icon: Sparkles,   text: "Brand voice analysis + 30-day content strategy" },
  { icon: Calendar,   text: "60 captions distributed across 2–3 platforms you choose (within safe reach limits)" },
  { icon: ImageIcon,  text: "20 AI-generated branded images for hero posts" },
  { icon: Users,      text: "20–50 potential clients identified in your niche + pre-written outreach messages" },
  { icon: TrendingUp, text: "1-hour strategy call (Zoom) + 30-day report on published posts" },
  { icon: Zap,        text: "Scheduled automatically — you review and approve" },
];

export default function OfferIntlPage() {
  const [email, setEmail] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [website, setWebsite] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkout = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/offer/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier: "global",
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
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FAFAF8", color: "#1C1814" }}>
      <section className="max-w-4xl mx-auto px-6 pt-16 pb-6 text-center">
        <div
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-4"
          style={{ backgroundColor: "#FEF3C7", color: "#92400E" }}
        >
          <Clock className="w-3 h-3" /> Founding client pricing — first 10 clients only
        </div>
        <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-4">
          Your next 30 days of <span style={{ color: "#F59E0B" }}>content</span>,<br />
          ready in 5 days. You just approve.
        </h1>
        <p className="text-lg opacity-70 max-w-2xl mx-auto mb-6">
          60 captions written in your brand voice, 20 branded images, a full 30-day calendar,
          and 50 qualified prospects with outreach ready — shipped to your inbox.
        </p>
        <p className="text-sm font-semibold" style={{ color: "#D97706" }}>
          ⏱ 5–7 day delivery · 💳 Secure payment via Stripe · 💯 No subscription
        </p>
      </section>

      <section className="max-w-2xl mx-auto px-6 py-6">
        <div
          className="rounded-2xl p-6"
          style={{
            backgroundColor: "white",
            border: "2px solid #F59E0B",
            boxShadow: "0 8px 24px rgba(245,158,11,0.15)",
          }}
        >
          <div className="text-center mb-5">
            <div className="flex items-baseline justify-center gap-2 mb-1">
              <span className="text-5xl font-bold">€1000</span>
              <span className="text-lg opacity-50 line-through">€1999</span>
            </div>
            <p className="text-xs opacity-60">One-time payment · 5–7 day delivery · No subscription</p>
          </div>

          <ul className="space-y-2 mb-6">
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

          <div className="grid grid-cols-1 gap-2 mb-4">
            <input
              type="email"
              placeholder="Email (optional)"
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

          <button
            type="button"
            onClick={checkout}
            disabled={loading}
            className="w-full py-3 rounded-xl font-bold text-sm disabled:opacity-50 inline-flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)", color: "white" }}
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Redirecting to checkout...</>
            ) : (
              <><Check className="w-4 h-4" /> Claim my spot — €1000</>
            )}
          </button>

          {error && (
            <p className="text-xs font-semibold text-center mt-3" style={{ color: "#B91C1C" }}>
              {error}
            </p>
          )}
        </div>
      </section>

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

      <section className="max-w-3xl mx-auto px-6 pb-4">
        <p className="text-xs opacity-60 text-center leading-relaxed">
          Post volume is calibrated below each platform&apos;s safe-reach threshold —
          exact platform split is decided together on the strategy call.
          We do not promise a fixed number of followers or sales; we deliver the
          content and outreach infrastructure that makes growth possible.
        </p>
      </section>

      <footer className="max-w-4xl mx-auto px-6 py-10 text-center text-xs opacity-50">
        <p>
          Built on MarketHub Pro · Secure payment by Stripe ·
          Questions? <a href="mailto:office@markethubpromo.com" style={{ color: "#F59E0B" }}>office@markethubpromo.com</a>
        </p>
      </footer>
    </div>
  );
}
