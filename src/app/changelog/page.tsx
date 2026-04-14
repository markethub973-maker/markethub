import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles, Shield, Zap, Brain, MessageCircle, Activity, Cookie, Lock } from "lucide-react";

export const metadata: Metadata = {
  title: "Changelog",
  description:
    "What's new in MarketHub Pro. Public release notes — features, fixes, and improvements shipped to production.",
  alternates: { canonical: "https://markethubpromo.com/changelog" },
};

interface Release {
  version: string;
  date: string;
  highlight?: boolean;
  items: { icon: React.ElementType; color: string; title: string; desc: string }[];
}

const RELEASES: Release[] = [
  {
    version: "Sprint 1 + 2 — Platform foundation",
    date: "2026-04-13 → 14",
    highlight: true,
    items: [
      {
        icon: MessageCircle,
        color: "#8B5CF6",
        title: "Ask Consultant — in-app AI advisor",
        desc: "Click the purple bubble bottom-left of any page. Strategic advice in 12 languages (incl. RTL). Backed by a learning DB that gets smarter with every resolved support ticket.",
      },
      {
        icon: Zap,
        color: "var(--color-primary)",
        title: "Automations Engine — 31 ready workflows",
        desc: "Cross-post, recycle best content, schedule from CSV, lead → CRM, weekly reports, Stripe → Slack, and 25 more. Browse + run from /dashboard/automations.",
      },
      {
        icon: Brain,
        color: "#10B981",
        title: "Smart Support — multilingual AI",
        desc: "Hit the orange Need help? button bottom-right. AI replies within seconds in 9+ languages. Complex tickets escalate to humans automatically.",
      },
      {
        icon: Activity,
        color: "#3B82F6",
        title: "Public status page + uptime API",
        desc: "Real-time health at /status. Programmatic /api/health for Pingdom, UptimeRobot, BetterStack.",
      },
      {
        icon: Lock,
        color: "#DC2626",
        title: "Admin 2FA (TOTP) + recovery codes",
        desc: "Optional second factor for admin login. Google Authenticator, 1Password, Bitwarden — any TOTP app works. 8 single-use recovery codes.",
      },
      {
        icon: Shield,
        color: "#6366F1",
        title: "Security hardening",
        desc: "AI-tier rate limit (premium endpoints capped per IP), CSRF Origin-header verification, RFC 9116 security.txt, branded error pages with telemetry IDs.",
      },
      {
        icon: Cookie,
        color: "var(--color-primary-hover)",
        title: "GDPR cookie consent + UI translations",
        desc: "Two-button consent banner (no dark patterns), gates Microsoft Clarity loading. All 25 user-facing pages translated to international English.",
      },
      {
        icon: Sparkles,
        color: "#EC4899",
        title: "Self-healing observability",
        desc: "Sentry release tracking, 9 cron-driven security agents watching 24/7, AdminCommandCenter with 4 subsystem strip + 3D pulsing orb, daily encrypted backups + R2 mirror.",
      },
    ],
  },
];

export default function ChangelogPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--color-bg-secondary)" }}>
      <header
        className="border-b"
        style={{ borderColor: "rgba(245,215,160,0.3)", backgroundColor: "white" }}
      >
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="text-sm font-bold"
            style={{ color: "var(--color-text)" }}
          >
            <span style={{ color: "var(--color-primary)" }}>●</span> MarketHub Pro
          </Link>
          <Link
            href="/promo"
            className="text-xs font-semibold"
            style={{ color: "#78614E" }}
          >
            ← Back home
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-bold mb-3" style={{ color: "var(--color-text)" }}>
          What&apos;s new
        </h1>
        <p className="text-base mb-12" style={{ color: "#78614E" }}>
          Public release notes. Everything below is live in production.
        </p>

        {RELEASES.map((r) => (
          <section key={r.version} className="mb-16">
            <div
              className="flex items-baseline gap-3 mb-1 pb-3 border-b"
              style={{ borderColor: "rgba(245,215,160,0.3)" }}
            >
              <h2
                className="text-xl font-bold"
                style={{ color: "var(--color-text)" }}
              >
                {r.version}
              </h2>
              {r.highlight && (
                <span
                  className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: "rgba(245,158,11,0.15)",
                    color: "var(--color-primary-hover)",
                  }}
                >
                  Major release
                </span>
              )}
            </div>
            <p className="text-xs mb-6" style={{ color: "#A8967E" }}>
              Shipped {r.date}
            </p>

            <div className="space-y-4">
              {r.items.map((it) => (
                <div
                  key={it.title}
                  className="rounded-xl p-4 flex gap-4"
                  style={{
                    backgroundColor: "white",
                    border: "1px solid rgba(0,0,0,0.06)",
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{
                      backgroundColor: `${it.color}14`,
                      color: it.color,
                    }}
                  >
                    <it.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-bold mb-1"
                      style={{ color: "var(--color-text)" }}
                    >
                      {it.title}
                    </p>
                    <p
                      className="text-xs leading-relaxed"
                      style={{ color: "#78614E" }}
                    >
                      {it.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}

        <div
          className="rounded-xl p-6 text-center"
          style={{
            background: "linear-gradient(135deg, rgba(245,158,11,0.08), rgba(139,92,246,0.08))",
            border: "1px solid rgba(245,158,11,0.2)",
          }}
        >
          <p className="text-sm font-bold mb-2" style={{ color: "var(--color-text)" }}>
            Want to follow new releases?
          </p>
          <p className="text-xs mb-4" style={{ color: "#78614E" }}>
            We post every shipped feature here. Bookmark this page or subscribe to
            our newsletter at registration.
          </p>
          <Link
            href="/register"
            className="inline-block px-5 py-2.5 rounded-xl text-sm font-bold"
            style={{
              background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))",
              color: "#1C1814",
            }}
          >
            Start free trial →
          </Link>
        </div>
      </main>
    </div>
  );
}
