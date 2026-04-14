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
    <div className="min-h-screen" style={{ backgroundColor: "#FFFCF7" }}>
      <header className="px-6 py-4 flex items-center gap-3" style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
        <Link href="/" className="text-sm font-bold" style={{ color: "#292524" }}>
          <span style={{ color: "#F59E0B" }}>MarketHub Pro</span>
        </Link>
        <Link href="/features" className="text-xs ml-2" style={{ color: "#78614E" }}>Features</Link>
        <div className="flex-1" />
        <Link href="/login" className="text-xs" style={{ color: "#78614E" }}>Sign in</Link>
        <Link
          href="/register"
          className="text-xs font-bold px-3 py-1.5 rounded-md"
          style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)", color: "#1C1814" }}
        >
          Start free
        </Link>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        <section className="text-center space-y-3">
          <span
            className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide px-2 py-1 rounded-full"
            style={{ backgroundColor: "rgba(245,158,11,0.1)", color: "#D97706" }}
          >
            <BookOpen className="w-3 h-3" />
            Practical guides
          </span>
          <h1 className="text-4xl md:text-5xl font-bold" style={{ color: "#292524" }}>
            Step-by-step playbooks.
          </h1>
          <p className="text-base max-w-2xl mx-auto" style={{ color: "#78614E", lineHeight: 1.5 }}>
            Skim-friendly how-to articles for the most common workflows. Each guide solves ONE specific job in under 5 minutes of reading.
          </p>
        </section>

        <section className="space-y-3">
          {GUIDES.map((g) => (
            <Link
              key={g.slug}
              href={`/guides/${g.slug}`}
              className="block rounded-xl p-5 transition-all hover:scale-[1.005]"
              style={{ backgroundColor: "white", border: "1px solid rgba(0,0,0,0.06)" }}
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 text-[10px]" style={{ color: "#78614E" }}>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {g.reading_minutes} min
                    </span>
                    <span>·</span>
                    <span>{g.audience}</span>
                  </div>
                  <p className="text-base font-bold" style={{ color: "#292524" }}>{g.title}</p>
                  <p className="text-xs" style={{ color: "#78614E", lineHeight: 1.5 }}>{g.tagline}</p>
                </div>
                <ArrowRight className="w-4 h-4 flex-shrink-0 mt-1" style={{ color: "#D97706" }} />
              </div>
            </Link>
          ))}
        </section>

        <section
          className="rounded-2xl p-6 text-center"
          style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.08), rgba(139,92,246,0.08))", border: "1px solid rgba(245,158,11,0.2)" }}
        >
          <p className="text-sm" style={{ color: "#292524" }}>
            Need help with something not in this list? Inside the app, click <strong>Ask consultant</strong> bottom-left — works in any language.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 mt-3 px-5 py-2.5 rounded-xl text-sm font-bold"
            style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)", color: "#1C1814" }}
          >
            Start free trial
            <ArrowRight className="w-4 h-4" />
          </Link>
        </section>
      </main>

      <footer className="px-6 py-6 text-center text-[11px]" style={{ color: "#A8967E", borderTop: "1px solid rgba(0,0,0,0.05)" }}>
        © 2026 MarketHub Pro — <Link href="/privacy" className="underline">Privacy</Link> · <Link href="/terms" className="underline">Terms</Link>
      </footer>
    </div>
  );
}
