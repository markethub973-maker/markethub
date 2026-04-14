import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FEATURES, FEATURE_CATEGORIES } from "@/lib/featuresData";

export const metadata: Metadata = {
  title: "Features — MarketHub Pro",
  description: "Every AI marketing feature in MarketHub Pro: image, video, audio, voice cloning, captions, hashtags, calendar, lead finder, content gap analysis, and more.",
};

export default function FeaturesIndexPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FFFCF7" }}>
      <header className="px-6 py-4 flex items-center gap-3" style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
        <Link href="/" className="text-sm font-bold flex items-center gap-2" style={{ color: "#292524" }}>
          <span style={{ color: "#F59E0B" }}>MarketHub Pro</span>
        </Link>
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

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-10">
        <section className="text-center space-y-3">
          <h1 className="text-4xl md:text-5xl font-bold" style={{ color: "#292524" }}>
            Every AI feature you need.<br />In one platform.
          </h1>
          <p className="text-lg max-w-2xl mx-auto" style={{ color: "#78614E", lineHeight: 1.5 }}>
            {FEATURES.length} features that replace 10+ tools — image, video, voice cloning, calendar, lead finder, repurposing, hooks, hashtag analysis, and more. All on-brand. All on Pro.
          </p>
          <div className="flex flex-wrap gap-3 justify-center pt-2">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold"
              style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)", color: "#1C1814" }}
            >
              Start free trial
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/promo"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold"
              style={{ backgroundColor: "white", color: "#292524", border: "1px solid rgba(0,0,0,0.08)" }}
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
                <h2 className="text-2xl font-bold" style={{ color: "#292524" }}>{meta.label}</h2>
                <p className="text-sm" style={{ color: "#78614E" }}>{meta.desc}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {items.map((f) => (
                  <Link
                    key={f.slug}
                    href={`/features/${f.slug}`}
                    className="rounded-xl p-5 transition-all hover:scale-[1.01]"
                    style={{ backgroundColor: "white", border: "1px solid rgba(0,0,0,0.06)" }}
                  >
                    <div className="text-3xl mb-2">{f.emoji}</div>
                    <p className="text-sm font-bold mb-1" style={{ color: "#292524" }}>{f.title}</p>
                    <p className="text-xs mb-3" style={{ color: "#78614E", lineHeight: 1.5 }}>{f.tagline}</p>
                    <p className="text-[11px] font-bold inline-flex items-center gap-1" style={{ color: "#D97706" }}>
                      Learn more <ArrowRight className="w-3 h-3" />
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}

        <section
          className="rounded-2xl p-8 text-center"
          style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.08), rgba(139,92,246,0.08))", border: "1px solid rgba(245,158,11,0.2)" }}
        >
          <h2 className="text-2xl font-bold mb-2" style={{ color: "#292524" }}>
            All {FEATURES.length} features. One subscription.
          </h2>
          <p className="text-sm mb-5" style={{ color: "#78614E" }}>
            7-day Pro trial — no credit card. Cancel anytime.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold"
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
