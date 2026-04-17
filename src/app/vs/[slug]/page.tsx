import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check, X, Minus, MessageCircle } from "lucide-react";
import { COMPARISONS, getComparison } from "@/lib/comparisonsData";
import GlassCard from "@/components/ui/GlassCard";

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
  if (value === "yes")     return <Check className="w-4 h-4" style={{ color: '#f59e0b' }} />;
  if (value === "no")      return <X className="w-4 h-4" style={{ color: '#f87171' }} />;
  return                          <Minus className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.35)' }} />;
}

export default async function ComparisonPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const cmp = getComparison(slug);
  if (!cmp) notFound();

  return (
    <div style={{ background: 'linear-gradient(135deg, #0d0b1e 0%, #1a0a2e 40%, #0a1628 100%)', minHeight: '100vh' }}>
      {/* Ambient blobs */}
      <div style={{ position: 'fixed', top: '-10vh', left: '-8vw', width: '45vw', height: '45vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,85,247,0.18), transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', bottom: '-10vh', right: '-8vw', width: '40vw', height: '40vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,158,11,0.15), transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', top: '30vh', left: '35vw', width: '30vw', height: '30vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.1), transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 10 }}>
        <header className="px-6 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <Link href="/" className="text-sm font-bold flex items-center gap-2" style={{ color: 'white' }}>
            <span style={{ color: '#f59e0b' }}>MarketHub Pro</span>
          </Link>
          <Link href="/features" className="text-xs ml-2" style={{ color: 'rgba(255,255,255,0.5)' }}>Features</Link>
          <div className="flex-1" />
          <Link href="/login" className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Sign in</Link>
          <Link
            href="/register"
            className="text-xs font-bold px-3 py-1.5 rounded-md"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#1C1814' }}
          >
            Start free
          </Link>
        </header>

        <main className="max-w-5xl mx-auto px-6 py-10 space-y-12">
          {/* HERO */}
          <section className="text-center space-y-5 max-w-3xl mx-auto">
            <span
              className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide px-2 py-1 rounded-full"
              style={{ backgroundColor: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}
            >
              MarketHub Pro vs {cmp.competitor_name}
            </span>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight" style={{ color: 'white' }}>
              {cmp.hero_h1}
            </h1>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>
              {cmp.hero_pain}
            </p>
            <div className="flex flex-wrap gap-3 justify-center pt-2">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#1C1814' }}
              >
                Start free trial
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/features"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                Browse all features
              </Link>
            </div>
          </section>

          {/* CREDIT TO COMPETITOR */}
          <GlassCard>
            <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Credit where it's due
            </p>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>
              {cmp.competitor_strength}
            </p>
          </GlassCard>

          {/* WHY SWITCH */}
          <section>
            <h2 className="text-2xl font-bold mb-4" style={{ color: 'white' }}>
              Why people switch from {cmp.competitor_name}
            </h2>
            <ul className="space-y-3">
              {cmp.why_switch_bullets.map((b, i) => (
                <li key={i}>
                  <GlassCard className="flex items-start gap-3">
                    <span
                      className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ backgroundColor: 'rgba(245,158,11,0.2)', color: '#f59e0b' }}
                    >
                      {i + 1}
                    </span>
                    <p className="text-sm" style={{ color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>{b}</p>
                  </GlassCard>
                </li>
              ))}
            </ul>
          </section>

          {/* FEATURE TABLE */}
          <section>
            <h2 className="text-2xl font-bold mb-4" style={{ color: 'white' }}>
              Side-by-side comparison
            </h2>
            <GlassCard padding="p-0" className="overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <th className="text-left px-4 py-3 font-bold" style={{ color: 'white' }}>Feature</th>
                    <th className="text-center px-4 py-3 font-bold" style={{ color: '#f59e0b' }}>MarketHub</th>
                    <th className="text-center px-4 py-3 font-bold" style={{ color: 'rgba(255,255,255,0.35)' }}>{cmp.competitor_name}</th>
                  </tr>
                </thead>
                <tbody>
                  {cmp.feature_table.map((row, i) => (
                    <tr
                      key={i}
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <td className="px-4 py-3" style={{ color: 'rgba(255,255,255,0.65)' }}>
                        <div>{row.feature}</div>
                        {row.note && (
                          <div className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{row.note}</div>
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
            </GlassCard>
            <p className="text-[11px] mt-2 flex items-center gap-3 flex-wrap" style={{ color: 'rgba(255,255,255,0.35)' }}>
              <span><Check className="w-3 h-3 inline" style={{ color: '#f59e0b' }} /> built-in</span>
              <span><Minus className="w-3 h-3 inline" style={{ color: 'rgba(255,255,255,0.35)' }} /> partial / paid add-on</span>
              <span><X className="w-3 h-3 inline" style={{ color: '#f87171' }} /> not available</span>
            </p>
          </section>

          {/* PRICING NOTE */}
          <GlassCard>
            <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: '#f59e0b' }}>
              Pricing reality check
            </p>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>
              {cmp.pricing_note}
            </p>
          </GlassCard>

          {/* MIGRATION HELP */}
          <GlassCard>
            <div className="flex items-start gap-4">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)' }}
              >
                <MessageCircle className="w-5 h-5" style={{ color: 'white' }} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold" style={{ color: 'white' }}>
                  Switching from {cmp.competitor_name}? We'll make it painless.
                </p>
                <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  {cmp.migration_help}
                </p>
                <p className="text-[11px] mt-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  Open the app, click <strong>Ask consultant</strong> bottom-left — paste your {cmp.competitor_name} export and we'll tell you exactly how to import.
                </p>
              </div>
            </div>
          </GlassCard>

          {/* FINAL CTA */}
          <GlassCard>
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2" style={{ color: 'white' }}>
                Try MarketHub Pro free for 7 days.
              </h2>
              <p className="text-sm mb-5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Keep your {cmp.competitor_name} subscription running. If we're not better in 7 days, cancel ours.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold"
                  style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#1C1814' }}
                >
                  Start free trial
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/features"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  See every feature
                </Link>
              </div>
            </div>
          </GlassCard>

          {/* CROSS-LINKS */}
          <section className="text-center">
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Comparing other tools?
              {" "}
              {COMPARISONS.filter((c) => c.slug !== cmp.slug).map((c, i) => (
                <span key={c.slug}>
                  {i > 0 && " · "}
                  <Link href={`/vs/${c.slug}`} className="underline" style={{ color: '#f59e0b' }}>
                    vs {c.competitor_name}
                  </Link>
                </span>
              ))}
            </p>
          </section>
        </main>

        <footer className="px-6 py-6 text-center text-[11px]" style={{ color: 'rgba(255,255,255,0.35)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          © 2026 MarketHub Pro — <Link href="/privacy" className="underline">Privacy</Link> · <Link href="/terms" className="underline">Terms</Link>
        </footer>
      </div>
    </div>
  );
}
