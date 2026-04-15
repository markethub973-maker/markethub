"use client";

/**
 * Shared multilingual offer page.
 * Each locale (/offer-de, /offer-fr, /offer-it, /offer-es, /offer-pt) renders
 * this component with its own copy + price tier. Keeps markup in one place.
 */

import { useState } from "react";
import {
  Sparkles, Check, Zap, Clock, TrendingUp, Image as ImageIcon,
  Calendar, Users, Loader2,
} from "lucide-react";

export interface OfferCopy {
  tier: "de" | "fr" | "it" | "es" | "pt";
  price_display: string; // e.g. "€1500"
  price_strikethrough: string; // e.g. "€2999"
  badge: string;
  headline_a: string;
  headline_highlight: string;
  headline_b: string;
  subheadline: string;
  microcopy: string;
  price_note: string;
  included: string[]; // 6 items
  email_placeholder: string;
  business_placeholder: string;
  website_placeholder: string;
  cta: string;
  cta_loading: string;
  after_heading: string;
  steps: Array<{ t: string; d: string }>; // 4 steps
  disclaimer: string;
  footer_built_on: string;
  footer_questions: string;
}

export default function OfferPage({ copy }: { copy: OfferCopy }) {
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
          tier: copy.tier,
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

  const icons = [Sparkles, Calendar, ImageIcon, Users, TrendingUp, Zap];

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FAFAF8", color: "#1C1814" }}>
      <section className="max-w-4xl mx-auto px-6 pt-16 pb-6 text-center">
        <div
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-4"
          style={{ backgroundColor: "#FEF3C7", color: "#92400E" }}
        >
          <Clock className="w-3 h-3" /> {copy.badge}
        </div>
        <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-4">
          {copy.headline_a}{" "}
          <span style={{ color: "#F59E0B" }}>{copy.headline_highlight}</span>
          {copy.headline_b}
        </h1>
        <p className="text-lg opacity-70 max-w-2xl mx-auto mb-6">{copy.subheadline}</p>
        <p className="text-sm font-semibold" style={{ color: "#D97706" }}>
          {copy.microcopy}
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
              <span className="text-5xl font-bold">{copy.price_display}</span>
              <span className="text-lg opacity-50 line-through">{copy.price_strikethrough}</span>
            </div>
            <p className="text-xs opacity-60">{copy.price_note}</p>
          </div>

          <ul className="space-y-2 mb-6">
            {copy.included.map((text, i) => {
              const I = icons[i] ?? Check;
              return (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <I className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#F59E0B" }} />
                  <span>{text}</span>
                </li>
              );
            })}
          </ul>

          <div className="grid grid-cols-1 gap-2 mb-4">
            <input
              type="email"
              placeholder={copy.email_placeholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="px-3 py-2 rounded-md text-sm"
              style={{ border: "1px solid rgba(0,0,0,0.1)", outline: "none" }}
            />
            <input
              type="text"
              placeholder={copy.business_placeholder}
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="px-3 py-2 rounded-md text-sm"
              style={{ border: "1px solid rgba(0,0,0,0.1)", outline: "none" }}
            />
            <input
              type="url"
              placeholder={copy.website_placeholder}
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
              <><Loader2 className="w-4 h-4 animate-spin" /> {copy.cta_loading}</>
            ) : (
              <><Check className="w-4 h-4" /> {copy.cta}</>
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
        <h2 className="text-xl font-bold text-center mb-6">{copy.after_heading}</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          {copy.steps.map((s, i) => (
            <div key={i} className="p-4 rounded-xl" style={{ backgroundColor: "white", border: "1px solid rgba(0,0,0,0.06)" }}>
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm mb-2"
                style={{ backgroundColor: "#F59E0B", color: "white" }}
              >
                {i + 1}
              </div>
              <p className="font-bold text-sm mb-1">{s.t}</p>
              <p className="text-xs opacity-70">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-6 pb-4">
        <p className="text-xs opacity-60 text-center leading-relaxed">{copy.disclaimer}</p>
      </section>

      <footer className="max-w-4xl mx-auto px-6 py-10 text-center text-xs opacity-50">
        <p>
          {copy.footer_built_on} ·{" "}
          {copy.footer_questions}{" "}
          <a href="mailto:office@markethubpromo.com" style={{ color: "#F59E0B" }}>office@markethubpromo.com</a>
        </p>
      </footer>
    </div>
  );
}
