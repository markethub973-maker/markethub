/**
 * Brain Command Center — server-rendered dashboard for the solo founder.
 * Accessed via brain.markethubpromo.com (middleware rewrites / to here
 * and gates on the `brain_admin` cookie).
 *
 * Pulls real state via /api/brain/advisor using the cron secret so it
 * works without a Supabase session — this subdomain is out-of-band.
 */

import { headers } from "next/headers";
import { createServiceClient } from "@/lib/supabase/service";
import BrainActionList from "@/components/brain/BrainActionList";
import BrainMetricTiles from "@/components/brain/BrainMetricTiles";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface Recommendation {
  action: string;
  why: string;
  priority: "high" | "medium" | "low";
  tool: string;
  app_path: string;
  estimated_hours?: number;
}
interface AdvisorState {
  total_users: number;
  paying_users: number;
  trial_users: number;
  mrr_usd: number;
  new_signups_7d: number;
  published_posts_30d: number;
  scheduled_posts_next_7d: number;
  leads_total: number;
  leads_new_7d: number;
  ai_assets_30d: number;
  brand_voice_configured: boolean;
  content_strategy_configured: boolean;
}
interface AdvisorResp {
  ok?: boolean;
  state?: AdvisorState;
  summary_headline?: string;
  recommendations?: Recommendation[];
  error?: string;
}

async function fetchAdvisor(): Promise<AdvisorResp | null> {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  // Hit the real app host, not brain.* (which is middleware-blocked from /api/brain)
  const url = "https://markethubpromo.com/api/brain/advisor";
  const secret = process.env.BRAIN_CRON_SECRET;
  if (!secret) return null;
  try {
    const res = await fetch(url, {
      headers: { "x-brain-cron-secret": secret },
      cache: "no-store",
    });
    if (!res.ok) return { error: `Advisor ${res.status}` };
    return (await res.json()) as AdvisorResp;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "advisor fetch failed" };
  }
}

async function recentOfferSales(): Promise<number> {
  // Rough pipeline: count Stripe-paid Accelerator sales from logs. Without a
  // dedicated table, return 0. This widget updates itself as soon as we wire
  // the webhook into a "offer_sales" table (follow-up).
  return 0;
}

export default async function BrainCommandCenter() {
  const advisor = await fetchAdvisor();
  const sales = await recentOfferSales();
  const state = advisor?.state;
  const recs = advisor?.recommendations ?? [];
  const headline = advisor?.summary_headline ?? "";
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const target = 3000;
  const mrr = state?.mrr_usd ?? 0;
  const progress = Math.min(100, Math.round((mrr / target) * 100));

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: "#0F0F14",
        color: "white",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <header className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center font-bold"
            style={{ backgroundColor: "#F59E0B", color: "black" }}
          >
            A
          </div>
          <div>
            <p className="text-sm font-semibold">Alex · Brain Command Center</p>
            <p className="text-xs" style={{ color: "#888" }}>
              {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </p>
          </div>
        </div>
        <form action="/api/brain-admin/logout" method="POST">
          <button
            type="submit"
            className="text-xs px-3 py-1 rounded-md"
            style={{
              backgroundColor: "rgba(255,255,255,0.06)",
              color: "#bbb",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            Sign out
          </button>
        </form>
      </header>

      <main className="max-w-6xl mx-auto px-6 pb-12 space-y-6">
        {/* Focus banner */}
        <section
          className="rounded-2xl p-6"
          style={{
            background: "linear-gradient(135deg, #1A1A24 0%, #2A1F0F 100%)",
            border: "1px solid rgba(245,158,11,0.2)",
          }}
        >
          <p className="text-xs uppercase tracking-wider font-bold mb-2" style={{ color: "#F59E0B" }}>
            Today's focus
          </p>
          <h1 className="text-2xl font-bold leading-tight mb-1">
            {greeting}, Eduard.
          </h1>
          <p className="text-sm" style={{ color: "#ccc" }}>
            {headline || "Brain is computing today's focus — refresh in a moment."}
          </p>
        </section>

        {/* Metric tiles */}
        <BrainMetricTiles
          mrr={mrr}
          target={target}
          progress={progress}
          state={state ?? null}
          offerSales={sales}
        />

        {/* Brain actions */}
        <section>
          <p className="text-xs uppercase tracking-wider font-bold mb-3" style={{ color: "#888" }}>
            Brain's recommendations · decide now
          </p>
          <BrainActionList recs={recs} advisorError={advisor?.error} />
        </section>

        {/* Quick actions */}
        <section>
          <p className="text-xs uppercase tracking-wider font-bold mb-3" style={{ color: "#888" }}>
            Quick actions
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Send outreach batch", href: "/outreach" },
              { label: "Review outreach queue", href: "https://markethubpromo.com/growth/lead-finder" },
              { label: "Today's content draft", href: "https://markethubpromo.com/studio/campaign" },
              { label: "Open Accelerator sales", href: "https://dashboard.stripe.com/payments?activity=succeeded" },
              { label: "View app admin", href: "https://markethubpromo.com/dashboard/admin/brain" },
            ].map((a) => (
              <a
                key={a.label}
                href={a.href}
                target="_blank"
                rel="noopener"
                className="block p-4 rounded-xl text-sm hover:brightness-110 transition-all"
                style={{
                  backgroundColor: "#1A1A24",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <span style={{ color: "#F59E0B", fontWeight: 600 }}>→ </span>
                {a.label}
              </a>
            ))}
          </div>
        </section>
      </main>

      <footer className="max-w-6xl mx-auto px-6 py-8 text-center text-xs" style={{ color: "#555" }}>
        Private · alex@markethubpromo.com · Brain v1 · MarketHub Pro CEO mode
      </footer>
    </div>
  );
}

/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
void createServiceClient;
