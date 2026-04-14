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
    <div className="min-h-screen" style={{ backgroundColor: "#FFFCF7" }}>
      <header className="px-6 py-4 flex items-center gap-3" style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
        <Link href="/" className="text-sm font-bold" style={{ color: "#292524" }}>
          <span style={{ color: "#F59E0B" }}>MarketHub Pro</span>
        </Link>
        <Link href="/guides" className="text-xs ml-2" style={{ color: "#78614E" }}>← All guides</Link>
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

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        {/* Hero */}
        <article className="space-y-3">
          <div className="flex items-center gap-2 text-xs" style={{ color: "#78614E" }}>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full"
              style={{ backgroundColor: "rgba(245,158,11,0.1)", color: "#D97706" }}>
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
          <h1 className="text-3xl md:text-4xl font-bold leading-tight" style={{ color: "#292524" }}>
            {g.title}
          </h1>
          <p className="text-base" style={{ color: "#78614E", lineHeight: 1.6 }}>
            {g.intro}
          </p>
        </article>

        {/* Steps */}
        <section className="space-y-4">
          {g.steps.map((s, i) => (
            <div
              key={i}
              className="rounded-xl p-5"
              style={{ backgroundColor: "white", border: "1px solid rgba(0,0,0,0.06)" }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)", color: "white" }}
                >
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <h3 className="text-base font-bold" style={{ color: "#292524" }}>{s.heading}</h3>
                  <p className="text-sm" style={{ color: "#292524", lineHeight: 1.6 }}>{s.body}</p>
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* Pro tip */}
        {g.pro_tip && (
          <section
            className="rounded-2xl p-5"
            style={{ backgroundColor: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.25)" }}
          >
            <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: "#D97706" }}>
              <Sparkles className="w-3 h-3 inline mr-1" />
              Pro tip
            </p>
            <p className="text-sm" style={{ color: "#292524", lineHeight: 1.5 }}>
              {g.pro_tip}
            </p>
          </section>
        )}

        {/* In-app CTA */}
        <section
          className="rounded-2xl p-5 flex items-center gap-4 flex-wrap"
          style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.08), rgba(139,92,246,0.08))", border: "1px solid rgba(245,158,11,0.2)" }}
        >
          <div className="flex-1 min-w-[200px]">
            <p className="text-sm font-bold" style={{ color: "#292524" }}>Ready to do this in your account?</p>
            {feature && (
              <p className="text-xs mt-1" style={{ color: "#78614E" }}>
                Open {feature.title} now — or read the full feature page to learn what it can do.
              </p>
            )}
          </div>
          <Link
            href={g.related_app_path}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold"
            style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)", color: "#1C1814" }}
          >
            {g.cta_label}
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
          {feature && (
            <Link
              href={`/features/${feature.slug}`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold"
              style={{ backgroundColor: "white", color: "#292524", border: "1px solid rgba(0,0,0,0.08)" }}
            >
              Feature page
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </section>

        {/* Other guides */}
        <section className="pt-6 border-t" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
          <p className="text-sm font-bold mb-3" style={{ color: "#292524" }}>More guides</p>
          <div className="space-y-2">
            {GUIDES.filter((other) => other.slug !== g.slug).slice(0, 3).map((other) => (
              <Link
                key={other.slug}
                href={`/guides/${other.slug}`}
                className="block rounded-lg p-3 transition-all hover:scale-[1.005]"
                style={{ backgroundColor: "white", border: "1px solid rgba(0,0,0,0.06)" }}
              >
                <p className="text-sm font-bold" style={{ color: "#292524" }}>{other.title}</p>
                <p className="text-xs mt-0.5" style={{ color: "#78614E" }}>{other.tagline}</p>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <footer className="px-6 py-6 text-center text-[11px]" style={{ color: "#A8967E", borderTop: "1px solid rgba(0,0,0,0.05)" }}>
        © 2026 MarketHub Pro — <Link href="/privacy" className="underline">Privacy</Link> · <Link href="/terms" className="underline">Terms</Link>
      </footer>
    </div>
  );
}
