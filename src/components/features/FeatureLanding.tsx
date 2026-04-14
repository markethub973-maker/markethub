"use client";

/**
 * FeatureLanding — single-component landing template used by every
 * /features/[slug] page. All copy comes from src/lib/featuresData.ts.
 *
 * The demo slot (FeatureDemo) is intentionally swappable: today it
 * renders a screenshot fallback or a friendly placeholder; later we'll
 * plug in 3D Spline scenes / Lottie / video-with-alpha here without
 * touching the page template.
 */

import Link from "next/link";
import { ArrowRight, Sparkles, ExternalLink, MessageCircle } from "lucide-react";
import type { FeatureCatalogEntry } from "@/lib/featuresData";
import FeatureWorkflowDemo from "./FeatureWorkflowDemo";

interface Props {
  feature: FeatureCatalogEntry;
}

export default function FeatureLanding({ feature: f }: Props) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--color-bg-secondary)" }}>
      {/* Top bar */}
      <header className="px-6 py-4 flex items-center gap-3" style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
        <Link href="/" className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--color-text)" }}>
          <span style={{ color: "var(--color-primary)" }}>MarketHub Pro</span>
        </Link>
        <Link href="/features" className="text-xs ml-2" style={{ color: "#78614E" }}>
          ← All features
        </Link>
        <div className="flex-1" />
        <Link href="/login" className="text-xs" style={{ color: "#78614E" }}>Sign in</Link>
        <Link
          href="/register"
          className="text-xs font-bold px-3 py-1.5 rounded-md"
          style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))", color: "#1C1814" }}
        >
          Start free
        </Link>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-12">
        {/* HERO */}
        <section className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-center">
          <div className="lg:col-span-3 space-y-5">
            <span
              className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide px-2 py-1 rounded-full"
              style={{ backgroundColor: "rgba(245,158,11,0.1)", color: "var(--color-primary-hover)" }}
            >
              <span>{f.emoji}</span>
              {f.title}
            </span>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight" style={{ color: "var(--color-text)" }}>
              {f.hero_h1}
            </h1>
            <p className="text-lg" style={{ color: "#78614E", lineHeight: 1.5 }}>
              {f.hero_pain}
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                href={f.cta_primary.href}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold"
                style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))", color: "#1C1814" }}
              >
                {f.cta_primary.label}
                <ArrowRight className="w-4 h-4" />
              </Link>
              {f.cta_secondary && (
                <Link
                  href={f.cta_secondary.href}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold"
                  style={{ backgroundColor: "rgba(0,0,0,0.04)", color: "var(--color-text)" }}
                >
                  {f.cta_secondary.label}
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>
          </div>
          <div className="lg:col-span-2">
            <FeatureDemo feature={f} />
          </div>
        </section>

        {/* OUTCOMES */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {f.outcomes.map((o, i) => (
            <div
              key={i}
              className="rounded-xl p-5"
              style={{ backgroundColor: "white", border: "1px solid rgba(0,0,0,0.06)" }}
            >
              <Sparkles className="w-5 h-5 mb-2" style={{ color: "var(--color-primary)" }} />
              <p className="text-sm font-bold mb-1" style={{ color: "var(--color-text)" }}>{o.label}</p>
              <p className="text-xs" style={{ color: "#78614E", lineHeight: 1.5 }}>{o.body}</p>
            </div>
          ))}
        </section>

        {/* HOW IT WORKS */}
        <section>
          <h2 className="text-2xl font-bold mb-5" style={{ color: "var(--color-text)" }}>How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {f.steps.map((s, i) => (
              <div
                key={i}
                className="rounded-xl p-5 relative"
                style={{ backgroundColor: "white", border: "1px solid rgba(0,0,0,0.06)" }}
              >
                <div
                  className="absolute -top-3 -left-3 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
                  style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))", color: "white" }}
                >
                  {i + 1}
                </div>
                <p className="text-sm font-bold mb-2 mt-1" style={{ color: "var(--color-text)" }}>{s.title}</p>
                <p className="text-xs" style={{ color: "#78614E", lineHeight: 1.5 }}>{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* USE CASES */}
        <section>
          <h2 className="text-xl font-bold mb-3" style={{ color: "var(--color-text)" }}>Built for</h2>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {f.use_cases.map((u, i) => (
              <li
                key={i}
                className="rounded-lg px-4 py-3 flex items-center gap-2"
                style={{ backgroundColor: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.15)" }}
              >
                <span style={{ color: "var(--color-primary-hover)" }}>→</span>
                <p className="text-sm" style={{ color: "var(--color-text)" }}>{u}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* HELP NUDGE — leverages Ask Consultant */}
        <section
          className="rounded-2xl p-5 flex items-center gap-4 flex-wrap"
          style={{ backgroundColor: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.2)" }}
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #8B5CF6, #6D28D9)" }}
          >
            <MessageCircle className="w-5 h-5" style={{ color: "white" }} />
          </div>
          <div className="flex-1 min-w-[200px]">
            <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
              Not sure if {f.title} is for you?
            </p>
            <p className="text-xs" style={{ color: "#78614E" }}>
              Inside the app, click <strong>Ask consultant</strong> (bottom-left) — get a tailored answer in any language, in seconds.
            </p>
          </div>
          <Link
            href="/register"
            className="text-xs font-bold px-4 py-2 rounded-lg"
            style={{ backgroundColor: "#8B5CF6", color: "white" }}
          >
            Try it inside →
          </Link>
        </section>

        {/* FINAL CTA */}
        <section
          className="rounded-2xl p-8 text-center"
          style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.08), rgba(139,92,246,0.08))", border: "1px solid rgba(245,158,11,0.2)" }}
        >
          <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--color-text)" }}>
            Try {f.title} free.
          </h2>
          <p className="text-sm mb-5" style={{ color: "#78614E" }}>
            7-day Pro trial. No card. Every AI feature in MarketHub included.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold"
              style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))", color: "#1C1814" }}
            >
              Start free trial
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/features"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold"
              style={{ backgroundColor: "white", color: "var(--color-text)", border: "1px solid rgba(0,0,0,0.08)" }}
            >
              See all features
            </Link>
          </div>
        </section>
      </main>

      <footer className="px-6 py-6 text-center text-[11px]" style={{ color: "#A8967E", borderTop: "1px solid rgba(0,0,0,0.05)" }}>
        © 2026 MarketHub Pro — <Link href="/privacy" className="underline">Privacy</Link> · <Link href="/terms" className="underline">Terms</Link>
      </footer>
    </div>
  );
}

// ── Demo slot — swappable based on feature.demo_kind ──────────────────────
//
//   "screenshot" → static <img>
//   "video"      → autoplay/loop/muted <video> (drop MP4 in public/demos/)
//   "spline"     → 3D scene iframe (paste Spline export URL)
//
// For full scroll-driven product demos (iPhone-style exploded view), follow
// the video-to-website skill in .claude/skills/video-to-website.md and host
// the dedicated demo at /features/<slug>/demo (separate route).
function FeatureDemo({ feature }: { feature: FeatureCatalogEntry }) {
  // Workflow CSS-animated explainer (default for software features) —
  // takes priority unless we have a real video file to play.
  if (feature.demo_kind === "workflow" && feature.workflow_kind) {
    return <FeatureWorkflowDemo kind={feature.workflow_kind} />;
  }

  const aspectClass = feature.demo_kind === "video" ? "aspect-video" : "aspect-square";
  return (
    <div
      className={`rounded-2xl overflow-hidden ${aspectClass} flex items-center justify-center relative`}
      style={{
        background: "linear-gradient(135deg, rgba(245,158,11,0.08), rgba(139,92,246,0.08))",
        border: "1px solid rgba(245,158,11,0.2)",
      }}
    >
      {feature.demo_kind === "video" && feature.demo_src ? (
        <video
          src={feature.demo_src}
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full object-cover"
          poster={feature.demo_src.replace(/\.(mp4|mov|webm)$/i, ".jpg")}
        />
      ) : feature.demo_kind === "spline" && feature.demo_src ? (
        <iframe
          src={feature.demo_src}
          title={`${feature.title} 3D preview`}
          className="w-full h-full border-0"
          loading="lazy"
        />
      ) : feature.demo_src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={feature.demo_src}
          alt={`${feature.title} preview`}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
          loading="lazy"
        />
      ) : null}
      {/* Friendly placeholder when no demo asset present yet */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{ zIndex: 1, opacity: feature.demo_src ? 0 : 1 }}
      >
        <div className="text-center">
          <p className="text-7xl mb-2">{feature.emoji}</p>
          <p className="text-[10px] uppercase tracking-wider font-bold" style={{ color: "#A8967E" }}>
            Demo coming soon
          </p>
        </div>
      </div>
    </div>
  );
}
