/**
 * /p/[slug] — Public personalized prospect landing page.
 *
 * Shows sample social-media posts generated for a specific business,
 * along with pricing and a CTA to book a demo call.
 *
 * Server Component — fetches from prospect_pages, increments visit on load.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/service";
import { Globe, Briefcase, Instagram, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

// ── Types ────────────────────────────────────────────────────────────────────

interface SamplePost {
  title: string;
  caption: string;
  emoji: string;
}

interface ProspectPage {
  id: string;
  slug: string;
  business_name: string;
  website: string | null;
  industry: string | null;
  instagram: string | null;
  last_post_days: number | null;
  sample_posts: SamplePost[];
  price_amount: number;
  price_currency: string;
  tier: string | null;
  visit_count: number;
  last_visited_at: string | null;
  created_at: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const CALENDLY = "https://calendar.app.google/kmUnEepd8a3Nj1Mh7";

async function getPage(slug: string): Promise<ProspectPage | null> {
  const svc = createServiceClient();
  const { data } = await svc
    .from("prospect_pages")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  return data as ProspectPage | null;
}

async function trackVisit(slug: string) {
  try {
    const base =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000");
    const url = `${base}/api/prospect-page/track?slug=${encodeURIComponent(slug)}`;
    await fetch(url, { cache: "no-store" });
  } catch {
    // Non-critical — page still renders even if tracking fails
  }
}

// ── SEO Metadata ─────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPage(slug);
  if (!page) return { title: "Not Found" };

  const postCount = page.sample_posts?.length ?? 0;
  return {
    title: `${postCount} Sample Posts for ${page.business_name} — MarketHub Pro`,
    description: `We created ${postCount} ready-to-publish social media posts for ${page.business_name}. See them free.`,
    alternates: {
      canonical: `https://markethubpromo.com/p/${slug}`,
    },
    robots: { index: false, follow: false }, // Prospect pages are private
  };
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function ProspectLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await getPage(slug);
  if (!page) notFound();

  // Fire-and-forget visit tracking
  trackVisit(slug);

  const posts: SamplePost[] = page.sample_posts ?? [];
  const postCount = posts.length;
  const currencySymbol = page.price_currency === "usd" ? "$" : "€";

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #0d0b1e 0%, #1a1333 50%, #0d0b1e 100%)",
        color: "rgba(255,255,255,0.95)",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* Background blobs */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 500,
            height: 500,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(245,158,11,0.15) 0%, transparent 70%)",
            top: "-10%",
            left: "-5%",
            filter: "blur(80px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 400,
            height: 400,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)",
            bottom: "10%",
            right: "-5%",
            filter: "blur(80px)",
          }}
        />
      </div>

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Header */}
        <header
          className="px-4 sm:px-6 md:px-8 py-4 sm:py-6"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Link
            href="/"
            style={{
              textDecoration: "none",
              color: "#fff",
              fontSize: 20,
              fontWeight: 800,
            }}
          >
            <span style={{ color: "#F59E0B" }}>●</span> MarketHub Pro
          </Link>
          <Link
            href={CALENDLY}
            style={{
              padding: "10px 24px",
              borderRadius: 12,
              textDecoration: "none",
              fontWeight: 700,
              fontSize: 14,
              color: "#1C1814",
              background:
                "linear-gradient(135deg, rgba(245,158,11,0.85), rgba(217,119,6,0.85))",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.3)",
              boxShadow:
                "0 2px 12px rgba(245,158,11,0.3), inset 0 1px 0 rgba(255,255,255,0.4)",
            }}
          >
            Book a Call
          </Link>
        </header>

        {/* Hero */}
        <section
          style={{
            textAlign: "center",
            maxWidth: 800,
            margin: "0 auto",
          }}
          className="px-4 md:px-6 pt-12 sm:pt-16 md:pt-20 pb-8"
        >
          <div
            style={{
              fontSize: 13,
              color: "#F59E0B",
              fontWeight: 600,
              marginBottom: 16,
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
          >
            Prepared Exclusively for You
          </div>
          <h1
            className="text-2xl sm:text-3xl md:text-5xl font-extrabold"
            style={{ lineHeight: 1.1, marginBottom: 24 }}
          >
            We Made{" "}
            <span style={{ color: "#F59E0B" }}>{postCount} Posts</span> for{" "}
            {page.business_name}
          </h1>
          <p
            className="text-sm sm:text-base md:text-lg"
            style={{
              color: "rgba(255,255,255,0.65)",
              maxWidth: 560,
              margin: "0 auto 40px",
              lineHeight: 1.6,
            }}
          >
            Ready-to-publish social media content, tailored to your brand.
            See the quality before you commit.
          </p>
        </section>

        {/* Business Info Cards */}
        <section
          style={{ maxWidth: 900, margin: "0 auto" }}
          className="px-4 md:px-6 pb-10"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {page.website && (
              <InfoCard
                icon={<Globe size={18} color="#F59E0B" />}
                label="Website"
                value={page.website.replace(/^https?:\/\//, "")}
              />
            )}
            {page.industry && (
              <InfoCard
                icon={<Briefcase size={18} color="#F59E0B" />}
                label="Industry"
                value={page.industry}
              />
            )}
            {page.instagram && (
              <InfoCard
                icon={<Instagram size={18} color="#F59E0B" />}
                label="Instagram"
                value={`@${page.instagram.replace(/^@/, "")}`}
              />
            )}
            {page.last_post_days != null && (
              <InfoCard
                icon={<Clock size={18} color="#F59E0B" />}
                label="Last Post"
                value={
                  page.last_post_days === 0
                    ? "Today"
                    : `${page.last_post_days} days ago`
                }
              />
            )}
          </div>
        </section>

        {/* Sample Posts */}
        <section
          style={{ maxWidth: 900, margin: "0 auto" }}
          className="px-4 md:px-6 pb-12"
        >
          <h2
            className="text-xl sm:text-2xl md:text-3xl font-bold"
            style={{ textAlign: "center", marginBottom: 32 }}
          >
            Your Sample Posts
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {posts.map((post, i) => (
              <div
                key={i}
                style={{
                  background: "rgba(255,255,255,0.06)",
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 16,
                  padding: "28px 24px",
                  overflow: "hidden",
                  boxShadow:
                    "0 4px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.1)",
                }}
              >
                <div
                  style={{
                    fontSize: 28,
                    marginBottom: 12,
                  }}
                >
                  {post.emoji}
                </div>
                <h3
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    marginBottom: 8,
                    color: "#fff",
                  }}
                >
                  {post.title}
                </h3>
                <p
                  style={{
                    fontSize: 14,
                    color: "rgba(255,255,255,0.6)",
                    lineHeight: 1.6,
                    margin: 0,
                  }}
                >
                  {post.caption}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Price + CTA */}
        <section
          style={{
            textAlign: "center",
            maxWidth: 600,
            margin: "0 auto",
          }}
          className="px-4 md:px-6 pb-16 md:pb-20"
        >
          <div
            style={{
              background: "rgba(245,158,11,0.04)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              border: "1px solid rgba(245,158,11,0.25)",
              borderRadius: 16,
              overflow: "hidden",
              boxShadow:
                "0 4px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.1)",
            }}
            className="p-6 sm:p-8 md:p-10"
          >
            <h2
              className="text-xl sm:text-2xl font-extrabold"
              style={{ marginBottom: 8, color: "#fff" }}
            >
              Full Social Media Service
            </h2>
            <p
              style={{
                fontSize: 14,
                color: "rgba(255,255,255,0.55)",
                marginBottom: 20,
                lineHeight: 1.6,
              }}
            >
              Professional content creation, scheduling, and publishing — starting at
            </p>
            <div
              style={{
                fontSize: 36,
                fontWeight: 800,
                color: "#F59E0B",
                marginBottom: 24,
              }}
            >
              {currencySymbol}
              {page.price_amount}
              <span
                style={{
                  fontSize: 16,
                  fontWeight: 500,
                  color: "rgba(255,255,255,0.5)",
                }}
              >
                /month
              </span>
            </div>
            <Link
              href={CALENDLY}
              className="w-full sm:w-auto"
              style={{
                display: "inline-block",
                padding: "16px 40px",
                borderRadius: 14,
                textDecoration: "none",
                fontWeight: 700,
                fontSize: 16,
                color: "#1C1814",
                background:
                  "linear-gradient(135deg, rgba(245,158,11,0.9), rgba(217,119,6,0.9))",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                border: "1px solid rgba(255,255,255,0.35)",
                boxShadow:
                  "0 6px 30px rgba(245,158,11,0.4), inset 0 1px 0 rgba(255,255,255,0.45)",
              }}
            >
              See All {postCount} Posts — Free
            </Link>
            <p
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.35)",
                marginTop: 12,
              }}
            >
              15-minute call. No credit card. No obligation.
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer
          style={{
            textAlign: "center",
            padding: "40px 24px",
            borderTop: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div
            style={{
              marginBottom: 16,
              display: "flex",
              gap: 24,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <a
              href="mailto:alex@markethubpromo.com"
              style={{
                color: "#F59E0B",
                textDecoration: "none",
                fontSize: 14,
              }}
            >
              alex@markethubpromo.com
            </a>
            <a
              href={CALENDLY}
              style={{
                color: "rgba(255,255,255,0.5)",
                textDecoration: "none",
                fontSize: 14,
              }}
            >
              Book a Call
            </a>
          </div>
          <p
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.25)",
            }}
          >
            MarketHub Pro — Social Media Marketing for Businesses
          </p>
        </footer>
      </div>

      {/* Invisible tracking pixel */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/prospect-page/track?slug=${encodeURIComponent(slug)}`}
        alt=""
        width={1}
        height={1}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          opacity: 0,
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.06)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 12,
        padding: "16px 20px",
        boxShadow:
          "0 2px 12px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.08)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 4,
        }}
      >
        {icon}
        <span
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.45)",
            textTransform: "uppercase",
            letterSpacing: 1,
            fontWeight: 600,
          }}
        >
          {label}
        </span>
      </div>
      <div
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: "rgba(255,255,255,0.9)",
          wordBreak: "break-all",
        }}
      >
        {value}
      </div>
    </div>
  );
}
