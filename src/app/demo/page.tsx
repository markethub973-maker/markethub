import type { Metadata } from "next";
import Link from "next/link";
import { Zap, Image, Calendar, Users, BarChart2, Sparkles } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";

export const metadata: Metadata = {
  title: "Demo — MarketHub Pro",
  description: "See how MarketHub Pro delivers 3x more social media content with zero extra staff. Book a free 15-minute demo.",
  alternates: { canonical: "https://markethubpromo.com/demo" },
};

const D = {
  heading: "rgba(255,255,255,0.95)",
  body: "rgba(255,255,255,0.65)",
  muted: "rgba(255,255,255,0.35)",
  accent: "#f59e0b",
  accentDark: "#d97706",
};

const FEATURES = [
  { icon: Sparkles, title: "AI Content Generation", desc: "Professional captions in any language. PAS, AIDA, storytelling — all formulas built in." },
  { icon: Image, title: "AI Image Studio", desc: "Hyper-realistic images for your brand. Product photos, lifestyle shots, promotional graphics." },
  { icon: Calendar, title: "Smart Scheduling", desc: "Auto-publish to Instagram, Facebook, LinkedIn. Best-time posting based on your audience." },
  { icon: Users, title: "Brand Voice per Client", desc: "Each client gets their own tone, vocabulary, and style. No mix-ups, ever." },
  { icon: BarChart2, title: "Analytics & Reports", desc: "Engagement tracking, monthly PDF reports, performance insights per platform." },
  { icon: Zap, title: "Campaign Auto-Pilot", desc: "One brief → 5 posts with images, captions, hashtags, scheduling. One click." },
];

const STEPS = [
  { n: "1", title: "Connect Your Social Accounts", desc: "Link Instagram, Facebook, LinkedIn in 2 minutes. We handle the rest." },
  { n: "2", title: "Tell Us Your Brand", desc: "Share your brand colors, tone, and target audience. AI learns your voice." },
  { n: "3", title: "Content Flows Automatically", desc: "Posts created, scheduled, and published. You approve or let it run on autopilot." },
];

