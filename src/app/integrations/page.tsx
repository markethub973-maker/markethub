"use client";

import { Printer } from "lucide-react";

const CATEGORIES = [
  {
    label: "Artificial Intelligence",
    color: "#8B5CF6",
    bg: "rgba(139,92,246,0.07)",
    border: "rgba(139,92,246,0.2)",
    services: [
      {
        name: "Anthropic Claude",
        version: "claude-sonnet-4-6 / haiku-4-5",
        logo: "🤖",
        purpose: "AI Captions, Sentiment Analysis, Agents, Weekly/Monthly Reports, A/B Title Generator, Buyer Persona, Research, Deep Analysis",
        envVars: [
          { key: "ANTHROPIC_API_KEY_APP", desc: "Production — app features (isolated credits)" },
          { key: "ANTHROPIC_API_KEY", desc: "Dev / admin tools" },
        ],
        docs: "console.anthropic.com",
      },
    ],
  },
  {
    label: "Social Media APIs",
    color: "#3B82F6",
    bg: "rgba(59,130,246,0.07)",
    border: "rgba(59,130,246,0.2)",
    services: [
      {
        name: "YouTube Data API v3",
        version: "v3 + OAuth 2.0",
        logo: "▶️",
        purpose: "Channel analytics, trending videos, search, comments, playlists, multi-regional trending, own-channel analytics (OAuth)",
        envVars: [
          { key: "YOUTUBE_API_KEY", desc: "Google Cloud API key for public data" },
          { key: "GOOGLE_CLIENT_ID", desc: "OAuth 2.0 client ID (own-channel)" },
          { key: "GOOGLE_CLIENT_SECRET", desc: "OAuth 2.0 client secret" },
        ],
        docs: "console.cloud.google.com",
      },
      {
        name: "Meta Graph API",
        version: "v21.0",
        logo: "📘",
        purpose: "Instagram analytics, Facebook page data, audience insights, Stories/Reels/Ads insights, hashtag performance, Ads Library, cross-platform analytics",
        envVars: [
          { key: "INSTAGRAM_APP_ID", desc: "Meta app ID" },
          { key: "INSTAGRAM_APP_SECRET", desc: "Meta app secret" },
          { key: "INSTAGRAM_REDIRECT_URI", desc: "OAuth callback URL" },
          { key: "META_APP_ID", desc: "Meta Business app ID" },
          { key: "META_APP_SECRET", desc: "Meta Business app secret" },
        ],
        docs: "developers.facebook.com",
      },
      {
        name: "RapidAPI",
        version: "Hub proxy",
        logo: "⚡",
        purpose: "TikTok trend analysis, TikTok search, trending sounds, Instagram public scraper (batch)",
        envVars: [
          { key: "RAPIDAPI_KEY", desc: "RapidAPI subscription key" },
        ],
        note: "Endpoints: tiktok-trend-analysis-api · instagram-public-bulk-scraper",
        docs: "rapidapi.com",
      },
    ],
  },
  {
    label: "Platform Infrastructure",
    color: "#10B981",
    bg: "rgba(16,185,129,0.07)",
    border: "rgba(16,185,129,0.2)",
    services: [
      {
        name: "Supabase",
        version: "@supabase/ssr ^0.9 + @supabase/supabase-js ^2.99",
        logo: "🟢",
        purpose: "Authentication (JWT + cookies), database (profiles, credits, tokens, calendar), Row-Level Security, service client for cron jobs",
        envVars: [
          { key: "NEXT_PUBLIC_SUPABASE_URL", desc: "Project URL (public)" },
          { key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", desc: "Anon key — client-side auth" },
          { key: "SUPABASE_SERVICE_ROLE_KEY", desc: "Service role — server-side only" },
        ],
        docs: "supabase.com/dashboard",
      },
      {
        name: "Stripe",
        version: "stripe ^17.7",
        logo: "💳",
        purpose: "Subscription checkout (Lite $24 / Pro $49 / Business $99 / Enterprise $249), token recharge packs, webhooks (checkout, cancellation, payment failed)",
        envVars: [
          { key: "STRIPE_SECRET_KEY", desc: "Backend secret key" },
          { key: "STRIPE_WEBHOOK_SECRET", desc: "Webhook signature verification" },
          { key: "STRIPE_LITE_PRICE_ID", desc: "Price ID — $24/mo" },
          { key: "STRIPE_PRO_PRICE_ID", desc: "Price ID — $49/mo" },
          { key: "STRIPE_BUSINESS_PRICE_ID", desc: "Price ID — $99/mo" },
          { key: "STRIPE_ENTERPRISE_PRICE_ID", desc: "Price ID — $249/mo" },
        ],
        docs: "dashboard.stripe.com",
      },
      {
        name: "Vercel",
        version: "Framework: Next.js 15",
        logo: "▲",
        purpose: "Hosting, deployment, Cron Jobs (5 scheduled tasks): token refresh Mon 6am, trial check daily 8am, weekly digest Mon 9am, onboarding daily 10am, engagement alerts Wed 8am, monthly report day-1 7am",
        envVars: [
          { key: "VERCEL_OIDC_TOKEN", desc: "CI/CD integration token" },
          { key: "CRON_SECRET", desc: "Bearer token protecting all cron routes" },
        ],
        docs: "vercel.com/dashboard",
      },
    ],
  },
  {
    label: "Email & Notifications",
    color: "#F59E0B",
    bg: "rgba(245,158,11,0.07)",
    border: "rgba(245,158,11,0.2)",
    services: [
      {
        name: "Resend",
        version: "resend ^6.9",
        logo: "✉️",
        purpose: "Transactional email: Welcome, Payment confirmation, Onboarding sequence (5 emails: Day 1/2/3/5/7), Trial expiring/expired, Subscription cancelled, Payment failed alert, Engagement rate drop alert, Weekly AI digest, Monthly PDF report",
        envVars: [
          { key: "RESEND_API_KEY", desc: "Resend API key" },
          { key: "ADMIN_EMAIL", desc: "Admin address for internal alerts" },
        ],
        note: "From: noreply@markethubpromo.com · rapoarte@markethubpromo.com",
        docs: "resend.com/overview",
      },
    ],
  },
  {
    label: "Data & Trends",
    color: "#F97316",
    bg: "rgba(249,115,22,0.07)",
    border: "rgba(249,115,22,0.2)",
    services: [
      {
        name: "Google Trends",
        version: "google-trends-api ^4.9",
        logo: "📈",
        purpose: "Real-time trending topics, interest over time, related queries — 65+ countries supported, multi-regional trend comparison",
        envVars: [],
        note: "No API key required — uses public RSS + google-trends-api library",
        docs: "trends.google.com",
      },
      {
        name: "Google News",
        version: "Public RSS",
        logo: "📰",
        purpose: "News headlines by country for 50+ regions, creator economy news feed",
        envVars: [],
        note: "No API key required — parses news.google.com/rss",
        docs: "news.google.com",
      },
    ],
  },
];

const ENV_SUMMARY = [
  { group: "AI", vars: ["ANTHROPIC_API_KEY_APP", "ANTHROPIC_API_KEY"] },
  { group: "YouTube", vars: ["YOUTUBE_API_KEY", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"] },
  { group: "Meta / Instagram", vars: ["INSTAGRAM_APP_ID", "INSTAGRAM_APP_SECRET", "INSTAGRAM_REDIRECT_URI", "META_APP_ID", "META_APP_SECRET"] },
  { group: "RapidAPI", vars: ["RAPIDAPI_KEY"] },
  { group: "Supabase", vars: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"] },
  { group: "Stripe", vars: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "STRIPE_LITE_PRICE_ID", "STRIPE_PRO_PRICE_ID", "STRIPE_BUSINESS_PRICE_ID", "STRIPE_ENTERPRISE_PRICE_ID"] },
  { group: "Email", vars: ["RESEND_API_KEY", "ADMIN_EMAIL"] },
  { group: "System", vars: ["CRON_SECRET", "VERCEL_OIDC_TOKEN", "NEXT_PUBLIC_APP_URL"] },
];

export default function IntegrationsPage() {
  return (
    <>
      {/* Print CSS */}
      <style>{`
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .print-break { page-break-before: always; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>

      <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", backgroundColor: "#F5F0E8", minHeight: "100vh" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 24px" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg,#F59E0B,#D97706)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ color: "white", fontSize: 20, fontWeight: 700 }}>M</span>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#A8967E", letterSpacing: 1.5, textTransform: "uppercase" }}>MarketHub Pro</span>
              </div>
              <h1 style={{ fontSize: 28, fontWeight: 800, color: "#1C1814", margin: 0 }}>API & Integrations Overview</h1>
              <p style={{ color: "#78614E", margin: "6px 0 0", fontSize: 14 }}>
                Complete reference — {CATEGORIES.reduce((s, c) => s + c.services.length, 0)} services · {ENV_SUMMARY.reduce((s, g) => s + g.vars.length, 0)} environment variables · Generated {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}
              </p>
            </div>
            <button
              className="no-print"
              type="button"
              onClick={() => window.print()}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 10, backgroundColor: "#F59E0B", color: "white", border: "none", cursor: "pointer", fontWeight: 700, fontSize: 14 }}>
              <Printer size={16} />
              Download PDF
            </button>
          </div>

          {/* Category sections */}
          {CATEGORIES.map(cat => (
            <div key={cat.label} style={{ marginBottom: 28 }}>
              {/* Category header */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <div style={{ width: 4, height: 22, borderRadius: 2, backgroundColor: cat.color }} />
                <h2 style={{ fontSize: 15, fontWeight: 800, color: cat.color, margin: 0, textTransform: "uppercase", letterSpacing: 0.8 }}>{cat.label}</h2>
                <div style={{ flex: 1, height: 1, backgroundColor: cat.border }} />
              </div>

              {/* Service cards */}
              <div style={{ display: "grid", gridTemplateColumns: cat.services.length === 1 ? "1fr" : "repeat(auto-fill, minmax(440px, 1fr))", gap: 14 }}>
                {cat.services.map(svc => (
                  <div key={svc.name} style={{ borderRadius: 14, padding: "18px 20px", backgroundColor: cat.bg, border: `1px solid ${cat.border}` }}>
                    {/* Service header */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                      <span style={{ fontSize: 22 }}>{svc.logo}</span>
                      <div>
                        <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: "#1C1814" }}>{svc.name}</p>
                        <p style={{ margin: 0, fontSize: 11, color: "#A8967E" }}>{svc.version}</p>
                      </div>
                      <div style={{ marginLeft: "auto" }}>
                        <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20, backgroundColor: cat.color, color: "white", opacity: 0.85 }}>
                          {svc.docs}
                        </span>
                      </div>
                    </div>

                    {/* Purpose */}
                    <p style={{ margin: "0 0 12px", fontSize: 12.5, color: "#4B3E35", lineHeight: 1.6 }}>{svc.purpose}</p>

                    {/* Note */}
                    {svc.note && (
                      <p style={{ margin: "0 0 10px", fontSize: 11.5, color: "#A8967E", fontStyle: "italic" }}>ℹ️ {svc.note}</p>
                    )}

                    {/* Env vars */}
                    {svc.envVars.length > 0 && (
                      <div>
                        <p style={{ margin: "0 0 6px", fontSize: 10.5, fontWeight: 700, color: cat.color, textTransform: "uppercase", letterSpacing: 0.5 }}>Environment Variables</p>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          {svc.envVars.map(v => (
                            <div key={v.key} style={{ display: "flex", alignItems: "flex-start", gap: 8, backgroundColor: "rgba(255,255,255,0.55)", borderRadius: 6, padding: "5px 8px" }}>
                              <code style={{ fontSize: 11, fontFamily: "monospace", color: cat.color, fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0 }}>{v.key}</code>
                              <span style={{ fontSize: 11, color: "#78614E", lineHeight: 1.4 }}>{v.desc}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {svc.envVars.length === 0 && (
                      <div style={{ backgroundColor: "rgba(255,255,255,0.4)", borderRadius: 6, padding: "5px 10px", display: "inline-block" }}>
                        <span style={{ fontSize: 11, color: "#A8967E" }}>No API key required</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Env vars summary table */}
          <div className="print-break" style={{ marginTop: 36, borderRadius: 16, overflow: "hidden", border: "1px solid rgba(245,215,160,0.4)" }}>
            <div style={{ background: "linear-gradient(135deg,#1C1814,#2D2420)", padding: "18px 24px" }}>
              <h2 style={{ margin: 0, color: "#FFF8F0", fontSize: 16, fontWeight: 800 }}>Complete Environment Variables Reference</h2>
              <p style={{ margin: "4px 0 0", color: "#A8967E", fontSize: 12 }}>{ENV_SUMMARY.reduce((s, g) => s + g.vars.length, 0)} total variables · configure in Vercel → Settings → Environment Variables</p>
            </div>
            <div style={{ backgroundColor: "#FFFCF7", padding: 24, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
              {ENV_SUMMARY.map(group => (
                <div key={group.group}>
                  <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 800, color: "#A8967E", textTransform: "uppercase", letterSpacing: 0.8 }}>{group.group}</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    {group.vars.map(v => (
                      <code key={v} style={{ fontSize: 11, fontFamily: "monospace", color: "#292524", backgroundColor: "rgba(245,215,160,0.2)", padding: "3px 7px", borderRadius: 4, display: "block" }}>{v}</code>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Architecture diagram (text-based) */}
          <div style={{ marginTop: 24, borderRadius: 16, padding: "20px 24px", backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.3)" }}>
            <h2 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 800, color: "#292524" }}>Data Flow Architecture</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr auto 1fr", gap: 0, alignItems: "center" }}>
              {[
                {
                  title: "Data Sources",
                  color: "#3B82F6",
                  items: ["YouTube API", "Meta Graph API", "RapidAPI / TikTok", "Google Trends", "Google News"],
                },
                { arrow: true },
                {
                  title: "MarketHub Pro",
                  color: "#F59E0B",
                  items: ["Next.js 15 (Vercel)", "Supabase DB + Auth", "Anthropic AI", "Stripe Payments"],
                  highlight: true,
                },
                { arrow: true },
                {
                  title: "Outputs",
                  color: "#10B981",
                  items: ["Dashboard UI", "PDF Reports", "Email (Resend)", "Client Share Links", "Scheduled Crons"],
                },
              ].map((col, i) => {
                if ("arrow" in col) {
                  return (
                    <div key={i} style={{ textAlign: "center", fontSize: 24, color: "#C4AA8A", padding: "0 8px" }}>→</div>
                  );
                }
                return (
                  <div key={col.title} style={{ borderRadius: 10, padding: "14px 16px", border: `1.5px solid ${col.color}30`, backgroundColor: col.highlight ? `${col.color}08` : "transparent" }}>
                    <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 800, color: col.color, textTransform: "uppercase" }}>{col.title}</p>
                    {col.items.map(item => (
                      <p key={item} style={{ margin: "0 0 4px", fontSize: 12, color: "#4B3E35" }}>• {item}</p>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div style={{ marginTop: 24, textAlign: "center", paddingBottom: 16 }}>
            <p style={{ fontSize: 11, color: "#C4AA8A", margin: 0 }}>
              MarketHub Pro · markethubpromo.com · Generated {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}
            </p>
          </div>

        </div>
      </div>
    </>
  );
}
