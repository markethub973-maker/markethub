import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check, Sparkles, Quote } from "lucide-react";
import { USE_CASES, getUseCase, resolveFeaturesForUseCase } from "@/lib/useCasesData";

export function generateStaticParams() {
  return USE_CASES.map((u) => ({ slug: u.slug }));
}

interface Params { slug: string }

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const u = getUseCase(slug);
  if (!u) return { title: "Use case not found" };
  return {
    title: `MarketHub Pro for ${u.audience_label}`,
    description: u.hero_pain,
    keywords: u.seo_keywords,
    openGraph: {
      title: u.hero_h1,
      description: u.hero_pain,
      type: "website",
    },
  };
}

export default async function UseCasePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const uc = getUseCase(slug);
  if (!uc) notFound();
  const features = resolveFeaturesForUseCase(uc);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FFFCF7" }}>
      <header className="px-6 py-4 flex items-center gap-3" style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
        <Link href="/" className="text-sm font-bold flex items-center gap-2" style={{ color: "#292524" }}>
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

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-12">
        {/* HERO */}
        <section className="text-center space-y-5 max-w-3xl mx-auto">
          <span
            className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide px-2 py-1 rounded-full"
            style={{ backgroundColor: "rgba(245,158,11,0.1)", color: "#D97706" }}
          >
            <span>{uc.hero_emoji}</span>
            For {uc.audience_label}
          </span>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight" style={{ color: "#292524" }}>
            {uc.hero_h1}
          </h1>
          <p className="text-lg max-w-2xl mx-auto" style={{ color: "#78614E", lineHeight: 1.5 }}>
            {uc.hero_pain}
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
              href="/features"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold"
              style={{ backgroundColor: "white", color: "#292524", border: "1px solid rgba(0,0,0,0.08)" }}
            >
              Browse all features
            </Link>
          </div>
        </section>

        {/* METRIC STRIP */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {uc.metric_strip.map((m, i) => (
            <div
              key={i}
              className="rounded-xl p-4 text-center"
              style={{ backgroundColor: "white", border: "1px solid rgba(0,0,0,0.06)" }}
            >
              <p className="text-2xl font-bold" style={{ color: "#D97706" }}>{m.num}</p>
              <p className="text-xs mt-1" style={{ color: "#78614E", lineHeight: 1.4 }}>{m.label}</p>
            </div>
          ))}
        </section>

        {/* PAIN BULLETS */}
        <section
          className="rounded-2xl p-6 space-y-3"
          style={{ backgroundColor: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.15)" }}
        >
          <p className="text-sm font-bold" style={{ color: "#B91C1C" }}>
            Sound familiar?
          </p>
          <ul className="space-y-2">
            {uc.pain_bullets.map((p, i) => (
              <li key={i} className="text-sm flex items-start gap-2" style={{ color: "#292524" }}>
                <span className="flex-shrink-0 mt-0.5" style={{ color: "#EF4444" }}>•</span>
                {p}
              </li>
            ))}
          </ul>
        </section>

        {/* FEATURES CURATED */}
        <section>
          <h2 className="text-2xl font-bold mb-2" style={{ color: "#292524" }}>
            Built for the way {uc.audience_label.toLowerCase()} actually work
          </h2>
          <p className="text-sm mb-5" style={{ color: "#78614E" }}>
            {features.length} features, hand-picked for your workflow:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {features.map((f) => (
              <Link
                key={f.slug}
                href={`/features/${f.slug}`}
                className="rounded-xl p-4 transition-all hover:scale-[1.01] flex items-start gap-3"
                style={{ backgroundColor: "white", border: "1px solid rgba(0,0,0,0.06)" }}
              >
                <div className="text-2xl flex-shrink-0">{f.emoji}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold" style={{ color: "#292524" }}>{f.title}</p>
                  <p className="text-xs mt-1" style={{ color: "#78614E", lineHeight: 1.5 }}>{f.tagline}</p>
                  <p className="text-[11px] font-bold mt-2 inline-flex items-center gap-1" style={{ color: "#D97706" }}>
                    Learn more <ArrowRight className="w-3 h-3" />
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* TESTIMONIAL */}
        <section
          className="rounded-2xl p-6 flex items-start gap-4"
          style={{ backgroundColor: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.2)" }}
        >
          <Quote className="w-6 h-6 flex-shrink-0" style={{ color: "#D97706" }} />
          <div className="flex-1">
            <p className="text-base italic" style={{ color: "#292524", lineHeight: 1.5 }}>
              {uc.testimonial_block.quote}
            </p>
            <p className="text-xs mt-2" style={{ color: "#78614E" }}>
              {uc.testimonial_block.attribution}
            </p>
          </div>
        </section>

        {/* WHAT'S INCLUDED */}
        <section
          className="rounded-2xl p-6"
          style={{ backgroundColor: "white", border: "1px solid rgba(0,0,0,0.06)" }}
        >
          <p className="text-sm font-bold mb-3" style={{ color: "#292524" }}>
            What's included on every Pro plan
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {[
              "All 19 AI features (image, video, audio, captions, hashtags, hooks…)",
              "Calendar with auto-publish to 5 platforms",
              "Public REST API + 10 webhook events",
              "Brand Voice + Content Strategy that compounds with every feature",
              "Asset Library with one-click alt-text",
              "Ask Consultant — strategic AI advisor in any language",
              "Priority email support",
              "7-day free trial — no card",
            ].map((line, i) => (
              <div key={i} className="flex items-start gap-2">
                <Check className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#10B981" }} />
                <p className="text-sm" style={{ color: "#292524" }}>{line}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FINAL CTA */}
        <section
          className="rounded-2xl p-8 text-center"
          style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.08), rgba(139,92,246,0.08))", border: "1px solid rgba(245,158,11,0.2)" }}
        >
          <h2 className="text-2xl font-bold mb-2" style={{ color: "#292524" }}>
            {uc.cta_h2}
          </h2>
          <p className="text-sm mb-5" style={{ color: "#78614E" }}>
            7-day Pro trial. No credit card. Cancel anytime.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold"
              style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)", color: "#1C1814" }}
            >
              Start free trial
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/features"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold"
              style={{ backgroundColor: "white", color: "#292524", border: "1px solid rgba(0,0,0,0.08)" }}
            >
              Compare every feature
            </Link>
          </div>
        </section>

        {/* CROSS-LINK */}
        <section className="text-center">
          <p className="text-xs" style={{ color: "#A8967E" }}>
            Different fit?
            {" "}
            {USE_CASES.filter((u) => u.slug !== uc.slug).map((u, i) => (
              <span key={u.slug}>
                {i > 0 && " · "}
                <Link href={`/for/${u.slug}`} className="underline" style={{ color: "#D97706" }}>
                  See for {u.audience_label.toLowerCase()}
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
