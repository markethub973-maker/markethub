import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Clock, BookOpen, Sparkles, ExternalLink } from "lucide-react";
import { GUIDES, getGuide } from "@/lib/guidesData";
import { getFeature } from "@/lib/featuresData";
import GlassCard from "@/components/ui/GlassCard";
import GlassButton from "@/components/ui/GlassButton";

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
          <Link href="/guides" className="text-xs ml-2" style={{ color: "rgba(255,255,255,0.5)" }}>← All guides</Link>
          <div className="flex-1" />
          <Link href="/login" className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>Sign in</Link>
          <Link href="/register">
            <GlassButton size="sm">Start free</GlassButton>
          </Link>
        </header>

        <main className="max-w-3xl mx-auto px-6 py-10 space-y-8">
          {/* Hero */}
          <article className="space-y-3">
            <div className="flex items-center gap-2 text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full"
                style={{ backgroundColor: "rgba(245,158,11,0.15)", color: "#f59e0b" }}>
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
            <h1 className="text-3xl md:text-4xl font-bold leading-tight text-white">
              {g.title}
            </h1>
            <p className="text-base" style={{ color: "rgba(255,255,255,0.65)", lineHeight: 1.6 }}>
              {g.intro}
            </p>
          </article>

          {/* Steps */}
          <section className="space-y-4">
            {g.steps.map((s, i) => (
              <GlassCard key={i} padding="p-5" rounded="rounded-xl">
                <div className="flex items-start gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                    style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "white" }}
                  >
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <h3 className="text-base font-bold text-white">{s.heading}</h3>
                    <p className="text-sm" style={{ color: "rgba(255,255,255,0.65)", lineHeight: 1.6 }}>{s.body}</p>
                  </div>
                </div>
              </GlassCard>
            ))}
          </section>

          {/* Pro tip */}
          {g.pro_tip && (
            <GlassCard accent padding="p-5" rounded="rounded-2xl">
              <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: "#f59e0b" }}>
                <Sparkles className="w-3 h-3 inline mr-1" />
                Pro tip
              </p>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.65)", lineHeight: 1.5 }}>
                {g.pro_tip}
              </p>
            </GlassCard>
          )}

          {/* In-app CTA */}
          <GlassCard accent padding="p-5" rounded="rounded-2xl">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <p className="text-sm font-bold text-white">Ready to do this in your account?</p>
                {feature && (
                  <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>
                    Open {feature.title} now — or read the full feature page to learn what it can do.
                  </p>
                )}
              </div>
              <Link href={g.related_app_path}>
                <GlassButton size="md">
                  <span className="inline-flex items-center gap-2">
                    {g.cta_label}
                    <ExternalLink className="w-3.5 h-3.5" />
                  </span>
                </GlassButton>
              </Link>
              {feature && (
                <Link href={`/features/${feature.slug}`}>
                  <GlassButton variant="secondary" size="md">
                    <span className="inline-flex items-center gap-2">
                      Feature page
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </GlassButton>
                </Link>
              )}
            </div>
          </GlassCard>

          {/* Other guides */}
          <section className="pt-6" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-sm font-bold mb-3 text-white">More guides</p>
            <div className="space-y-2">
              {GUIDES.filter((other) => other.slug !== g.slug).slice(0, 3).map((other) => (
                <Link
                  key={other.slug}
                  href={`/guides/${other.slug}`}
                  className="block transition-all hover:scale-[1.005]"
                >
                  <GlassCard padding="p-3" rounded="rounded-lg">
                    <p className="text-sm font-bold text-white">{other.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>{other.tagline}</p>
                  </GlassCard>
                </Link>
              ))}
            </div>
          </section>
        </main>

        <footer className="px-6 py-6 text-center text-[11px]" style={{ color: "rgba(255,255,255,0.35)", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          © 2026 MarketHub Pro — <Link href="/privacy" className="underline" style={{ color: "rgba(255,255,255,0.35)" }}>Privacy</Link> · <Link href="/terms" className="underline" style={{ color: "rgba(255,255,255,0.35)" }}>Terms</Link>
        </footer>
      </div>
    </div>
  );
}
