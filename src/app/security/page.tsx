import type { Metadata } from "next";
import Link from "next/link";
import { Shield, Mail, Lock, Award } from "lucide-react";

export const metadata: Metadata = {
  title: "Security & Vulnerability Disclosure",
  description:
    "How to responsibly report security issues in MarketHub Pro. We commit to acknowledging reports within 48 hours.",
  alternates: { canonical: "https://markethubpromo.com/security" },
};

export default function SecurityPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FFFCF7" }}>
      <main className="max-w-3xl mx-auto px-6 py-12">
        <Link
          href="/"
          className="inline-block text-xs mb-6"
          style={{ color: "#78614E" }}
        >
          ← Back to MarketHub Pro
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: "rgba(16,185,129,0.12)", color: "#10B981" }}
          >
            <Shield className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-bold" style={{ color: "#292524" }}>
            Security
          </h1>
        </div>

        <p className="text-base mb-8" style={{ color: "#78614E" }}>
          Security researchers, ethical hackers, and concerned customers — thank
          you for helping us keep MarketHub Pro safe. Here&apos;s how to report
          issues responsibly.
        </p>

        <section className="mb-8">
          <h2
            className="text-lg font-bold mb-3 flex items-center gap-2"
            style={{ color: "#292524" }}
          >
            <Mail className="w-5 h-5" style={{ color: "#F59E0B" }} />
            How to report
          </h2>
          <ul className="space-y-2 text-sm" style={{ color: "#292524" }}>
            <li>
              Email{" "}
              <a
                href="mailto:security@markethubpromo.com"
                className="font-semibold underline"
                style={{ color: "#D97706" }}
              >
                security@markethubpromo.com
              </a>{" "}
              with a clear description, reproduction steps, and any PoC.
            </li>
            <li>
              For sensitive disclosures, request our PGP key in the same email
              and we&apos;ll send it within 24 hours.
            </li>
            <li>
              Please <strong>do not</strong> publicly disclose the issue until
              we&apos;ve confirmed the fix is deployed.
            </li>
          </ul>
        </section>

        <section className="mb-8">
          <h2
            className="text-lg font-bold mb-3 flex items-center gap-2"
            style={{ color: "#292524" }}
          >
            <Lock className="w-5 h-5" style={{ color: "#F59E0B" }} />
            Our commitments
          </h2>
          <ul className="space-y-2 text-sm" style={{ color: "#292524" }}>
            <li>Acknowledge your report within <strong>48 hours</strong>.</li>
            <li>
              Provide a triage decision (accepted / wontfix with reason) within
              5 business days.
            </li>
            <li>Keep you informed of fix progress and deploy date.</li>
            <li>
              Add you to the acknowledgments below (with permission) once the
              fix ships.
            </li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold mb-3" style={{ color: "#292524" }}>
            Scope
          </h2>
          <p className="text-sm mb-3" style={{ color: "#292524" }}>
            <strong>In scope:</strong>
          </p>
          <ul
            className="text-sm space-y-1 list-disc pl-6 mb-4"
            style={{ color: "#292524" }}
          >
            <li>markethubpromo.com (production)</li>
            <li>www.markethubpromo.com</li>
            <li>All API endpoints under /api/*</li>
            <li>OAuth integrations (Instagram, TikTok, YouTube, LinkedIn, Facebook)</li>
            <li>Stripe webhook receivers</li>
          </ul>
          <p className="text-sm mb-3" style={{ color: "#292524" }}>
            <strong>Out of scope:</strong>
          </p>
          <ul
            className="text-sm space-y-1 list-disc pl-6"
            style={{ color: "#292524" }}
          >
            <li>Denial-of-service / volumetric attacks</li>
            <li>Social engineering of staff or customers</li>
            <li>
              Reports from automated scanners without proof-of-concept
              (Acunetix / Nessus dumps without context)
            </li>
            <li>
              Issues in third-party services we use (Vercel, Supabase, Stripe,
              Cloudflare) — please report directly to them.
            </li>
            <li>Self-XSS, missing security headers without exploitation path</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold mb-3" style={{ color: "#292524" }}>
            What we&apos;ve already deployed
          </h2>
          <ul
            className="text-sm space-y-1 list-disc pl-6"
            style={{ color: "#292524" }}
          >
            <li>HSTS preload, CSP, X-Frame-Options DENY, comprehensive header set</li>
            <li>Cloudflare WAF with custom rules + edge rate limiting</li>
            <li>App-level rate limiting (auth: 10/min, AI: 20/min, general: 120/min per IP)</li>
            <li>CSRF protection via Origin header verification on all state-changing requests</li>
            <li>HMAC-signed webhook callbacks (Stripe, n8n, Apify) with constant-time compare</li>
            <li>Field-level encryption for sensitive admin secrets at rest</li>
            <li>Service-role-only writes on sensitive tables (RLS strict)</li>
            <li>SIEM agent + reactive alerts via Telegram + email</li>
            <li>Daily encrypted database backups + R2 mirror</li>
            <li>Sentry error tracking with release tagging + source maps</li>
            <li>Optional admin 2FA (TOTP) with recovery codes</li>
          </ul>
        </section>

        <section
          id="acknowledgments"
          className="mb-8 rounded-xl p-5"
          style={{
            backgroundColor: "rgba(245,158,11,0.06)",
            border: "1px solid rgba(245,158,11,0.2)",
          }}
        >
          <h2
            className="text-lg font-bold mb-2 flex items-center gap-2"
            style={{ color: "#292524" }}
          >
            <Award className="w-5 h-5" style={{ color: "#F59E0B" }} />
            Acknowledgments
          </h2>
          <p className="text-sm" style={{ color: "#78614E" }}>
            Thank you to every researcher who has helped us make MarketHub Pro
            safer. Your name will appear here once the fix is live (with your
            permission).
          </p>
        </section>

        <p
          className="text-xs text-center"
          style={{ color: "#A8967E" }}
        >
          See also: <code>/.well-known/security.txt</code> (RFC 9116)
        </p>
      </main>
    </div>
  );
}
