/**
 * POST /api/offer/checkout — one-time payment for the AI Marketing Accelerator DFY package.
 *
 * Public (no auth) — prospects buying the founding-client offer before they have accounts.
 * Uses Stripe Checkout in `payment` mode with inline `price_data` (no pre-created Price IDs).
 */

import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

type Tier = "ro" | "global" | "de" | "fr" | "it" | "es" | "pt";

const TIERS: Record<Tier, { label: string; amount: number; currency: "eur" }> = {
  ro:     { label: "AI Marketing Accelerator — Romania (Founding Client)",        amount: 49900,  currency: "eur" },
  global: { label: "AI Marketing Accelerator — Global (Founding Client)",         amount: 100000, currency: "eur" },
  de:     { label: "AI Marketing Accelerator — Deutschland (Gründerpreis)",        amount: 150000, currency: "eur" },
  fr:     { label: "AI Marketing Accelerator — France (Client Fondateur)",        amount: 120000, currency: "eur" },
  it:     { label: "AI Marketing Accelerator — Italia (Cliente Fondatore)",       amount: 90000,  currency: "eur" },
  es:     { label: "AI Marketing Accelerator — España (Cliente Fundador)",        amount: 90000,  currency: "eur" },
  pt:     { label: "AI Marketing Accelerator — Portugal (Cliente Fundador)",      amount: 70000,  currency: "eur" },
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      tier?: Tier;
      email?: string;
      business_name?: string;
      website?: string;
    };
    const tier = body.tier;
    if (!tier || !(tier in TIERS)) {
      return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
    }
    const cfg = TIERS[tier];

    const origin = req.headers.get("origin") ?? "https://markethubpromo.com";

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: cfg.currency,
            product_data: {
              name: cfg.label,
              description:
                "60 ready-to-post captions · 20 AI-generated images · 30-day content calendar · Lead generation setup · Strategic call. Delivered in 5–7 days.",
            },
            unit_amount: cfg.amount,
          },
          quantity: 1,
        },
      ],
      customer_email: body.email || undefined,
      metadata: {
        offer: "ai_marketing_accelerator",
        tier,
        business_name: (body.business_name || "").slice(0, 100),
        website: (body.website || "").slice(0, 200),
      },
      success_url: `${origin}/offer/thanks?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/offer?canceled=1`,
      allow_promotion_codes: false,
      billing_address_collection: "auto",
    });

    return NextResponse.json({ url: session.url, id: session.id });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Checkout failed" },
      { status: 500 },
    );
  }
}
