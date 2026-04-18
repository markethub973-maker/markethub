"use client";

import Link from "next/link";

export default function DemoPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0d0b1e 0%, #1a1333 50%, #0d0b1e 100%)",
        color: "#fff",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* Header */}
      <header style={{ padding: "24px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link href="/" style={{ textDecoration: "none", color: "#fff", fontSize: 20, fontWeight: 800 }}>
          <span style={{ color: "#F59E0B" }}>●</span> MarketHub Pro
        </Link>
        <Link
          href="https://calendar.app.google/kmUnEepd8a3Nj1Mh7"
          style={{
            background: "linear-gradient(135deg, #F59E0B, #D97706)",
            color: "#1C1814",
            padding: "10px 24px",
            borderRadius: 12,
            textDecoration: "none",
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          Book a Demo
        </Link>
      </header>

      {/* Hero */}
      <section style={{ textAlign: "center", padding: "80px 24px 40px", maxWidth: 800, margin: "0 auto" }}>
        <div style={{ fontSize: 14, color: "#F59E0B", fontWeight: 600, marginBottom: 16, letterSpacing: 1 }}>
          SOCIAL MEDIA CONTENT PLATFORM
        </div>
        <h1 style={{ fontSize: 48, fontWeight: 800, lineHeight: 1.1, marginBottom: 24 }}>
          3x More Content.
          <br />
          <span style={{ color: "#F59E0B" }}>Zero Extra Staff.</span>
        </h1>
        <p style={{ fontSize: 18, color: "rgba(255,255,255,0.7)", maxWidth: 600, margin: "0 auto 40px", lineHeight: 1.6 }}>
          AI-powered social media content for restaurants, hotels, clinics, and retail businesses.
          Professional posts, images, and scheduling — delivered automatically.
        </p>
        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            href="https://calendar.app.google/kmUnEepd8a3Nj1Mh7"
            style={{
              background: "linear-gradient(135deg, #F59E0B, #D97706)",
              color: "#1C1814",
              padding: "16px 32px",
              borderRadius: 12,
              textDecoration: "none",
              fontWeight: 700,
              fontSize: 16,
            }}
          >
            Free 15-min Demo
          </Link>
          <Link
            href="/pricing"
            style={{
              background: "rgba(255,255,255,0.1)",
              color: "#fff",
              padding: "16px 32px",
              borderRadius: 12,
              textDecoration: "none",
              fontWeight: 600,
              fontSize: 16,
              border: "1px solid rgba(255,255,255,0.2)",
            }}
          >
            See Pricing
          </Link>
        </div>
      </section>

      {/* What You Get */}
      <section style={{ maxWidth: 900, margin: "0 auto", padding: "60px 24px" }}>
        <h2 style={{ textAlign: "center", fontSize: 32, fontWeight: 700, marginBottom: 48 }}>
          What You Get
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 24 }}>
          {[
            { icon: "✍️", title: "AI Content Generation", desc: "Professional captions in any language. PAS, AIDA, storytelling — all formulas built in." },
            { icon: "🎨", title: "AI Image Studio", desc: "Hyper-realistic images for your brand. Product photos, lifestyle shots, promotional graphics." },
            { icon: "📅", title: "Smart Scheduling", desc: "Auto-publish to Instagram, Facebook, LinkedIn. Best-time posting based on your audience." },
            { icon: "🎯", title: "Brand Voice per Client", desc: "Each client gets their own tone, vocabulary, and style. No mix-ups, ever." },
            { icon: "📊", title: "Analytics & Reports", desc: "Engagement tracking, monthly PDF reports, performance insights per platform." },
            { icon: "⚡", title: "Campaign Auto-Pilot", desc: "One brief → 5 posts with images, captions, hashtags, scheduling. One click." },
          ].map((f, i) => (
            <div
              key={i}
              style={{
                background: "rgba(255,255,255,0.05)",
                borderRadius: 16,
                padding: 28,
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 12 }}>{f.icon}</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section style={{ maxWidth: 700, margin: "0 auto", padding: "60px 24px" }}>
        <h2 style={{ textAlign: "center", fontSize: 32, fontWeight: 700, marginBottom: 48 }}>
          How It Works
        </h2>
        {[
          { step: "1", title: "Connect Your Social Accounts", desc: "Link Instagram, Facebook, LinkedIn in 2 minutes. We handle the rest." },
          { step: "2", title: "Tell Us Your Brand", desc: "Share your brand colors, tone, and target audience. AI learns your voice." },
          { step: "3", title: "Content Flows Automatically", desc: "Posts created, scheduled, and published. You approve or let it run on autopilot." },
        ].map((s, i) => (
          <div key={i} style={{ display: "flex", gap: 20, marginBottom: 32, alignItems: "flex-start" }}>
            <div
              style={{
                background: "linear-gradient(135deg, #F59E0B, #D97706)",
                color: "#1C1814",
                width: 40,
                height: 40,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: 18,
                flexShrink: 0,
              }}
            >
              {s.step}
            </div>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{s.title}</h3>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", lineHeight: 1.6 }}>{s.desc}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Social Proof / Trust */}
      <section style={{ textAlign: "center", padding: "60px 24px", maxWidth: 700, margin: "0 auto" }}>
        <div
          style={{
            background: "rgba(245, 158, 11, 0.1)",
            border: "1px solid rgba(245, 158, 11, 0.3)",
            borderRadius: 16,
            padding: 32,
          }}
        >
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>
            Try It Free — No Risk
          </h2>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.7)", marginBottom: 24, lineHeight: 1.6 }}>
            We&apos;ll create 5 professional posts for your business — completely free.
            <br />
            See the quality before you pay anything.
          </p>
          <Link
            href="https://calendar.app.google/kmUnEepd8a3Nj1Mh7"
            style={{
              display: "inline-block",
              background: "linear-gradient(135deg, #F59E0B, #D97706)",
              color: "#1C1814",
              padding: "16px 40px",
              borderRadius: 12,
              textDecoration: "none",
              fontWeight: 700,
              fontSize: 16,
            }}
          >
            Get Your Free Posts
          </Link>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 12 }}>
            15-minute call. No credit card required. No obligation.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ textAlign: "center", padding: "40px 24px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
          MarketHub Pro — Social Media Marketing for Businesses
        </p>
      </footer>
    </div>
  );
}
