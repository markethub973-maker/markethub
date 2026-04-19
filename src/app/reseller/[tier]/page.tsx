import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check, X, ArrowLeft } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Tier data                                                          */
/* ------------------------------------------------------------------ */

type TierId = "emerging" | "southeast" | "europe" | "premium" | "ultra";

interface TierData {
  name: string;
  price: number;
  currency: string;
  clientCharge: number;
  profit: number;
  scale5: number;
  heroTitle: string;
  heroSub: string;
  examples: string;
  problemTitle: string;
  solutionTitle: string;
  problemItems: string[];
  solutionItems: string[];
  howTitle: string;
  steps: { num: string; title: string; desc: string }[];
  mathTitle: string;
  mathSub: string;
  mathYouCharge: string;
  mathYourCost: string;
  mathProfit: string;
  mathScale: string;
  ctaText: string;
  ctaSub: string;
  badgeText: string;
}

// Shared EN strings
const EN = {
  problemTitle: "The Problem",
  solutionTitle: "The Solution",
  howTitle: "How It Works",
  steps: [
    { num: "1", title: "Sign Up", desc: "Create your account in under 2 minutes" },
    { num: "2", title: "Add Clients", desc: "Import your clients with their social handles" },
    { num: "3", title: "Send Media", desc: "Upload raw photos, videos, or brand assets" },
    { num: "4", title: "We Produce", desc: "Our AI + team creates scroll-stopping content" },
    { num: "5", title: "You Approve", desc: "Review and approve from your dashboard" },
    { num: "6", title: "We Publish", desc: "Content goes live on schedule, automatically" },
  ],
  mathTitle: "The Math",
  mathSub: "Simple, transparent profit per client.",
  mathYouCharge: "You charge your client",
  mathYourCost: "Your MarketHub cost",
  mathProfit: "Your profit per client",
  mathScale: "With {n} clients",
  ctaText: "Apply Now",
  ctaSub: "No contract. Cancel anytime. Start with 1 client.",
  badgeText: "Partner Program",
};


const TIERS: Record<TierId, TierData> = {
  emerging: {
    name: "Partner Program",
    price: 29,
    currency: "€",
    clientCharge: 100,
    profit: 71,
    scale5: 355,
    heroTitle: "You have the clients. We do the work.",
    heroSub: "Offer social media management to local businesses. We produce everything. You keep the profit.",
    examples: "Local shops, restaurants, beauty salons",
    ...EN,
    problemItems: [
      "You lose clients because you can't produce content fast enough",
      "Hiring a designer costs more than the client pays",
      "You spend hours on Canva instead of selling",
    ],
    solutionItems: [
      "We produce all content — posts, reels, stories",
      "White-label: your brand, your client, our work",
      "You focus on sales, we handle production",
    ],
  },
  southeast: {
    name: "Partner Program",
    price: 49,
    currency: "€",
    clientCharge: 200,
    profit: 151,
    scale5: 755,
    heroTitle: "You have the clients. We do the work.",
    heroSub: "Offer social media management to your clients. We produce all content. You keep the relationship and the profit.",
    examples: "Beauty salons, restaurants, dental clinics, small agencies",
    ...EN,
    problemItems: [
      "You lose clients because you can't produce content fast enough",
      "Hiring a designer costs more than the client pays you",
      "You spend hours on Canva instead of selling",
    ],
    solutionItems: [
      "We produce everything — posts, reels, stories",
      "White-label: your brand, your client, our work",
      "You focus on sales, we handle production",
    ],
  },
  europe: {
    name: "Partner Program",
    price: 99,
    currency: "€",
    clientCharge: 400,
    profit: 301,
    scale5: 1505,
    heroTitle: "You have the clients. We do the work.",
    heroSub: "Offer premium social media management. We produce everything. You keep the profit.",
    examples: "Beauty & wellness, restaurants, health & medical",
    ...EN,
    problemItems: [
      "You lose clients because you can't scale content production",
      "Hiring in-house creatives is expensive and slow",
      "You spend time producing instead of growing your business",
    ],
    solutionItems: [
      "We produce all content — posts, reels, stories, carousels",
      "White-label: your brand, your client, our work",
      "Focus on client acquisition while we handle delivery",
    ],
  },
  premium: {
    name: "Partner Program",
    price: 149,
    currency: "$",
    clientCharge: 500,
    profit: 351,
    scale5: 1755,
    heroTitle: "You have the clients. We do the work.",
    heroSub: "Scale your business without hiring. We produce everything under your brand. You keep the profit.",
    examples: "Beauty & wellness, restaurants, health & fitness",
    ...EN,
    problemItems: [
      "Scaling means hiring — and hiring is expensive",
      "Content production is the bottleneck, not client acquisition",
      "You're stuck doing the work instead of running the business",
    ],
    solutionItems: [
      "We produce all content — posts, reels, stories, carousels",
      "White-label: your brand, zero co-branding",
      "Take on 10x more clients without adding headcount",
    ],
  },
  ultra: {
    name: "Partner Program",
    price: 199,
    currency: "$",
    clientCharge: 800,
    profit: 601,
    scale5: 3005,
    heroTitle: "You have the clients. We do the work.",
    heroSub: "Luxury-market content production. We handle everything. You command premium fees.",
    examples: "Luxury salons, fine dining, premium clinics",
    ...EN,
    problemItems: [
      "Luxury clients expect flawless, consistent content",
      "In-house teams are expensive and hard to manage",
      "One bad post can damage a premium brand's reputation",
    ],
    solutionItems: [
      "Premium content produced by AI + human quality control",
      "White-label: your brand, your standards, our execution",
      "Consistent quality across all clients, every month",
    ],
  },
};

