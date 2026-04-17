import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FEATURES, FEATURE_CATEGORIES } from "@/lib/featuresData";
import GlassCard from "@/components/ui/GlassCard";

export const metadata: Metadata = {
  title: "Features — MarketHub Pro",
  description: "Every AI marketing feature in MarketHub Pro: image, video, audio, voice cloning, captions, hashtags, calendar, lead finder, content gap analysis, and more.",
};

export default function FeaturesIndexPage() {
  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #0d0b1e 0%, #1a0a2e 40%, #0a1628 100%)" }}>
      {/* Ambient blobs */}
      <div style={{position:'fixed',top:'-10vh',left:'-8vw',width:'45vw',height:'45vw',borderRadius:'50%',background:'radial-gradient(circle,rgba(168,85,247,0.18),transparent 70%)',pointerEvents:'none',zIndex:0}} />
      <div style={{position:'fixed',bottom:'-10vh',right:'-8vw',width:'40vw',height:'40vw',borderRadius:'50%',background:'radial-gradient(circle,rgba(245,158,11,0.15),transparent 70%)',pointerEvents:'none',zIndex:0}} />
      <div style={{position:'fixed',top:'30vh',left:'35vw',width:'30vw',height:'30vw',borderRadius:'50%',background:'radial-gradient(circle,rgba(16,185,129,0.1),transparent 70%)',pointerEvents:'none',zIndex:0}} />

      {/* Content wrapper */}
      <div style={{ position: "relative", zIndex: 10 }}>
        <header className="px-6 py-4 flex items-center gap-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <Link href="/" className="text-sm font-bold flex items-center gap-2" style={{ color: "#ffffff" }}>
            <span style={{ color: "#f59e0b" }}>MarketHub Pro</span>
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

        <main className="max-w-6xl mx-auto px-6 py-10 space-y-10">
          <section className="text-center space-y-3">
            <h1 className="text-4xl md:text-5xl font-bold" style={{ color: "#ffffff" }}>
              Every AI feature you need.<br />In one platform.
            </h1>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: "rgba(255,255,255,0.65)", lineHeight: 1.5 }}>
              {FEATURES.length} features that replace 10+ tools — image, video, voice cloning, calendar, lead finder, repurposing, hooks, hashtag analysis, and more. All on-brand. All on Pro.
            </p>
            <div className="flex flex-wrap gap-3 justify-center pt-2">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold"
                style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#1C1814" }}
              >
                Start free trial
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/promo"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold"
                style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "#ffffff", border: "1px solid rgba(255,255,255,0.12)" }}
              >
                See pricing
              </Link>
            </div>
          </section>

          {(Object.keys(FEATURE_CATEGORIES) as Array<keyof typeof FEATURE_CATEGORIES>).map((cat) => {
            const items = FEATURES.filter((f) => f.category === cat);
            if (items.length === 0) return null;
            const meta = FEATURE_CATEGORIES[cat];
            return (
              <section key={cat} className="space-y-4">
                <div>
                  <h2 className="text-2xl font-bold" style={{ color: "#ffffff" }}>{meta.label}</h2>
                  <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>{meta.desc}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {items.map((f) => (
                    <Link
                      key={f.slug}
                      href={`/features/${f.slug}`}
                      className="block transition-all hover:scale-[1.01]"
                    >
                      <GlassCard padding="p-5">
                        <div className="text-3xl mb-2">{f.emoji}</div>
                        <p className="text-sm font-bold mb-1" style={{ color: "#ffffff" }}>{f.title}</p>
                        <p className="text-xs mb-3" style={{ color: "rgba(255,255,255,0.65)", lineHeight: 1.5 }}>{f.tagline}</p>
                        <p className="text-[11px] font-bold inline-flex items-center gap-1" style={{ color: "#f59e0b" }}>
                          Learn more <ArrowRight className="w-3 h-3" />
                        </p>
                      </GlassCard>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}

          <GlassCard accent padding="p-8" rounded="rounded-2xl" as="section">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2" style={{ color: "#ffffff" }}>
                All {FEATURES.length} features. One subscription.
              </h2>
              <p className="text-sm mb-5" style={{ color: "rgba(255,255,255,0.65)" }}>
                7-day Pro trial — no credit card. Cancel anytime.
              </p>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold"
                style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#1C1814" }}
              >
                Start free trial
                <ArrowRight className="w-4 h-4" />
              </Link>
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