export default function DemoPage() {
  return (
    <div
      className="liquidGlass-wrapper"
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0d0b1e 0%, #1a1333 50%, #0d0b1e 100%)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Ambient Blobs */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        <div style={{
          position: "absolute", width: 500, height: 500, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(245,158,11,0.15) 0%, transparent 70%)",
          top: "-10%", left: "-5%", filter: "blur(80px)",
          animation: "blobFloat 20s ease-in-out infinite",
        }} />
        <div style={{
          position: "absolute", width: 400, height: 400, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)",
          bottom: "10%", right: "-5%", filter: "blur(80px)",
          animation: "blobFloat 25s ease-in-out infinite reverse",
        }} />
        <div style={{
          position: "absolute", width: 300, height: 300, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)",
          top: "40%", left: "50%", filter: "blur(60px)",
          animation: "blobFloat 18s ease-in-out infinite",
        }} />
      </div>

      {/* Content */}
      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Header */}
        <header style={{ padding: "24px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link href="/" style={{ textDecoration: "none", color: "#fff", fontSize: 20, fontWeight: 800 }}>
            <span style={{ color: D.accent }}>●</span> MarketHub Pro
          </Link>
          <Link
            href="https://calendar.app.google/kmUnEepd8a3Nj1Mh7"
            className="btn-liquid-primary"
            style={{ padding: "10px 24px", borderRadius: 12, textDecoration: "none", fontWeight: 700, fontSize: 14 }}
          >
            Book a Demo
          </Link>
        </header>

        {/* Hero */}
        <section style={{ textAlign: "center", padding: "80px 24px 40px", maxWidth: 800, margin: "0 auto" }}>
          <div style={{ fontSize: 14, color: D.accent, fontWeight: 600, marginBottom: 16, letterSpacing: 1 }}>
            SOCIAL MEDIA CONTENT PLATFORM
          </div>
          <h1 style={{ fontSize: 48, fontWeight: 800, lineHeight: 1.1, marginBottom: 24, color: D.heading }}>
            3x More Content.
            <br />
            <span style={{ color: D.accent }}>Zero Extra Staff.</span>
          </h1>
          <p style={{ fontSize: 18, color: D.body, maxWidth: 600, margin: "0 auto 40px", lineHeight: 1.6 }}>
            AI-powered social media content for restaurants, hotels, clinics, and retail businesses.
            Professional posts, images, and scheduling — delivered automatically.
          </p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <Link
              href="https://calendar.app.google/kmUnEepd8a3Nj1Mh7"
              className="btn-liquid-primary"
              style={{ padding: "16px 32px", borderRadius: 12, textDecoration: "none", fontWeight: 700, fontSize: 16 }}
            >
              Free 15-min Demo
            </Link>
            <Link
              href="/pricing"
              className="btn-liquid-secondary"
              style={{ padding: "16px 32px", borderRadius: 12, textDecoration: "none", fontWeight: 600, fontSize: 16 }}
            >
              See Pricing
            </Link>
          </div>
        </section>

        {/* Features */}
        <section style={{ maxWidth: 1000, margin: "0 auto", padding: "60px 24px" }}>
          <h2 style={{ textAlign: "center", fontSize: 32, fontWeight: 700, marginBottom: 48, color: D.heading }}>
            What You Get
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
            {FEATURES.map((f, i) => (
              <GlassCard key={i} style={{ padding: 28 }}>
                <f.icon size={28} color={D.accent} style={{ marginBottom: 12 }} />
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: D.heading }}>{f.title}</h3>
                <p style={{ fontSize: 14, color: D.body, lineHeight: 1.6 }}>{f.desc}</p>
              </GlassCard>
            ))}
          </div>
        </section>

        {/* How It Works */}
        <section style={{ maxWidth: 700, margin: "0 auto", padding: "60px 24px" }}>
          <h2 style={{ textAlign: "center", fontSize: 32, fontWeight: 700, marginBottom: 48, color: D.heading }}>
            How It Works
          </h2>
          {STEPS.map((s, i) => (
            <div key={i} style={{ display: "flex", gap: 20, marginBottom: 32, alignItems: "flex-start" }}>
              <div style={{
                background: `linear-gradient(135deg, ${D.accent}, ${D.accentDark})`,
                color: "#1C1814", width: 44, height: 44, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 800, fontSize: 18, flexShrink: 0,
                boxShadow: `0 4px 20px rgba(245,158,11,0.3)`,
              }}>
                {s.n}
              </div>
              <GlassCard style={{ flex: 1, padding: 20 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4, color: D.heading }}>{s.title}</h3>
                <p style={{ fontSize: 14, color: D.body, lineHeight: 1.6 }}>{s.desc}</p>
              </GlassCard>
            </div>
          ))}
        </section>

        {/* CTA — Free Pilot */}
        <section style={{ textAlign: "center", padding: "60px 24px", maxWidth: 700, margin: "0 auto" }}>
          <GlassCard style={{
            padding: 40,
            borderColor: "rgba(245,158,11,0.3)",
            background: "rgba(245,158,11,0.05)",
          }}>
            <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 16, color: D.heading }}>
              Try It Free — No Risk
            </h2>
            <p style={{ fontSize: 16, color: D.body, marginBottom: 24, lineHeight: 1.6 }}>
              We&apos;ll create <strong style={{ color: D.accent }}>5 professional posts</strong> for your business — completely free.
              <br />
              See the quality before you pay anything.
            </p>
            <Link
              href="https://calendar.app.google/kmUnEepd8a3Nj1Mh7"
              className="btn-liquid-primary"
              style={{
                display: "inline-block", padding: "16px 40px", borderRadius: 12,
                textDecoration: "none", fontWeight: 700, fontSize: 16,
              }}
            >
              Get Your Free Posts
            </Link>
            <p style={{ fontSize: 12, color: D.muted, marginTop: 12 }}>
              15-minute call. No credit card required. No obligation.
            </p>
          </GlassCard>
        </section>

        {/* Footer */}
        <footer style={{ textAlign: "center", padding: "40px 24px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <p style={{ fontSize: 12, color: D.muted }}>
            MarketHub Pro — Social Media Marketing for Businesses
          </p>
        </footer>
      </div>
    </div>
  );
}
