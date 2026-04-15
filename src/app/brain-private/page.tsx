/**
 * Brain Command Center — server-rendered dashboard for the solo founder.
 * Accessed via brain.markethubpromo.com (middleware rewrites / to here
 * and gates on the `brain_admin` cookie).
 *
 * Pulls real state via /api/brain/advisor using the cron secret so it
 * works without a Supabase session — this subdomain is out-of-band.
 */

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
  // Hit the direct Vercel hostname, NOT markethubpromo.com — Cloudflare
  // Bot Fight Mode returns 403 on server-to-server calls to the branded
  // domain. Same workaround as our cron-auto-post.yml, cron-health-monitor.yml.
  const url = "https://viralstat-dashboard.vercel.app/api/brain/advisor";
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

async function recentOfferSales(): Promise<{ count: number; revenue: number }> {
  // Live from Stripe — count Accelerator payments in last 30 days.
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) return { count: 0, revenue: 0 };
  const since = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
  try {
    const res = await fetch(
      `https://api.stripe.com/v1/checkout/sessions?limit=100&created[gte]=${since}`,
      { headers: { Authorization: `Bearer ${apiKey}` } },
    );
    if (!res.ok) return { count: 0, revenue: 0 };
    const d = (await res.json()) as { data?: Array<Record<string, unknown>> };
    const accelerator = (d.data ?? []).filter((s) => {
      const md = (s.metadata as Record<string, string> | undefined) ?? {};
      return md.offer === "ai_marketing_accelerator" && s.payment_status === "paid";
    });
    const revenue = accelerator.reduce(
      (sum, s) => sum + ((s.amount_total as number | undefined) ?? 0) / 100,
      0,
    );
    return { count: accelerator.length, revenue };
  } catch {
    return { count: 0, revenue: 0 };
  }
}

export default async function BrainCommandCenter() {
  const advisor = await fetchAdvisor();
  const salesData = await recentOfferSales();
  const sales = salesData.count;
  const state = advisor?.state;
  const recs = advisor?.recommendations ?? [];
  const headline = advisor?.summary_headline ?? "";
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const target = 3000;
  // Total revenue to date = SaaS MRR + Accelerator sales (one-time)
  const mrr = (state?.mrr_usd ?? 0) + salesData.revenue;
  const progress = Math.min(100, Math.round((mrr / target) * 100));

  return (
    <div
      className="min-h-screen"
      style={{
        background: `
          radial-gradient(800px 400px at 15% 0%, rgba(245,158,11,0.12), transparent 55%),
          radial-gradient(600px 350px at 85% 15%, rgba(168,85,247,0.08), transparent 50%),
          radial-gradient(500px 300px at 50% 100%, rgba(59,130,246,0.06), transparent 60%),
          linear-gradient(180deg, #0A0A10 0%, #0F0F18 100%)
        `,
        color: "white",
        fontFamily: "system-ui, -apple-system, sans-serif",
        minHeight: "100vh",
      }}
    >
      <header className="max-w-7xl mx-auto px-8 py-7 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg relative"
            style={{
              background: "linear-gradient(135deg, #F59E0B, #D97706)",
              color: "black",
              boxShadow: "0 6px 24px rgba(245,158,11,0.35), inset 0 1px 0 rgba(255,255,255,0.3)",
            }}
          >
            A
            <div
              className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full"
              style={{ backgroundColor: "#10B981", border: "2px solid #0A0A10" }}
              title="Alex is online"
            />
          </div>
          <div>
            <p className="text-base font-bold tracking-tight">Alex · Brain Command Center</p>
            <p className="text-xs flex items-center gap-2" style={{ color: "#999" }}>
              <span>{now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</span>
              <span style={{ color: "#444" }}>·</span>
              <span style={{ color: "#10B981" }}>● Online</span>
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

      <main className="max-w-7xl mx-auto px-8 pb-14 space-y-6">
        {/* Focus banner — executive briefing card */}
        <section
          className="rounded-3xl p-8 relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, rgba(26,26,36,0.95) 0%, rgba(42,31,15,0.95) 100%)",
            border: "1px solid rgba(245,158,11,0.25)",
            boxShadow: "0 20px 60px -12px rgba(245,158,11,0.15), inset 0 1px 0 rgba(255,255,255,0.05)",
            backdropFilter: "blur(10px)",
          }}
        >
          <div
            className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-20"
            style={{
              background: "radial-gradient(circle, rgba(245,158,11,0.4) 0%, transparent 70%)",
              transform: "translate(30%, -30%)",
            }}
          />
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
              { label: "🏛️ Enter Alex's Office", href: "/office" },
              { label: "Send outreach batch", href: "/outreach" },
              { label: "View pipeline", href: "/pipeline" },
              { label: "Generate demo for prospect", href: "/demo" },
              { label: "Mine leads (Apify)", href: "/mine-leads" },
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
