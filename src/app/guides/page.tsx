import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, Clock } from "lucide-react";
import { GUIDES } from "@/lib/guidesData";

export const metadata: Metadata = {
  title: "Guides — MarketHub Pro",
  description: "Practical how-to guides for MarketHub Pro: batch Instagram posts, clone your voice for Reels, find leads with AI, and more.",
};

export default function GuidesIndexPage() {
  return (
    <div style={{ background: "#FFFCF7", minHeight: "100vh" }}>
      {/* Subtle ambient blobs */}
      <div style={{ position: "fixed", top: 0, left: 0, width: "600px", height: "600px", background: "radial-gradient(circle, rgba(245,158,11,0.06) 0%, transparent 70%)", zIndex: 0, pointerEvents: "none" }} />
      <div style={{ position: "fixed", bottom: 0, right: 0, width: "500px", height: "500px", background: "radial-gradient(circle, rgba(245,215,160,0.12) 0%, transparent 70%)", zIndex: 0, pointerEvents: "none" }} />

      <div style={{ position: "relative", zIndex: 10 }}>
        <header className="px-4 md:px-6 py-4 flex items-center gap-3" style={{ borderBottom: "1px solid rgba(245,215,160,0.25)" }}>
          <Link href="/" className="text-sm font-bold" style={{ color: "#F59E0B" }}>
            MarketHub Pro
          </Link>
          <Link href="/features" className="text-xs ml-2" style={{ color: "#A8967E" }}>Features</Link>
          <div className="flex-1" />
          <Link href="/login" className="text-xs" style={{ color: "#A8967E" }}>Sign in</Link>
          <Link href="/register">
            <button className="px-3 py-1.5 text-sm font-semibold rounded-lg" style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)", color: "white" }}>
              Start free
            </button>
          </Link>
        </header>

        <main className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-10 space-y-8">
          <section className="text-center space-y-3">
            <span
              className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide px-2 py-1 rounded-full"
              style={{ backgroundColor: "rgba(245,158,11,0.1)", color: "#F59E0B" }}
            >
              <BookOpen className="w-3 h-3" />
              Practical guides
            </span>
            <h1
              className="text-3xl md:text-4xl lg:text-5xl font-bold"
              style={{ background: "linear-gradient(135deg, #D97706, #F59E0B, #B45309)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
            >
              Step-by-step playbooks.
            </h1>
            <p className="text-sm md:text-base max-w-2xl mx-auto" style={{ color: "#A8967E", lineHeight: 1.5 }}>
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
                <div
                  className="rounded-xl p-4 md:p-5"
                  style={{
                    background: "white",
                    border: "1px solid rgba(245,215,160,0.25)",
                    boxShadow: "0 1px 3px rgba(120,97,78,0.08)",
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 text-[10px]" style={{ color: "#C4AA8A" }}>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {g.reading_minutes} min
                        </span>
                        <span>·</span>
                        <span>{g.audience}</span>
                      </div>
                      <p className="text-sm md:text-base font-bold" style={{ color: "#2D2620" }}>{g.title}</p>
                      <p className="text-xs" style={{ color: "#A8967E", lineHeight: 1.5 }}>{g.tagline}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 flex-shrink-0 mt-1" style={{ color: "#F59E0B" }} />
                  </div>
                </div>
              </Link>
            ))}
          </section>

          <div
            className="rounded-2xl p-5 md:p-6"
            style={{
              background: "linear-gradient(135deg, rgba(245,158,11,0.08), rgba(217,119,6,0.05))",
              border: "1px solid rgba(245,158,11,0.2)",
            }}
          >
            <div className="text-center">
              <p className="text-sm" style={{ color: "#2D2620" }}>
                Need help with something not in this list? Inside the app, click <strong>Ask consultant</strong> bottom-left — works in any language.
              </p>
              <Link href="/register" className="inline-block mt-3">
                <button className="px-4 py-2 text-sm font-semibold rounded-lg" style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)", color: "white" }}>
                  <span className="inline-flex items-center gap-2">
                    Start free trial
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </button>
              </Link>
            </div>
          </div>
        </main>

        <footer className="px-4 md:px-6 py-6 text-center text-[11px]" style={{ color: "#C4AA8A", borderTop: "1px solid rgba(245,215,160,0.25)" }}>
          © 2026 MarketHub Pro — <Link href="/privacy" className="underline" style={{ color: "#C4AA8A" }}>Privacy</Link> · <Link href="/terms" className="underline" style={{ color: "#C4AA8A" }}>Terms</Link>
        </footer>
      </div>
    </div>
  );
}
