import type { Metadata } from "next";
import Link from "next/link";
import { Zap, Image, Calendar, Users, BarChart2, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "Demo — MarketHub Pro",
  description: "See how MarketHub Pro delivers 3x more social media content with zero extra staff. Book a free 15-minute demo.",
  alternates: { canonical: "https://markethubpromo.com/demo" },
};

const glassBtn: React.CSSProperties = {
  padding: "16px 32px",
  borderRadius: 14,
  textDecoration: "none",
  fontWeight: 700,
  fontSize: 16,
  color: "#1C1814",
  background: "linear-gradient(135deg, rgba(245,158,11,0.85), rgba(217,119,6,0.85))",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid rgba(255,255,255,0.3)",
  boxShadow: "0 4px 20px rgba(245,158,11,0.35), inset 0 1px 0 rgba(255,255,255,0.4)",
  transition: "all 0.3s ease",
};

const glassBtnSecondary: React.CSSProperties = {
  padding: "16px 32px",
  borderRadius: 14,
  textDecoration: "none",
  fontWeight: 600,
  fontSize: 16,
  color: "#fff",
  background: "rgba(255,255,255,0.06)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid rgba(255,255,255,0.15)",
  boxShadow: "0 4px 20px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1)",
  transition: "all 0.3s ease",
};

const glassBtnSmall: React.CSSProperties = {
  padding: "10px 24px",
  borderRadius: 12,
  textDecoration: "none",
  fontWeight: 700,
  fontSize: 14,
  color: "#1C1814",
  background: "linear-gradient(135deg, rgba(245,158,11,0.85), rgba(217,119,6,0.85))",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid rgba(255,255,255,0.3)",
  boxShadow: "0 2px 12px rgba(245,158,11,0.3), inset 0 1px 0 rgba(255,255,255,0.4)",
};

const glassBtnCTA: React.CSSProperties = {
  display: "inline-block",
  padding: "16px 40px",
  borderRadius: 14,
  textDecoration: "none",
  fontWeight: 700,
  fontSize: 16,
  color: "#1C1814",
  background: "linear-gradient(135deg, rgba(245,158,11,0.9), rgba(217,119,6,0.9))",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid rgba(255,255,255,0.35)",
  boxShadow: "0 6px 30px rgba(245,158,11,0.4), inset 0 1px 0 rgba(255,255,255,0.45)",
};

const card: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 16,
  padding: "24px 20px",
  color: "rgba(255,255,255,0.92)",
  overflow: "hidden",
  boxShadow: "0 4px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.1)",
};

const FEATURES = [
  { icon: Sparkles, title: "AI Content Generation", desc: "Professional captions in any language. PAS, AIDA, storytelling formulas built in." },
  { icon: Image, title: "AI Image Studio", desc: "Hyper-realistic images for your brand. Product photos, lifestyle shots, graphics." },
  { icon: Calendar, title: "Smart Scheduling", desc: "Auto-publish to Instagram, Facebook, LinkedIn. Best-time posting for your audience." },
  { icon: Users, title: "Brand Voice per Client", desc: "Each client gets their own tone and style. No mix-ups, ever." },
  { icon: BarChart2, title: "Analytics & Reports", desc: "Engagement tracking, monthly PDF reports, insights per platform." },
  { icon: Zap, title: "Campaign Auto-Pilot", desc: "One brief, 5 posts with images, captions, hashtags. One click." },
];

