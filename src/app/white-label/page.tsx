"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Zap,
  ArrowRight,
  Menu,
  Users,
  TrendingDown,
  DollarSign,
  FileText,
  ImageIcon,
  CalendarClock,
  Palette,
  Check,
  Send,
} from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import GlassButton from "@/components/ui/GlassButton";

/* ── Pain Points ─────────────────────────────────────────────── */
const painPoints = [
  {
    icon: Users,
    title: "Drowning in client deliverables",
    body: "15+ clients, each needs weekly content across multiple platforms. Your team is maxed out and dropping balls.",
  },
  {
    icon: TrendingDown,
    title: "Junior staff turnover",
    body: "You spend months training writers and designers. They leave. You start over. Repeat.",
  },
  {
    icon: DollarSign,
    title: "Margin squeeze",
    body: "You can\u2019t raise prices in a competitive market, but you also can\u2019t cut quality. Profits shrink every quarter.",
  },
];

/* ── Solution Features ───────────────────────────────────────── */
const solutions = [
  {
    icon: FileText,
    title: "60 captions/month per client",
    body: "AI-generated, brand-voice locked. Each caption matches your client\u2019s tone, language, and target audience.",
  },
  {
    icon: ImageIcon,
    title: "20 images/month per client",
    body: "On-brand visuals created with AI. No more stock photo hunting or waiting on designers.",
  },
  {
    icon: CalendarClock,
    title: "Automated scheduling",
    body: "Posts go live on Instagram, TikTok, Facebook, and LinkedIn without manual work. Set it and forget it.",
  },
  {
    icon: Palette,
    title: "White-label dashboard",
    body: "Your clients see YOUR brand, not ours. Custom logo, colors, domain \u2014 it\u2019s your platform.",
  },
];

/* ── Pricing Tiers ───────────────────────────────────────────── */
const tiers = [
  {
    name: "Starter",
    price: "\u20ac299",
    period: "/mo",
    clients: "Up to 5 clients",
    popular: false,
    features: [
      "60 captions/client/month",
      "20 images/client/month",
      "Auto-scheduling",
      "White-label dashboard",
      "Email support",
    ],
  },
  {
    name: "Growth",
    price: "\u20ac599",
    period: "/mo",
    clients: "Up to 15 clients",
    popular: true,
    features: [
      "Everything in Starter",
      "Brand voice profiles",
      "Multi-platform scheduling",
      "Campaign auto-pilot",
      "Priority support",
      "Monthly performance reports",
    ],
  },
  {
    name: "Scale",
    price: "\u20ac999",
    period: "/mo",
    clients: "Unlimited clients",
    popular: false,
    features: [
      "Everything in Growth",
      "Dedicated account manager",
      "Custom integrations",
      "API access",
      "Priority support + SLA",
      "Onboarding for your team",
    ],
  },
];

