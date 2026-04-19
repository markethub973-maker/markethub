/**
 * GET /api/admin/finance
 * Returns real-time financial dashboard:
 *  - Revenue: subscriptions per plan
 *  - Costs: each API/service subscription (Supabase, Vercel, Anthropic, Apify, Resend, RapidAPI, Stripe)
 *  - Net profit = revenue - total costs
 *
 * POST /api/admin/finance
 * Update manual cost entries (Supabase, Vercel, Apify monthly bills).
 *
 * Auth: HMAC admin token (isAdminAuthorized)
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isAdminAuthorized } from "@/lib/adminAuth";

// ── Plan prices (must match plan-config.ts) ──────────────────────────────────
const PLAN_PRICES: Record<string, number> = {
  free_test:  0,
  lite:       24,
  pro:        49,
  business:   99,
  agency: 249,
};

// ── Default monthly costs for each service (admin can override) ───────────────
const DEFAULT_COSTS: ServiceCost[] = [
  {
    service:     "Supabase",
    category:    "database",
    icon:        "🗄️",
    plan_name:   "Pro",
    monthly_usd: 25,
    billing_url: "https://supabase.com/dashboard/org/billing",
    notes:       "Database + Auth + Storage + Edge Functions",
  },
  {
    service:     "Vercel",
    category:    "hosting",
    icon:        "▲",
    plan_name:   "Hobby (free)",
    monthly_usd: 0,
    billing_url: "https://vercel.com/account/billing",
    notes:       "Hobby plan — upgrade to Pro at $20/mo for teams",
  },
  {
    service:     "Anthropic (Claude AI)",
    category:    "ai",
    icon:        "🤖",
    plan_name:   "Pay-as-you-go",
    monthly_usd: 0,      // populated dynamically from usage_tracking
    billing_url: "https://console.anthropic.com/settings/billing",
    notes:       "Calculated from actual token usage in DB",
    dynamic:     true,
  },
  {
    service:     "Apify",
    category:    "scraping",
    icon:        "🕷️",
    plan_name:   "Starter",
    monthly_usd: 49,
    billing_url: "https://console.apify.com/billing",
    notes:       "Web scraping + actor runs",
  },
  {
    service:     "Resend",
    category:    "email",
    icon:        "📧",
    plan_name:   "Pro",
    monthly_usd: 20,
    billing_url: "https://resend.com/billing",
    notes:       "Transactional email — up to 50k emails/month",
  },
  {
    service:     "RapidAPI (Instagram scraper)",
    category:    "scraping",
    icon:        "📸",
    plan_name:   "Basic",
    monthly_usd: 10,
    billing_url: "https://rapidapi.com/hub",
    notes:       "instagram-public-bulk-scraper",
  },
  {
    service:     "Stripe",
    category:    "payments",
    icon:        "💳",
    plan_name:   "Pay-as-you-go",
    monthly_usd: 0,      // 2.9% + $0.30 per transaction — calculated from revenue
    billing_url: "https://dashboard.stripe.com/billing",
    notes:       "2.9% + $0.30 per successful charge (auto-calculated)",
    dynamic:     true,
  },
  {
    service:     "Domain / DNS",
    category:    "infrastructure",
    icon:        "🌐",
    plan_name:   "Annual",
    monthly_usd: 1.5,
    billing_url: "",
    notes:       "Domain registration ~$18/year → $1.50/month",
  },
];

interface ServiceCost {
  service:     string;
  category:    string;
  icon:        string;
  plan_name:   string;
  monthly_usd: number;
  billing_url: string;
  notes:       string;
  dynamic?:    boolean;
}

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supa = createServiceClient();
  const monthKey = new Date().toISOString().substring(0, 7);

  // ── 1. Revenue from subscriptions ────────────────────────────────────────
  const { data: profiles } = await supa
    .from("profiles")
    .select("subscription_plan, subscription_status, is_blocked");

  const activeProfiles = (profiles || []).filter(
    (p: any) => !p.is_blocked && p.subscription_status === "active"
  );

  const revenueByPlan: Record<string, { count: number; revenue: number }> = {};
  let totalRevenue = 0;
  activeProfiles.forEach((p: any) => {
    const plan = p.subscription_plan || "free_test";
    const price = PLAN_PRICES[plan] ?? 0;
    if (!revenueByPlan[plan]) revenueByPlan[plan] = { count: 0, revenue: 0 };
    revenueByPlan[plan].count++;
    revenueByPlan[plan].revenue += price;
    totalRevenue += price;
  });

  // ── 2. Actual Anthropic/AI cost this month from usage_tracking ───────────
  let totalAiCost = 0;
  try {
    const { data: usageRows } = await supa
      .from("usage_tracking")
      .select("cost_usd")
      .eq("month_year", monthKey);
    totalAiCost = (usageRows || []).reduce(
      (s: number, r: any) => s + (r.cost_usd || 0), 0
    );
  } catch { /* ignore */ }

  // ── 3. Admin-overridden costs from DB (admin_platform_config) ────────────
  let savedCosts: Record<string, number> = {};
  try {
    const { data } = await supa
      .from("admin_platform_config")
      .select("extra_data")
      .eq("platform", "service_costs")
      .single();
    if (data?.extra_data) savedCosts = data.extra_data as Record<string, number>;
  } catch { /* use defaults */ }

  // ── 4. Build costs array — fill dynamic values ───────────────────────────
  const stripeFee = parseFloat((totalRevenue * 0.029 + (activeProfiles.filter((p: any) => PLAN_PRICES[p.subscription_plan ?? "free_test"] > 0).length * 0.30)).toFixed(2));

  const costs: (ServiceCost & { monthly_usd: number })[] = DEFAULT_COSTS.map(c => {
    let usd = savedCosts[c.service] ?? c.monthly_usd;
    if (c.service === "Anthropic (Claude AI)") usd = parseFloat(totalAiCost.toFixed(2));
    if (c.service === "Stripe")                usd = stripeFee;
    return { ...c, monthly_usd: usd };
  });

  const totalCosts = costs.reduce((s, c) => s + c.monthly_usd, 0);
  const netProfit  = totalRevenue - totalCosts;

  return NextResponse.json({
    success: true,
    month: monthKey,
    revenue: {
      total: parseFloat(totalRevenue.toFixed(2)),
      by_plan: revenueByPlan,
      paying_users: activeProfiles.filter((p: any) => (PLAN_PRICES[p.subscription_plan ?? "free_test"] ?? 0) > 0).length,
      free_users:   activeProfiles.filter((p: any) => (PLAN_PRICES[p.subscription_plan ?? "free_test"] ?? 0) === 0).length,
    },
    costs: {
      total:    parseFloat(totalCosts.toFixed(2)),
      items:    costs,
      by_category: groupBy(costs, "category"),
    },
    net_profit: parseFloat(netProfit.toFixed(2)),
    margin_pct: totalRevenue > 0
      ? parseFloat(((netProfit / totalRevenue) * 100).toFixed(1))
      : 0,
  });
}