export default function DemoPage() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0d0b1e 0%, #1a1333 50%, #0d0b1e 100%)",
      color: "rgba(255,255,255,0.95)",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    }}>
      {/* Blobs */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(245,158,11,0.15) 0%, transparent 70%)", top: "-10%", left: "-5%", filter: "blur(80px)", animation: "blobFloat 20s ease-in-out infinite" }} />
        <div style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)", bottom: "10%", right: "-5%", filter: "blur(80px)", animation: "blobFloat 25s ease-in-out infinite reverse" }} />
      </div>

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Header */}
        <header className="px-4 sm:px-6 md:px-8 py-4 sm:py-6" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link href="/" style={{ textDecoration: "none", color: "#fff", fontSize: 20, fontWeight: 800 }}>
            <span style={{ color: "#F59E0B" }}>●</span> MarketHub Pro
          </Link>
          <Link href="https://calendar.app.google/kmUnEepd8a3Nj1Mh7" style={glassBtnSmall}>
            Book a Demo
          </Link>
        </header>

        {/* Hero */}
        <section style={{ textAlign: "center", padding: "80px 24px 40px", maxWidth: 800, margin: "0 auto" }}>
          <div style={{ fontSize: 13, color: "#F59E0B", fontWeight: 600, marginBottom: 16, letterSpacing: 2, textTransform: "uppercase" }}>Social Media Content Platform</div>
          <h1 className="text-2xl sm:text-3xl md:text-5xl font-extrabold" style={{ lineHeight: 1.1, marginBottom: 24 }}>
            3x More Content.<br /><span style={{ color: "#F59E0B" }}>Zero Extra Staff.</span>
          </h1>
          <p className="text-sm sm:text-base md:text-lg" style={{ color: "rgba(255,255,255,0.65)", maxWidth: 560, margin: "0 auto 40px", lineHeight: 1.6 }}>
            AI-powered social media content for restaurants, hotels, clinics, and retail businesses. Professional posts, images, and scheduling — delivered automatically.
          </p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="https://calendar.app.google/kmUnEepd8a3Nj1Mh7" style={glassBtn}>
              Free 15-min Demo
            </Link>
            <Link href="/pricing" style={glassBtnSecondary}>
              See Pricing
            </Link>
          </div>
        </section>

        {/* Features */}
        <section style={{ maxWidth: 960, margin: "0 auto", padding: "60px 24px" }}>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold" style={{ textAlign: "center", marginBottom: 48 }}>What You Get</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <div key={i} style={card}>
                <f.icon size={24} color="#F59E0B" style={{ marginBottom: 12 }} />
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, color: "#fff" }}>{f.title}</h3>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.5, margin: 0 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How It Works */}
        <section style={{ maxWidth: 640, margin: "0 auto", padding: "60px 24px" }}>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold" style={{ textAlign: "center", marginBottom: 48 }}>How It Works</h2>
          {[
            { n: "1", title: "Connect Your Social Accounts", desc: "Link Instagram, Facebook, LinkedIn in 2 minutes." },
            { n: "2", title: "Tell Us Your Brand", desc: "Share your colors, tone, and audience. AI learns your voice." },
            { n: "3", title: "Content Flows Automatically", desc: "Posts created, scheduled, published. Approve or let it run." },
          ].map((s, i) => (
            <div key={i} style={{ display: "flex", gap: 16, marginBottom: 24, alignItems: "center" }}>
              <div style={{ background: "linear-gradient(135deg,#F59E0B,#D97706)", color: "#1C1814", width: 40, height: 40, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, flexShrink: 0, boxShadow: "0 4px 16px rgba(245,158,11,0.3)" }}>
                {s.n}
              </div>
              <div style={{ ...card, flex: 1, padding: "16px 20px" }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, color: "#fff" }}>{s.title}</h3>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.5, margin: 0 }}>{s.desc}</p>
              </div>
            </div>
          ))}
        </section>

        {/* CTA */}
        <section style={{ textAlign: "center", padding: "60px 24px 80px", maxWidth: 600, margin: "0 auto" }}>
          <div style={{ ...card, padding: "40px 32px", borderColor: "rgba(245,158,11,0.25)", background: "rgba(245,158,11,0.04)" }}>
            <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 12, color: "#fff" }}>Try It Free — No Risk</h2>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.65)", marginBottom: 24, lineHeight: 1.6 }}>
              We&apos;ll create <strong style={{ color: "#F59E0B" }}>5 professional posts</strong> for your business — completely free. See the quality before you pay.
            </p>
            <Link href="https://calendar.app.google/kmUnEepd8a3Nj1Mh7" style={glassBtnCTA}>
              Get Your Free Posts
            </Link>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 12 }}>15-minute call. No credit card. No obligation.</p>
          </div>
        </section>

        <footer style={{ textAlign: "center", padding: "40px 24px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ marginBottom: 16, display: "flex", gap: 24, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="mailto:alex@markethubpromo.com" style={{ color: "#F59E0B", textDecoration: "none", fontSize: 14 }}>
              alex@markethubpromo.com
            </a>
            <a href="https://calendar.app.google/kmUnEepd8a3Nj1Mh7" style={{ color: "rgba(255,255,255,0.5)", textDecoration: "none", fontSize: 14 }}>
              Book a Call
            </a>
            <a href="/pricing" style={{ color: "rgba(255,255,255,0.5)", textDecoration: "none", fontSize: 14 }}>
              Pricing
            </a>
          </div>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>MarketHub Pro — Social Media Marketing for Businesses</p>
        </footer>
      </div>
    </div>
  );
}
