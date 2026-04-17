import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, Clock } from "lucide-react";
import { GUIDES } from "@/lib/guidesData";
import GlassCard from "@/components/ui/GlassCard";
import GlassButton from "@/components/ui/GlassButton";

export const metadata: Metadata = {
  title: "Guides — MarketHub Pro",
  description: "Practical how-to guides for MarketHub Pro: batch Instagram posts, clone your voice for Reels, find leads with AI, and more.",
};

export default function GuidesIndexPage() {
  return (
    <div style={{ background: "linear-gradient(135deg, #0d0b1e 0%, #1a0a2e 40%, #0a1628 100%)", minHeight: "100vh" }}>
      {/* Ambient blobs */}
      <div style={{ position: "fixed", top: 0, left: 0, width: "600px", height: "600px", background: "radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)", zIndex: 0, pointerEvents: "none" }} />
      <div style={{ position: "fixed", bottom: 0, right: 0, width: "500px", height: "500px", background: "radial-gradient(circle, rgba(245,158,11,0.12) 0%, transparent 70%)", zIndex: 0, pointerEvents: "none" }} />
      <div style={{ position: "fixed", top: "40%", left: "50%", width: "400px", height: "400px", background: "radial-gradient(circle, rgba(34,197,94,0.08) 0%, transparent 70%)", transform: "translate(-50%,-50%)", zIndex: 0, pointerEvents: "none" }} />

      <div style={{ position: "relative", zIndex: 10 }}>
        <header className="px-6 py-4 flex items-center gap-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <Link href="/" className="text-sm font-bold" style={{ color: "#f59e0b" }}>
            MarketHub Pro
          </Link>
          <Link href="/features" className="text-xs ml-2" style={{ color: "rgba(255,255,255,0.5)" }}>Features</Link>
          <div className="flex-1" />
          <Link href="/login" className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>Sign in</Link>
          <Link href="/register">
            <GlassButton size="sm">Start free</GlassButton>
          </Link>
        </header>

        <main className="max-w-4xl mx-auto px-6 py-10 space-y-8">
          <section className="text-center space-y-3">
            <span
              className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide px-2 py-1 rounded-full"
              style={{ backgroundColor: "rgba(245,158,11,0.15)", color: "#f59e0b" }}
            >
              <BookOpen className="w-3 h-3" />
              Practical guides
            </span>
            <h1 className="text-4xl md:text-5xl font-bold text-white">
              Step-by-step playbooks.
            </h1>
            <p className="text-base max-w-2xl mx-auto" style={{ color: "rgba(255,255,255,0.65)", lineHeight: 1.5 }}>
              Skim-friendly how-to articles for the most common workflows. Each guide solves ONE specific job in under 5 minutes of reading.
            </p>
          </section>

          <section className="space-y-3">
            {GUIDES.map((g) => (
              <Link
                key={g.slug}
                href={`/guides/${g.slug}`}
                className="block transition-all hover:scale-[1.005]"
              >
                <GlassCard padding="p-5" rounded="rounded-xl">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {g.reading_minutes} min
                        </span>
                        <span>·</span>
                        <span>{g.audience}</span>
                      </div>
                      <p className="text-base font-bold text-white">{g.title}</p>
                      <p className="text-xs" style={{ color: "rgba(255,255,255,0.65)", lineHeight: 1.5 }}>{g.tagline}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 flex-shrink-0 mt-1" style={{ color: "#f59e0b" }} />
                  </div>
                </GlassCard>
              </Link>
            ))}
          </section>

          <GlassCard accent padding="p-6" rounded="rounded-2xl">
            <div className="text-center">
              <p className="text-sm text-white">
                Need help with something not in this list? Inside the app, click <strong>Ask consultant</strong> bottom-left — works in any language.
              </p>
              <Link href="/register" className="inline-block mt-3">
                <GlassButton size="md">
                  <span className="inline-flex items-center gap-2">
                    Start free trial
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </GlassButton>
              </Link>
            </div>
          </GlassCard>
        </main>

        <footer className="px-6 py-6 text-center text-[11px]" style={{ color: "rgba(255,255,255,0.35)", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          © 2026 MarketHub Pro — <Link href="/privacy" className="underline" style={{ color: "rgba(255,255,255,0.35)" }}>Privacy</Link> · <Link href="/terms" className="underline" style={{ color: "rgba(255,255,255,0.35)" }}>Terms</Link>
        </footer>
      </div>
    </div>
  );
}
