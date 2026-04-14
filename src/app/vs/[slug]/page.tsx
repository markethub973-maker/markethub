import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check, X, Minus, MessageCircle } from "lucide-react";
import { COMPARISONS, getComparison } from "@/lib/comparisonsData";

export function generateStaticParams() {
  return COMPARISONS.map((c) => ({ slug: c.slug }));
}

interface Params { slug: string }

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const c = getComparison(slug);
  if (!c) return { title: "Comparison not found" };
  return {
    title: `MarketHub Pro vs ${c.competitor_name} — honest comparison`,
    description: c.hero_pain,
    keywords: c.seo_keywords,
    openGraph: {
      title: c.hero_h1,
      description: c.hero_pain,
      type: "website",
    },
  };
}

function StatusIcon({ value }: { value: "yes" | "no" | "partial" }) {
  if (value === "yes")     return <Check className="w-4 h-4" style={{ color: "#10B981" }} />;
  if (value === "no")      return <X className="w-4 h-4" style={{ color: "#EF4444" }} />;
  return                          <Minus className="w-4 h-4" style={{ color: "var(--color-primary)" }} />;
}

export default async function ComparisonPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const cmp = getComparison(slug);
  if (!cmp) notFound();

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--color-bg-secondary)" }}>
      <header className="px-6 py-4 flex items-center gap-3" style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
        <Link href="/" className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--color-text)" }}>
          <span style={{ color: "var(--color-primary)" }}>MarketHub Pro</span>
        </Link>
        <Link href="/features" className="text-xs ml-2" style={{ color: "#78614E" }}>Features</Link>
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
        <section className="text-center space-y-5 max-w-3xl mx-auto">
          <span
            className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide px-2 py-1 rounded-full"
            style={{ backgroundColor: "rgba(245,158,11,0.1)", color: "var(--color-primary-hover)" }}
          >
            MarketHub Pro vs {cmp.competitor_name}
          </span>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight" style={{ color: "var(--color-text)" }}>
            {cmp.hero_h1}
          </h1>
          <p className="text-lg max-w-2xl mx-auto" style={{ color: "#78614E", lineHeight: 1.5 }}>
            {cmp.hero_pain}
          </p>
          <div className="flex flex-wrap gap-3 justify-center pt-2">
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
              Browse all features
            </Link>
          </div>
        </section>

        {/* CREDIT TO COMPETITOR — builds trust */}
        <section
          className="rounded-2xl p-5"
          style={{ backgroundColor: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.06)" }}
        >
          <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: "#78614E" }}>
            Credit where it's due
          </p>
          <p className="text-sm" style={{ color: "var(--color-text)", lineHeight: 1.5 }}>
            {cmp.competitor_strength}
          </p>
        </section>

        {/* WHY SWITCH */}
        <section>
          <h2 className="text-2xl font-bold mb-4" style={{ color: "var(--color-text)" }}>
            Why people switch from {cmp.competitor_name}
          </h2>
          <ul className="space-y-3">
            {cmp.why_switch_bullets.map((b, i) => (
              <li
                key={i}
                className="rounded-lg p-4 flex items-start gap-3"
                style={{ backgroundColor: "white", border: "1px solid rgba(0,0,0,0.06)" }}
              >
                <span
                  className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ backgroundColor: "rgba(245,158,11,0.15)", color: "var(--color-primary-hover)" }}
                >
                  {i + 1}
                </span>
                <p className="text-sm" style={{ color: "var(--color-text)", lineHeight: 1.5 }}>{b}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* FEATURE TABLE */}
        <section>
          <h2 className="text-2xl font-bold mb-4" style={{ color: "var(--color-text)" }}>
            Side-by-side comparison
          </h2>
          <div
            className="rounded-xl overflow-hidden"
            style={{ backgroundColor: "white", border: "1px solid rgba(0,0,0,0.06)" }}
          >
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: "rgba(0,0,0,0.03)" }}>
                  <th className="text-left px-4 py-3 font-bold" style={{ color: "var(--color-text)" }}>Feature</th>
                  <th className="text-center px-4 py-3 font-bold" style={{ color: "var(--color-primary-hover)" }}>MarketHub</th>
                  <th className="text-center px-4 py-3 font-bold" style={{ color: "#78614E" }}>{cmp.competitor_name}</th>
                </tr>
              </thead>
              <tbody>
                {cmp.feature_table.map((row, i) => (
                  <tr
                    key={i}
                    style={{ borderTop: "1px solid rgba(0,0,0,0.05)" }}
                  >
                    <td className="px-4 py-3" style={{ color: "var(--color-text)" }}>
                      <div>{row.feature}</div>
                      {row.note && (
                        <div className="text-[10px] mt-0.5" style={{ color: "#A8967E" }}>{row.note}</div>
                      )}
                    </td>
                    <td className="text-center px-4 py-3">
                      <StatusIcon value={row.us} />
                    </td>
                    <td className="text-center px-4 py-3">
                      <StatusIcon value={row.them} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] mt-2 flex items-center gap-3 flex-wrap" style={{ color: "#A8967E" }}>
            <span><Check className="w-3 h-3 inline" style={{ color: "#10B981" }} /> built-in</span>
            <span><Minus className="w-3 h-3 inline" style={{ color: "var(--color-primary)" }} /> partial / paid add-on</span>
            <span><X className="w-3 h-3 inline" style={{ color: "#EF4444" }} /> not available</span>
          </p>
        </section>

        {/* PRICING NOTE */}
        <section
          className="rounded-2xl p-5"
          style={{ backgroundColor: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.2)" }}
        >
          <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: "var(--color-primary-hover)" }}>
            Pricing reality check
          </p>
          <p className="text-sm" style={{ color: "var(--color-text)", lineHeight: 1.5 }}>
            {cmp.pricing_note}
          </p>
        </section>

        {/* MIGRATION HELP */}
        <section
          className="rounded-2xl p-5 flex items-start gap-4"
          style={{ backgroundColor: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.2)" }}
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #8B5CF6, #6D28D9)" }}
          >
            <MessageCircle className="w-5 h-5" style={{ color: "white" }} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
              Switching from {cmp.competitor_name}? We'll make it painless.
            </p>
            <p className="text-xs mt-1" style={{ color: "#78614E" }}>
              {cmp.migration_help}
            </p>
            <p className="text-[11px] mt-2" style={{ color: "#78614E" }}>
              Open the app, click <strong>Ask consultant</strong> bottom-left — paste your {cmp.competitor_name} export and we'll tell you exactly how to import.
            </p>
          </div>
        </section>

        {/* FINAL CTA */}
        <section
          className="rounded-2xl p-8 text-center"
          style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.08), rgba(139,92,246,0.08))", border: "1px solid rgba(245,158,11,0.2)" }}
        >
          <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--color-text)" }}>
            Try MarketHub Pro free for 7 days.
          </h2>
          <p className="text-sm mb-5" style={{ color: "#78614E" }}>
            Keep your {cmp.competitor_name} subscription running. If we're not better in 7 days, cancel ours.
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
              See every feature
            </Link>
          </div>
        </section>

        {/* CROSS-LINKS */}
        <section className="text-center">
          <p className="text-xs" style={{ color: "#A8967E" }}>
            Comparing other tools?
            {" "}
            {COMPARISONS.filter((c) => c.slug !== cmp.slug).map((c, i) => (
              <span key={c.slug}>
                {i > 0 && " · "}
                <Link href={`/vs/${c.slug}`} className="underline" style={{ color: "var(--color-primary-hover)" }}>
                  vs {c.competitor_name}
                </Link>
              </span>
            ))}
          </p>
        </section>
      </main>

      <footer className="px-6 py-6 text-center text-[11px]" style={{ color: "#A8967E", borderTop: "1px solid rgba(0,0,0,0.05)" }}>
        © 2026 MarketHub Pro — <Link href="/privacy" className="underline">Privacy</Link> · <Link href="/terms" className="underline">Terms</Link>
      </footer>
    </div>
  );
}