function groupBy<T extends Record<string, any>>(arr: T[], key: keyof T) {
  return arr.reduce((acc, item) => {
    const k = String(item[key]);
    if (!acc[k]) acc[k] = { total: 0, items: [] as T[] };
    acc[k].total = parseFloat((acc[k].total + item.monthly_usd).toFixed(2));
    acc[k].items.push(item);
    return acc;
  }, {} as Record<string, { total: number; items: T[] }>);
}

// ── POST: override a service cost ────────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  // body: { service: string, monthly_usd: number }
  const { service, monthly_usd } = body;
  if (!service || monthly_usd === undefined) {
    return NextResponse.json({ error: "service and monthly_usd required" }, { status: 400 });
  }

  const supa = createServiceClient();

  // Load existing saved costs
  let savedCosts: Record<string, number> = {};
  try {
    const { data } = await supa
      .from("admin_platform_config")
      .select("extra_data")
      .eq("platform", "service_costs")
      .single();
    if (data?.extra_data) savedCosts = data.extra_data as Record<string, number>;
  } catch { /* ignore */ }

  savedCosts[service] = parseFloat(monthly_usd);

  await supa
    .from("admin_platform_config")
    .upsert({ platform: "service_costs", extra_data: savedCosts }, { onConflict: "platform" });

  return NextResponse.json({ success: true, saved: savedCosts });
}
