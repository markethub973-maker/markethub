/**
 * POST /api/credits — create Stripe checkout session to purchase AI credit packs
 * Uses the same Stripe account and API key as the rest of the app.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { CREDIT_PACKS } from "@/lib/plan-config";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { pack_id } = await req.json();

  const pack = CREDIT_PACKS.find(p => p.id === pack_id);
  if (!pack) {
    return NextResponse.json({ error: "Invalid credit pack" }, { status: 400 });
  }

  const stripe = getStripe();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // Get or create Stripe customer tied to this Supabase user
  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id, name")
    .eq("id", user.id)
    .single();

  let customerId = profile?.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: profile?.name ?? undefined,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;
    await supabase.from("profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);
  }

  // Create a one-time price for the credit pack
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: pack.label,
            description: `${pack.credits.toLocaleString()} AI credits${pack.bonus_pct > 0 ? ` (+${pack.bonus_pct}% bonus)` : ""} — valid for current month`,
            metadata: { pack_id: pack.id },
          },
          unit_amount: pack.usd * 100, // cents
        },
        quantity: 1,
      },
    ],
    metadata: {
      type: "ai_credits",
      pack_id: pack.id,
      credits_usd: pack.usd.toString(),
      user_id: user.id,
    },
    success_url: `${baseUrl}/settings?tab=credits&success=1&pack=${pack.id}`,
    cancel_url:  `${baseUrl}/settings?tab=credits&cancelled=1`,
  });

  return NextResponse.json({ checkout_url: session.url });
}

// ── GET — list available credit packs ────────────────────────────────────────
export async function GET() {
  return NextResponse.json({ packs: CREDIT_PACKS });
}
