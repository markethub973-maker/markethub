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
import GlassCard from "@/components/ui/GlassCard";

interface Props {
  feature: FeatureCatalogEntry;
}

export default function FeatureLanding({ feature: f }: Props) {
  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #0d0b1e 0%, #1a0a2e 40%, #0a1628 100%)" }}>
      {/* Ambient blobs */}
      <div style={{position:'fixed',top:'-10vh',left:'-8vw',width:'45vw',height:'45vw',borderRadius:'50%',background:'radial-gradient(circle,rgba(168,85,247,0.18),transparent 70%)',pointerEvents:'none',zIndex:0}} />
      <div style={{position:'fixed',bottom:'-10vh',right:'-8vw',width:'40vw',height:'40vw',borderRadius:'50%',background:'radial-gradient(circle,rgba(245,158,11,0.15),transparent 70%)',pointerEvents:'none',zIndex:0}} />
      <div style={{position:'fixed',top:'30vh',left:'35vw',width:'30vw',height:'30vw',borderRadius:'50%',background:'radial-gradient(circle,rgba(16,185,129,0.1),transparent 70%)',pointerEvents:'none',zIndex:0}} />

      {/* Content wrapper */}
      <div style={{ position: "relative", zIndex: 10 }}>
        {/* Top bar */}
        <header className="px-6 py-4 flex items-center gap-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <Link href="/" className="text-sm font-bold flex items-center gap-2" style={{ color: "#ffffff" }}>
            <span style={{ color: "#f59e0b" }}>MarketHub Pro</span>
          </Link>
          <Link href="/features" className="text-xs ml-2" style={{ color: "rgba(255,255,255,0.5)" }}>
            ← All features
          </Link>
          <div className="flex-1" />
          <Link href="/login" className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>Sign in</Link>
          <Link
            href="/register"
            className="text-xs font-bold px-3 py-1.5 rounded-md"
            style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#1C1814" }}
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
                style={{ backgroundColor: "rgba(245,158,11,0.15)", color: "#f59e0b" }}
              >
                <span>{f.emoji}</span>
                {f.title}
              </span>
              <h1 className="text-4xl md:text-5xl font-bold leading-tight" style={{ color: "#ffffff" }}>
                {f.hero_h1}
              </h1>
              <p className="text-lg" style={{ color: "rgba(255,255,255,0.65)", lineHeight: 1.5 }}>
                {f.hero_pain}
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Link
                  href={f.cta_primary.href}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold"
                  style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#1C1814" }}
                >
                  {f.cta_primary.label}
                  <ArrowRight className="w-4 h-4" />
                </Link>
                {f.cta_secondary && (
                  <Link
                    href={f.cta_secondary.href}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold"
                    style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "#ffffff", border: "1px solid rgba(255,255,255,0.12)" }}
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
              <GlassCard key={i} padding="p-5">
                <Sparkles className="w-5 h-5 mb-2" style={{ color: "#f59e0b" }} />
                <p className="text-sm font-bold mb-1" style={{ color: "#ffffff" }}>{o.label}</p>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.65)", lineHeight: 1.5 }}>{o.body}</p>
              </GlassCard>
            ))}
          </section>

          {/* HOW IT WORKS */}
          <section>
            <h2 className="text-2xl font-bold mb-5" style={{ color: "#ffffff" }}>How it works</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {f.steps.map((s, i) => (
                <GlassCard key={i} padding="p-5" className="relative">
                  <div
                    className="absolute -top-3 -left-3 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
                    style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#1C1814", zIndex: 20 }}
                  >
                    {i + 1}
                  </div>
                  <p className="text-sm font-bold mb-2 mt-1" style={{ color: "#ffffff" }}>{s.title}</p>
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.65)", lineHeight: 1.5 }}>{s.body}</p>
                </GlassCard>
              ))}
            </div>
          </section>

          {/* USE CASES */}
          <section>
            <h2 className="text-xl font-bold mb-3" style={{ color: "#ffffff" }}>Built for</h2>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {f.use_cases.map((u, i) => (
                <li
                  key={i}
                  className="rounded-lg px-4 py-3 flex items-center gap-2"
                  style={{ backgroundColor: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)" }}
                >
                  <span style={{ color: "#f59e0b" }}>→</span>
                  <p className="text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>{u}</p>
                </li>
              ))}
            </ul>
          </section>

          {/* HELP NUDGE — leverages Ask Consultant */}
          <GlassCard accent padding="p-5" rounded="rounded-2xl" as="section">
            <div className="flex items-center gap-4 flex-wrap">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #8B5CF6, #6D28D9)" }}
              >
                <MessageCircle className="w-5 h-5" style={{ color: "white" }} />
              </div>
              <div className="flex-1 min-w-[200px]">
                <p className="text-sm font-bold" style={{ color: "#ffffff" }}>
                  Not sure if {f.title} is for you?
                </p>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.65)" }}>
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
            </div>
          </GlassCard>

          {/* FINAL CTA */}
          <GlassCard accent padding="p-8" rounded="rounded-2xl" as="section">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2" style={{ color: "#ffffff" }}>
                Try {f.title} free.
              </h2>
              <p className="text-sm mb-5" style={{ color: "rgba(255,255,255,0.65)" }}>
                7-day Pro trial. No card. Every AI feature in MarketHub included.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold"
                  style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#1C1814" }}
                >
                  Start free trial
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/features"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold"
                  style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "#ffffff", border: "1px solid rgba(255,255,255,0.12)" }}
                >
                  See all features
                </Link>
              </div>
            </div>
          </GlassCard>
        </main>

        <footer className="px-6 py-6 text-center text-[11px]" style={{ color: "rgba(255,255,255,0.35)", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          © 2026 MarketHub Pro — <Link href="/privacy" className="underline">Privacy</Link> · <Link href="/terms" className="underline">Terms</Link>
        </footer>
      </div>
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
        background: "linear-gradient(135deg, rgba(245,158,11,0.1), rgba(139,92,246,0.1))",
        border: "1px solid rgba(255,255,255,0.1)",
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
          <p className="text-[10px] uppercase tracking-wider font-bold" style={{ color: "rgba(255,255,255,0.35)" }}>
            Demo coming soon
          </p>
        </div>
      </div>
    </div>
  );
}