/* ------------------------------------------------------------------ */
/*  Static params                                                      */
/* ------------------------------------------------------------------ */

export function generateStaticParams() {
  return (["emerging", "southeast", "europe", "premium", "ultra"] as const).map((tier) => ({
    tier,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tier: string }>;
}): Promise<Metadata> {
  const { tier } = await params;
  const t = TIERS[tier as TierId];
  if (!t) return {};
  return {
    title: `Reseller ${t.name} \u2014 MarketHub Pro`,
    description: `Become a MarketHub Pro reseller in ${t.name}. Start at ${t.currency}${t.price}/mo and earn ${t.currency}${t.profit} per client.`,
    alternates: { canonical: `https://markethubpromo.com/reseller/${tier}` },
  };
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default async function ResellerTierPage({
  params,
}: {
  params: Promise<{ tier: string }>;
}) {
  const { tier } = await params;
  const t = TIERS[tier as TierId];
  if (!t) notFound();

  const fmt = (n: number) => n.toLocaleString("en-US");

  return (
    <div
      className="min-h-screen text-[#FAFAF5]"
      style={{
        background: "linear-gradient(180deg, #0A0A0A 0%, #1A1510 50%, #0A0A0A 100%)",
      }}
    >
      {/* Hero */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20 pb-8 sm:pb-12 text-center">
        <div
          className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold mb-6"
          style={{
            background: "rgba(245,158,11,0.15)",
            color: "#F59E0B",
            border: "1px solid rgba(245,158,11,0.3)",
          }}
        >
          {t.badgeText}
        </div>

        <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-5">
          {t.heroTitle}
        </h1>
        <p className="text-lg text-[#A0A0A0] max-w-xl mx-auto mb-8">
          {t.heroSub}
        </p>

        <Link
          href={`/reseller/signup?tier=${tier}`}
          className="btn-3d-active inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-base font-bold w-full sm:w-auto"
        >
          {t.ctaText} &mdash; {t.currency}{t.price}/mo <ArrowRight className="w-4 h-4" />
        </Link>
      </section>

      {/* Problem vs Solution */}
      <section className="max-w-4xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Problem */}
          <div
            className="rounded-2xl p-6"
            style={{
              background: "rgba(220,38,38,0.06)",
              border: "1px solid rgba(220,38,38,0.2)",
            }}
          >
            <h3 className="text-lg font-bold text-red-400 mb-4 flex items-center gap-2">
              <X className="w-5 h-5" /> {t.problemTitle}
            </h3>
            <ul className="space-y-3">
              {t.problemItems.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-[#ccc] leading-relaxed">
                  <X className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Solution */}
          <div
            className="rounded-2xl p-6"
            style={{
              background: "rgba(22,163,74,0.06)",
              border: "1px solid rgba(22,163,74,0.2)",
            }}
          >
            <h3 className="text-lg font-bold text-green-400 mb-4 flex items-center gap-2">
              <Check className="w-5 h-5" /> {t.solutionTitle}
            </h3>
            <ul className="space-y-3">
              {t.solutionItems.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-[#ccc] leading-relaxed">
                  <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-4xl mx-auto px-6 py-12">
        <h2 className="text-3xl font-bold text-center mb-10">{t.howTitle}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {t.steps.map((s) => (
            <div key={s.num} className="text-center">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-lg font-extrabold"
                style={{
                  background: "linear-gradient(135deg, #F59E0B, #D97706)",
                  color: "#1C1814",
                }}
              >
                {s.num}
              </div>
              <h4 className="text-sm font-bold mb-1">{s.title}</h4>
              <p className="text-xs text-[#A0A0A0] leading-snug">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* The Math */}
      <section className="max-w-3xl mx-auto px-6 py-12">
        <h2 className="text-3xl font-bold text-center mb-3">{t.mathTitle}</h2>
        <p className="text-center text-[#A0A0A0] mb-10 text-sm">
          {t.mathSub}
        </p>

        {/* Single client */}
        <div
          className="rounded-2xl p-6 mb-8"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 text-center gap-4">
            <div>
              <p className="text-xs text-[#888] uppercase tracking-wide mb-1">{t.mathYouCharge}</p>
              <p className="text-3xl font-extrabold text-white">{t.currency}{fmt(t.clientCharge)}</p>
              <p className="text-xs text-[#666]">/month</p>
            </div>
            <div>
              <p className="text-xs text-[#888] uppercase tracking-wide mb-1">MarketHub cost</p>
              <p className="text-3xl font-extrabold text-red-400">{t.currency}{t.price}</p>
              <p className="text-xs text-[#666]">/month</p>
            </div>
            <div>
              <p className="text-xs text-[#888] uppercase tracking-wide mb-1">{t.mathProfit}</p>
              <p className="text-3xl font-extrabold text-green-400">{t.currency}{fmt(t.profit)}</p>
              <p className="text-xs text-[#666]">/month</p>
            </div>
          </div>
        </div>

        {/* Scale examples */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { clients: 3, total: t.profit * 3 },
            { clients: 5, total: t.scale5 },
            { clients: 10, total: t.profit * 10 },
          ].map((s) => (
            <div
              key={s.clients}
              className="rounded-2xl p-5 text-center"
              style={{
                background: s.clients === 5 ? "rgba(245,158,11,0.08)" : "rgba(255,255,255,0.03)",
                border: s.clients === 5 ? "2px solid rgba(245,158,11,0.3)" : "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <p className="text-xs text-[#888] uppercase tracking-wide mb-1">{t.mathScale.replace("{n}", String(s.clients))}</p>
              <p className="text-2xl font-extrabold text-white">
                {t.currency}{fmt(s.total)}
                <span className="text-sm font-normal text-[#888]">/mo</span>
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* What's included */}
      <section className="max-w-3xl mx-auto px-6 py-12">
        <h2 className="text-3xl font-bold text-center mb-8">What You Get</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            "White-label content production",
            "AI-powered post creation",
            "Auto-scheduling & publishing",
            "Client management dashboard",
            "Brand voice per client",
            "Analytics & reporting",
            "Image, video & audio studio",
            "Priority support",
          ].map((f) => (
            <div
              key={f}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span className="text-[#D0D0D0]">{f}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Ideal for */}
      <section className="max-w-2xl mx-auto px-6 py-8 text-center">
        <p className="text-sm text-[#888]">
          Ideal for:{" "}
          <span className="text-white font-semibold">{t.examples}</span>
        </p>
      </section>

      {/* Final CTA */}
      <section className="max-w-2xl mx-auto px-6 py-16 text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to start?</h2>
        <p className="text-[#A0A0A0] mb-8 text-base">
          {t.currency}{t.price}/mo. {t.ctaSub}
        </p>
        <Link
          href={`/reseller/signup?tier=${tier}`}
          className="btn-3d-active inline-flex items-center gap-2 px-10 py-4 rounded-2xl text-lg font-bold"
        >
          {t.ctaText} &mdash; {t.currency}{t.price}/mo <ArrowRight className="w-5 h-5" />
        </Link>
      </section>
    </div>
  );
}
