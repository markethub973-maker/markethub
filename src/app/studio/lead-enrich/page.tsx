"use client";

/**
 * Lead Enrichment — paste a prospect's public info, AI produces:
 *   • company angle
 *   • ideal pitch framing
 *   • usable opener message (DM / email)
 *   • red flags before contacting
 */

import { useState } from "react";
import Header from "@/components/layout/Header";
import {
  UserSearch, Loader2, Sparkles, Copy, Check, AlertTriangle,
  Target, MessageSquare, Building,
} from "lucide-react";

interface Enrichment {
  company_angle: string;
  ideal_pitch: string;
  opener_message: string;
  red_flags: string[];
}

export default function LeadEnrichPage() {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [website, setWebsite] = useState("");
  const [email, setEmail] = useState("");
  const [rating, setRating] = useState("");
  const [reviewsCount, setReviewsCount] = useState("");
  const [yourOffer, setYourOffer] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Enrichment | null>(null);
  const [leadName, setLeadName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const canSubmit = name.trim().length >= 2 && !loading;

  const run = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/ai/enrich-lead-adhoc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          category: category.trim() || undefined,
          city: city.trim() || undefined,
          website: website.trim() || undefined,
          email: email.trim() || undefined,
          rating: rating ? parseFloat(rating) : undefined,
          reviews_count: reviewsCount ? parseInt(reviewsCount, 10) : undefined,
          your_offer: yourOffer.trim() || undefined,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Failed");
      setResult(d.enrichment);
      setLeadName(d.lead_name ?? name.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch { /* no-op */ }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--color-bg-secondary)" }}>
      <Header title="Lead Enrichment" subtitle="Prospect info → company angle + pitch + usable opener" />

      <main className="max-w-5xl mx-auto px-6 py-6 space-y-5">
        <section
          className="rounded-xl p-5 space-y-4"
          style={{ backgroundColor: "white", border: "1px solid rgba(0,0,0,0.06)" }}
        >
          <div className="flex items-center gap-2">
            <UserSearch className="w-5 h-5" style={{ color: "var(--color-primary)" }} />
            <h2 className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
              Prospect details
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "#78614E" }}>
                Company name <span style={{ color: "#EF4444" }}>*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Acme Digital Agency"
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{ backgroundColor: "var(--color-bg)", border: "1px solid rgba(245,215,160,0.4)", color: "var(--color-text)", outline: "none" }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "#78614E" }}>
                Category / niche
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Marketing agency, 5-15 employees"
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{ backgroundColor: "var(--color-bg)", border: "1px solid rgba(245,215,160,0.4)", color: "var(--color-text)", outline: "none" }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "#78614E" }}>City / country</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Bucharest, RO"
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{ backgroundColor: "var(--color-bg)", border: "1px solid rgba(245,215,160,0.4)", color: "var(--color-text)", outline: "none" }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "#78614E" }}>Website</label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://acme.ro"
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{ backgroundColor: "var(--color-bg)", border: "1px solid rgba(245,215,160,0.4)", color: "var(--color-text)", outline: "none" }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "#78614E" }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="hello@acme.ro"
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{ backgroundColor: "var(--color-bg)", border: "1px solid rgba(245,215,160,0.4)", color: "var(--color-text)", outline: "none" }}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "#78614E" }}>Rating</label>
                <input
                  type="number"
                  step="0.1" min="0" max="5"
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                  placeholder="4.6"
                  className="w-full rounded-lg px-3 py-2 text-sm"
                  style={{ backgroundColor: "var(--color-bg)", border: "1px solid rgba(245,215,160,0.4)", color: "var(--color-text)", outline: "none" }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "#78614E" }}># Reviews</label>
                <input
                  type="number"
                  min="0"
                  value={reviewsCount}
                  onChange={(e) => setReviewsCount(e.target.value)}
                  placeholder="127"
                  className="w-full rounded-lg px-3 py-2 text-sm"
                  style={{ backgroundColor: "var(--color-bg)", border: "1px solid rgba(245,215,160,0.4)", color: "var(--color-text)", outline: "none" }}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: "#78614E" }}>
              Your offer (what you're pitching them — optional)
            </label>
            <textarea
              value={yourOffer}
              onChange={(e) => setYourOffer(e.target.value)}
              rows={2}
              maxLength={400}
              placeholder="We help small marketing agencies save 8h/week with AI content generation..."
              className="w-full rounded-lg px-3 py-2 text-sm resize-none"
              style={{ backgroundColor: "var(--color-bg)", border: "1px solid rgba(245,215,160,0.4)", color: "var(--color-text)", outline: "none" }}
            />
          </div>

          <button
            type="button"
            onClick={run}
            disabled={!canSubmit}
            className="w-full py-3 rounded-xl text-sm font-bold disabled:opacity-40 flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))", color: "#1C1814" }}
          >
            {loading ? (<><Loader2 className="w-4 h-4 animate-spin" /> Enriching...</>) : (<><Sparkles className="w-4 h-4" /> Enrich lead</>)}
          </button>

          {error && <p className="text-xs font-semibold" style={{ color: "#B91C1C" }}>{error}</p>}
        </section>

        {result && (
          <section className="space-y-3">
            {leadName && (
              <p className="text-xs font-semibold" style={{ color: "#78614E" }}>
                Enrichment for <span style={{ color: "var(--color-text)" }}>{leadName}</span>
              </p>
            )}

            <div
              className="rounded-xl p-4 space-y-2"
              style={{ backgroundColor: "white", border: "1px solid rgba(0,0,0,0.06)" }}
            >
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4" style={{ color: "#0EA5E9" }} />
                <p className="text-sm font-bold flex-1" style={{ color: "var(--color-text)" }}>Company angle</p>
                <button
                  type="button"
                  onClick={() => copy("angle", result.company_angle)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold"
                  style={{ backgroundColor: copied === "angle" ? "#10B981" : "rgba(0,0,0,0.04)", color: copied === "angle" ? "white" : "#78614E" }}
                >
                  {copied === "angle" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied === "angle" ? "Copied" : "Copy"}
                </button>
              </div>
              <p className="text-sm" style={{ color: "var(--color-text)", lineHeight: 1.5 }}>
                {result.company_angle}
              </p>
            </div>

            <div
              className="rounded-xl p-4 space-y-2"
              style={{ backgroundColor: "white", border: "1px solid rgba(0,0,0,0.06)" }}
            >
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4" style={{ color: "var(--color-primary)" }} />
                <p className="text-sm font-bold flex-1" style={{ color: "var(--color-text)" }}>Ideal pitch</p>
                <button
                  type="button"
                  onClick={() => copy("pitch", result.ideal_pitch)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold"
                  style={{ backgroundColor: copied === "pitch" ? "#10B981" : "rgba(0,0,0,0.04)", color: copied === "pitch" ? "white" : "#78614E" }}
                >
                  {copied === "pitch" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied === "pitch" ? "Copied" : "Copy"}
                </button>
              </div>
              <p className="text-sm" style={{ color: "var(--color-text)", lineHeight: 1.5 }}>
                {result.ideal_pitch}
              </p>
            </div>

            <div
              className="rounded-xl p-4 space-y-2"
              style={{ backgroundColor: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.25)" }}
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" style={{ color: "var(--color-primary-hover)" }} />
                <p className="text-sm font-bold flex-1" style={{ color: "var(--color-text)" }}>Opener message (send as-is)</p>
                <button
                  type="button"
                  onClick={() => copy("opener", result.opener_message)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold"
                  style={{ backgroundColor: copied === "opener" ? "#10B981" : "var(--color-primary-hover)", color: "white" }}
                >
                  {copied === "opener" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied === "opener" ? "Copied" : "Copy"}
                </button>
              </div>
              <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--color-text)", lineHeight: 1.5 }}>
                {result.opener_message}
              </p>
            </div>

            {result.red_flags.length > 0 && (
              <div
                className="rounded-xl p-4 space-y-2"
                style={{ backgroundColor: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.25)" }}
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" style={{ color: "#EF4444" }} />
                  <p className="text-sm font-bold" style={{ color: "#B91C1C" }}>Red flags before contacting</p>
                </div>
                <ul className="list-disc pl-5 space-y-1">
                  {result.red_flags.map((f, i) => (
                    <li key={i} className="text-sm" style={{ color: "var(--color-text)", lineHeight: 1.5 }}>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
