import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Clock, BookOpen, Sparkles, ExternalLink } from "lucide-react";
import { GUIDES, getGuide } from "@/lib/guidesData";
import { getFeature } from "@/lib/featuresData";

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

interface Params { slug: string }

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const g = getGuide(slug);
  if (!g) return { title: "Guide not found" };
  return {
    title: `${g.title} — MarketHub Pro Guides`,
    description: g.tagline,
    keywords: g.seo_keywords,
    openGraph: { title: g.title, description: g.tagline, type: "article" },
  };
}

export default async function GuidePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const g = getGuide(slug);
  if (!g) notFound();
  const feature = getFeature(g.related_feature_slug);

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
          <Link href="/guides" className="text-xs ml-2" style={{ color: "#A8967E" }}>← All guides</Link>
          <div className="flex-1" />
          <Link href="/login" className="text-xs" style={{ color: "#A8967E" }}>Sign in</Link>
          <Link href="/register">
            <button className="px-3 py-1.5 text-sm font-semibold rounded-lg" style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)", color: "white" }}>
              Start free
            </button>
          </Link>
        </header>

        <main className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-10 space-y-8">
          {/* Hero */}
          <article className="space-y-3">
            <div className="flex items-center gap-2 text-xs" style={{ color: "#C4AA8A" }}>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full"
                style={{ backgroundColor: "rgba(245,158,11,0.1)", color: "#F59E0B" }}>
                <BookOpen className="w-3 h-3" />
                Guide
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {g.reading_minutes} min read
              </span>
              <span>·</span>
              <span>For {g.audience}</span>
            </div>
            <h1
              className="text-2xl md:text-3xl lg:text-4xl font-bold leading-tight"
              style={{ color: "#2D2620" }}
            >
              {g.title}
            </h1>
            <p className="text-sm md:text-base" style={{ color: "#A8967E", lineHeight: 1.6 }}>
              {g.intro}
            </p>
          </article>

          {/* Steps */}
          <section className="space-y-4">
            {g.steps.map((s, i) => (
              <div
                key={i}
                className="rounded-xl p-4 md:p-5"
                style={{
                  background: "white",
                  border: "1px solid rgba(245,215,160,0.25)",
                  boxShadow: "0 1px 3px rgba(120,97,78,0.08)",
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                    style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)", color: "white" }}
                  >
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <h3 className="text-sm md:text-base font-bold" style={{ color: "#2D2620" }}>{s.heading}</h3>
                    <p className="text-xs md:text-sm" style={{ color: "#A8967E", lineHeight: 1.6 }}>{s.body}</p>
                  </div>
                </div>
              </div>
            ))}
          </section>

          {/* Pro tip */}
          {g.pro_tip && (
            <div
              className="rounded-2xl p-4 md:p-5"
              style={{
                background: "linear-gradient(135deg, rgba(245,158,11,0.08), rgba(217,119,6,0.05))",
                border: "1px solid rgba(245,158,11,0.2)",
              }}
            >
              <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: "#F59E0B" }}>
                <Sparkles className="w-3 h-3 inline mr-1" />
                Pro tip
              </p>
              <p className="text-xs md:text-sm" style={{ color: "#A8967E", lineHeight: 1.5 }}>
                {g.pro_tip}
              </p>
            </div>
          )}

          {/* In-app CTA */}
          <div
            className="rounded-2xl p-4 md:p-5"
            style={{
              background: "linear-gradient(135deg, rgba(245,158,11,0.08), rgba(217,119,6,0.05))",
              border: "1px solid rgba(245,158,11,0.2)",
            }}
          >
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <p className="text-sm font-bold" style={{ color: "#2D2620" }}>Ready to do this in your account?</p>
                {feature && (
                  <p className="text-xs mt-1" style={{ color: "#A8967E" }}>
                    Open {feature.title} now — or read the full feature page to learn what it can do.
                  </p>
                )}
              </div>
              <Link href={g.related_app_path}>
                <button className="px-4 py-2 text-sm font-semibold rounded-lg" style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)", color: "white" }}>
                  <span className="inline-flex items-center gap-2">
                    {g.cta_label}
                    <ExternalLink className="w-3.5 h-3.5" />
                  </span>
                </button>
              </Link>
              {feature && (
                <Link href={`/features/${feature.slug}`}>
                  <button className="px-4 py-2 text-sm font-semibold rounded-lg" style={{ background: "transparent", border: "1px solid rgba(245,215,160,0.4)", color: "#2D2620" }}>
                    <span className="inline-flex items-center gap-2">
                      Feature page
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </button>
                </Link>
              )}
            </div>
          </div>

          {/* Other guides */}
          <section className="pt-6" style={{ borderTop: "1px solid rgba(245,215,160,0.25)" }}>
            <p className="text-sm font-bold mb-3" style={{ color: "#2D2620" }}>More guides</p>
            <div className="space-y-2">
              {GUIDES.filter((other) => other.slug !== g.slug).slice(0, 3).map((other) => (
                <Link
                  key={other.slug}
                  href={`/guides/${other.slug}`}
                  className="block transition-all hover:scale-[1.005]"
                >
                  <div
                    className="rounded-lg p-3"
                    style={{
                      background: "white",
                      border: "1px solid rgba(245,215,160,0.25)",
                      boxShadow: "0 1px 3px rgba(120,97,78,0.08)",
                    }}
                  >
                    <p className="text-sm font-bold" style={{ color: "#2D2620" }}>{other.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: "#A8967E" }}>{other.tagline}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </main>

        <footer className="px-4 md:px-6 py-6 text-center text-[11px]" style={{ color: "#C4AA8A", borderTop: "1px solid rgba(245,215,160,0.25)" }}>
          © 2026 MarketHub Pro — <Link href="/privacy" className="underline" style={{ color: "#C4AA8A" }}>Privacy</Link> · <Link href="/terms" className="underline" style={{ color: "#C4AA8A" }}>Terms</Link>
        </footer>
      </div>
    </div>
  );
}
