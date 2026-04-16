/**
 * GET /api/brain/stripe-mrr — real MRR straight from Stripe.
 *
 * Single source of truth for revenue. Instead of trusting profiles.plan
 * (which drifts out of sync with Stripe — legacy test values like
 * "enterprise"/"business"/"lite" exist even though we've never sold them),
 * this endpoint paginates Stripe subscriptions (status=active) and sums
 * the per-month price of each.
 *
 * Currency: Stripe returns amounts in the subscription's charge currency
 * (USD for our current pricing). Account is in RON — payouts convert
 * automatically. MRR is reported here in USD (primary) + RON estimate at
 * today's ~5 RON/USD rate so Eduard sees both.
 *
 * Auth: x-brain-cron-secret OR brain_admin cookie.
 */

import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authOk(req: NextRequest): boolean {
  const cookieOk = req.cookies.get("brain_admin")?.value === "1";
  const cronOk =
    req.headers.get("x-brain-cron-secret") &&
    req.headers.get("x-brain-cron-secret") === process.env.BRAIN_CRON_SECRET;
  return Boolean(cookieOk || cronOk);
}

// Rough RON/USD reference for display only. Real payout uses Stripe's
// daily rate (fetch from Stripe balance_transactions if precision needed).
const RON_PER_USD = 5.0;

interface Plan {
  plan: string; // our plan nickname (from Stripe Product name or metadata)
  count: number;
  usd_per_month_each: number;
  total_usd: number;
}

export async function GET(req: NextRequest) {
  if (!authOk(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const stripe = getStripe();

    const byPlan = new Map<string, Plan>();
    let totalSubs = 0;
    let totalUsdMonthly = 0;

    // Paginate active subscriptions
    let startingAfter: string | undefined;
    for (let page = 0; page < 10; page++) {
      // hard cap 10 pages = 1000 subs — plenty for this stage
      const list = await stripe.subscriptions.list({
        status: "active",
        limit: 100,
        expand: ["data.items.data.price.product"],
        starting_after: startingAfter,
      });

      for (const sub of list.data) {
        totalSubs += 1;
        for (const item of sub.items.data) {
          const price = item.price;
          const qty = item.quantity ?? 1;
          if (!price.unit_amount) continue;

          // Normalize to monthly USD
          const interval = price.recurring?.interval ?? "month";
          const intervalCount = price.recurring?.interval_count ?? 1;
          let monthly = price.unit_amount / 100; // cents → dollars
          if (interval === "year") monthly = monthly / 12;
          if (interval === "week") monthly = monthly * (52 / 12);
          if (interval === "day") monthly = monthly * 30;
          monthly = monthly / intervalCount;

          // Plan identification: Product name > price nickname > ID
          type ProductLike = { name?: string; id?: string };
          const product = (price.product as ProductLike | string | null);
          const planName =
            (typeof product === "object" && product && product.name) ||
            price.nickname ||
            (typeof product === "string" ? product : price.id) ||
            "unknown";

          const row = byPlan.get(planName) ?? {
            plan: planName,
            count: 0,
            usd_per_month_each: monthly,
            total_usd: 0,
          };
          row.count += qty;
          row.total_usd += monthly * qty;
          byPlan.set(planName, row);
          totalUsdMonthly += monthly * qty;
        }
      }

      if (!list.has_more) break;
      startingAfter = list.data[list.data.length - 1]?.id;
      if (!startingAfter) break;
    }

    const breakdown = Array.from(byPlan.values()).sort((a, b) => b.total_usd - a.total_usd);

    return NextResponse.json({
      ok: true,
      generated_at: new Date().toISOString(),
      mrr_usd: Math.round(totalUsdMonthly * 100) / 100,
      mrr_ron_estimate: Math.round(totalUsdMonthly * RON_PER_USD * 100) / 100,
      ron_per_usd_used: RON_PER_USD,
      active_subscriptions: totalSubs,
      plans: breakdown,
      note:
        totalSubs === 0
          ? "0 active subscriptions — if you have live paying clients, verify STRIPE_SECRET_KEY points to LIVE mode, not test"
          : undefined,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ error: `stripe query failed: ${msg}` }, { status: 500 });
  }
}
