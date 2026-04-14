"use client";

/**
 * /offer-ro — AI Marketing Accelerator — Pagină exclusivă Romania.
 * Preț unic €499. Doar trafic țintit către RO primește acest link.
 */

import { useState } from "react";
import {
  Sparkles, Check, Zap, Clock, TrendingUp, Image as ImageIcon,
  Calendar, Users, Loader2,
} from "lucide-react";

const INCLUDED = [
  { icon: Sparkles,   text: "Analiză brand voice + strategie de conținut 30 zile" },
  { icon: Calendar,   text: "60 postări gata de publicat (LinkedIn, IG, FB, X, TikTok)" },
  { icon: ImageIcon,  text: "20 imagini AI branded pentru campanii" },
  { icon: Users,      text: "50 lead-uri calificate în nișa ta + setup outreach" },
  { icon: TrendingUp, text: "Call strategic 1h (Zoom) + raport performanță după 30 zile" },
  { icon: Zap,        text: "Programare automată — tu doar revizuiești și aprobi" },
];

export default function OfferROPage() {
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
          tier: "ro",
          email: email.trim() || undefined,
          business_name: businessName.trim() || undefined,
          website: website.trim() || undefined,
        }),
      });
      const d = await res.json();
      if (!res.ok || !d.url) throw new Error(d.error || "Checkout eșuat");
      window.location.href = d.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout eșuat");
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
          <Clock className="w-3 h-3" /> Preț lansare — doar primii 10 clienți
        </div>
        <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-4">
          30 de zile de <span style={{ color: "#F59E0B" }}>marketing</span>,<br />
          livrate în 5 zile.
        </h1>
        <p className="text-lg opacity-70 max-w-2xl mx-auto mb-6">
          60 de postări, 20 de imagini AI, calendar de conținut 30 zile și 50 de lead-uri calificate —
          trimise în inbox-ul tău. Tu revizuiești, aprobi, privești publicarea automată.
        </p>
        <p className="text-sm font-semibold" style={{ color: "#D97706" }}>
          ⏱ Livrare 5-7 zile · 💳 Plată securizată Stripe · 💯 Fără abonament
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
              <span className="text-5xl font-bold">€499</span>
              <span className="text-lg opacity-50 line-through">€999</span>
            </div>
            <p className="text-xs opacity-60">Plată unică · Livrare 5–7 zile · Fără abonament recurrent</p>
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
              placeholder="Email (opțional)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="px-3 py-2 rounded-md text-sm"
              style={{ border: "1px solid rgba(0,0,0,0.1)", outline: "none" }}
            />
            <input
              type="text"
              placeholder="Nume firmă"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="px-3 py-2 rounded-md text-sm"
              style={{ border: "1px solid rgba(0,0,0,0.1)", outline: "none" }}
            />
            <input
              type="url"
              placeholder="Website (opțional)"
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
              <><Loader2 className="w-4 h-4 animate-spin" /> Redirect către plată...</>
            ) : (
              <><Check className="w-4 h-4" /> Rezervă locul meu — €499</>
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
        <h2 className="text-xl font-bold text-center mb-6">Ce se întâmplă după plată</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          {[
            { n: 1, t: "Email de onboarding (5 min)", d: "Formular intake — brand, audiență, obiective." },
            { n: 2, t: "Call strategic (ziua 1)",     d: "Zoom 30 min pentru aliniere direcție + aprobare voice." },
            { n: 3, t: "Livrare (ziua 5–7)",          d: "60 postări + 20 imagini + calendar în inbox-ul tău." },
            { n: 4, t: "Raport 30 zile",              d: "Snapshot performanță + recomandări următori pași." },
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
          MarketHub Pro · Plată securizată Stripe ·
          Întrebări? <a href="mailto:eduard@markethubpromo.com" style={{ color: "#F59E0B" }}>eduard@markethubpromo.com</a>
        </p>
      </footer>
    </div>
  );
}