export default function WhiteLabelOfferPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    // Fire-and-forget lead capture
    fetch("/api/leads/capture", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, source: "white-label-offer" }),
    }).catch(() => {});
    setSubmitted(true);
  };

  return (
    <div
      className="relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #0d0b1e 0%, #1a0a2e 40%, #0a1628 100%)",
        minHeight: "100vh",
      }}
    >
      {/* ── Ambient blobs ──────────────────────────────────────── */}
      <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden="true">
        <div
          className="absolute"
          style={{
            top: "-10%",
            left: "-10%",
            width: "50%",
            height: "50%",
            background: "radial-gradient(circle, rgba(168,85,247,0.2) 0%, transparent 70%)",
            filter: "blur(80px)",
          }}
        />
        <div
          className="absolute"
          style={{
            bottom: "-10%",
            right: "-10%",
            width: "50%",
            height: "50%",
            background: "radial-gradient(circle, rgba(245,158,11,0.18) 0%, transparent 70%)",
            filter: "blur(80px)",
          }}
        />
        <div
          className="absolute"
          style={{
            top: "40%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "40%",
            height: "40%",
            background: "radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)",
            filter: "blur(80px)",
          }}
        />
      </div>

      {/* ── Navbar ─────────────────────────────────────────────── */}
      <nav
        className="sticky top-0 z-50 border-b backdrop-blur-xl"
        style={{
          backgroundColor: "rgba(13,11,30,0.8)",
          borderColor: "rgba(245,215,160,0.1)",
        }}
      >
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}
            >
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg text-white">MarketHub Pro</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link href="/pricing" className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.65)" }}>
              Pricing
            </Link>
            <Link href="/login" className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.65)" }}>
              Sign in
            </Link>
            <GlassButton variant="primary" size="sm" onClick={() => (window.location.href = "/register")}>
              Start free
            </GlassButton>
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            aria-label="Toggle menu"
            className="md:hidden p-2"
            style={{ color: "rgba(255,255,255,0.65)" }}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <Menu size={22} />
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t px-4 py-4 space-y-3" style={{ borderColor: "rgba(245,215,160,0.1)" }}>
            <Link href="/pricing" className="block text-sm py-2" style={{ color: "rgba(255,255,255,0.65)" }}>
              Pricing
            </Link>
            <Link href="/login" className="block text-sm py-2" style={{ color: "rgba(255,255,255,0.65)" }}>
              Sign in
            </Link>
            <Link
              href="/register"
              className="block w-full text-center py-3 rounded-xl text-sm font-bold"
              style={{ backgroundColor: "#f59e0b", color: "#1C1814" }}
            >
              Start free
            </Link>
          </div>
        )}
      </nav>

      {/* ── Content ────────────────────────────────────────────── */}
      <div className="relative z-10">
        {/* ── 1. Hero ──────────────────────────────────────────── */}
        <section className="max-w-5xl mx-auto px-4 pt-20 pb-16 text-center">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6"
            style={{
              backgroundColor: "rgba(245,158,11,0.12)",
              color: "#f59e0b",
              border: "1px solid rgba(245,158,11,0.3)",
            }}
          >
            <Users className="w-3 h-3" /> For Digital Agencies
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-6 text-white">
            Your{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #f59e0b, #fbbf24)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Content Team
            </span>
            , Automated
          </h1>

          <p className="text-lg sm:text-xl max-w-2xl mx-auto mb-10" style={{ color: "rgba(255,255,255,0.65)" }}>
            Deliver 10x more content to every client without hiring more staff. White-label AI content engine, branded as
            yours.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <GlassButton
              variant="primary"
              size="lg"
              className="inline-flex items-center gap-2"
              onClick={() => {
                const el = document.getElementById("cta-section");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Book a Demo <ArrowRight className="w-5 h-5" />
            </GlassButton>
            <GlassButton
              variant="secondary"
              size="lg"
              className="inline-flex items-center gap-2"
              onClick={() => {
                const el = document.getElementById("pricing-section");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              See Pricing
            </GlassButton>
          </div>
        </section>

        {/* ── 2. Problem Section ───────────────────────────────── */}
        <section className="max-w-5xl mx-auto px-4 pb-20">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3 text-white">
            Sound familiar?
          </h2>
          <p className="text-center text-sm mb-10" style={{ color: "rgba(255,255,255,0.45)" }}>
            Every growing agency hits the same wall.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {painPoints.map((p) => (
              <GlassCard key={p.title} padding="p-6">
                <p.icon className="w-8 h-8 mb-4" style={{ color: "#f59e0b" }} />
                <h3 className="font-bold text-lg mb-2 text-white">{p.title}</h3>
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>{p.body}</p>
              </GlassCard>
            ))}
          </div>
        </section>

        {/* ── 3. Solution Section ──────────────────────────────── */}
        <section className="max-w-5xl mx-auto px-4 pb-20">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3 text-white">
            What you get
          </h2>
          <p className="text-center text-sm mb-10" style={{ color: "rgba(255,255,255,0.45)" }}>
            A complete content production line, running 24/7 under your brand.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {solutions.map((s) => (
              <GlassCard key={s.title} padding="p-6">
                <div className="flex items-start gap-4">
                  <div
                    className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: "rgba(245,158,11,0.12)" }}
                  >
                    <s.icon className="w-5 h-5" style={{ color: "#f59e0b" }} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1 text-white">{s.title}</h3>
                    <p className="text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>{s.body}</p>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        </section>

        {/* ── 4. Pricing Section ───────────────────────────────── */}
        <section id="pricing-section" className="max-w-5xl mx-auto px-4 pb-20">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3 text-white">
            Simple pricing, serious results
          </h2>
          <p className="text-center text-sm mb-10" style={{ color: "rgba(255,255,255,0.45)" }}>
            Pick a plan. Cancel anytime. No hidden fees.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {tiers.map((tier) => (
              <GlassCard
                key={tier.name}
                accent={tier.popular}
                className={`relative flex flex-col ${tier.popular ? "ring-2 ring-amber-400/40" : ""}`}
                padding="p-6"
              >
                {tier.popular && (
                  <>
                    <div
                      className="absolute top-0 left-4 right-4 h-0.5 rounded-full"
                      style={{ background: "linear-gradient(90deg, transparent, #f59e0b, transparent)" }}
                    />
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span
                        className="px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap"
                        style={{ backgroundColor: "#f59e0b", color: "#1C1814" }}
                      >
                        Most Popular
                      </span>
                    </div>
                  </>
                )}

                <div className="mb-5">
                  <h3 className="text-xl font-bold mb-1 text-white">{tier.name}</h3>
                  <p className="text-sm mb-4" style={{ color: "rgba(255,255,255,0.45)" }}>
                    {tier.clients}
                  </p>
                  <div className="flex items-baseline gap-1">
                    <span
                      className="text-4xl font-extrabold"
                      style={{
                        background: "linear-gradient(135deg, #f59e0b, #fbbf24)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                      }}
                    >
                      {tier.price}
                    </span>
                    <span className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
                      {tier.period}
                    </span>
                  </div>
                </div>

                <GlassButton
                  variant={tier.popular ? "primary" : "secondary"}
                  size="lg"
                  className="w-full mb-6 flex items-center justify-center gap-2"
                  onClick={() => {
                    const el = document.getElementById("cta-section");
                    el?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  Get Started <ArrowRight className="w-4 h-4" />
                </GlassButton>

                <div className="space-y-2.5 flex-1">
                  {tier.features.map((f) => (
                    <div key={f} className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#f59e0b" }} />
                      <span className="text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>{f}</span>
                    </div>
                  ))}
                </div>
              </GlassCard>
            ))}
          </div>
        </section>

        {/* ── 5. CTA Section ───────────────────────────────────── */}
        <section id="cta-section" className="max-w-3xl mx-auto px-4 pb-20">
          <GlassCard accent padding="p-8 sm:p-12">
            <div className="text-center">
              <h2 className="text-3xl font-extrabold mb-3 text-white">
                Start with a free 5-client pilot
              </h2>
              <p className="mb-8" style={{ color: "rgba(255,255,255,0.55)" }}>
                See exactly what your clients will experience. No credit card required.
              </p>

              {submitted ? (
                <div
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold"
                  style={{
                    backgroundColor: "rgba(16,185,129,0.15)",
                    color: "#10B981",
                    border: "1px solid rgba(16,185,129,0.3)",
                  }}
                >
                  <Check className="w-5 h-5" />
                  Thanks! We will be in touch within 24 hours.
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-center gap-3 max-w-md mx-auto">
                  <input
                    type="email"
                    required
                    placeholder="you@agency.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full sm:flex-1 px-4 py-3 rounded-xl text-sm outline-none"
                    style={{
                      backgroundColor: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(255,255,255,0.15)",
                      color: "#fff",
                    }}
                  />
                  <GlassButton
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    <Send className="w-4 h-4" /> Book a Demo
                  </GlassButton>
                </form>
              )}

              <p className="text-xs mt-4" style={{ color: "rgba(255,255,255,0.35)" }}>
                No credit card required
              </p>
            </div>
          </GlassCard>
        </section>

        {/* ── 6. Footer ────────────────────────────────────────── */}
        <footer className="border-t py-8" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-md flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}
              >
                <Zap className="w-3 h-3 text-white" />
              </div>
              <span className="text-sm font-bold text-white">MarketHub Pro</span>
            </div>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
              &copy; 2026 MarketHub Pro &middot; All rights reserved
            </p>
            <div className="flex gap-4">
              <Link href="/login" className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                Sign in
              </Link>
              <Link href="/register" className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                Register
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
