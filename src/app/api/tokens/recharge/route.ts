import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRechargePacks } from "@/lib/token-plan-config";
import Stripe from "stripe";

const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY || "");

/**
 * GET /api/tokens/recharge
 * Get available recharge packs for user's plan
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data: profile } = await supabase
      .from("profiles")
            .select("subscription_plan")
      .eq("id", user.id)
      .single();

    const planId = profile?.subscription_plan || "free_test";
    const packs = getRechargePacks(planId);

    return NextResponse.json({
      plan: planId,
      available_packs: packs.map(pack => ({
        id: pack.id,
        tokens: pack.tokens,
        price: pack.price,
        bonus_pct: pack.bonus_pct,
        bonus_tokens: Math.floor(pack.tokens * (pack.bonus_pct / 100)),
        total_tokens: pack.tokens + Math.floor(pack.tokens * (pack.bonus_pct / 100)),
        price_per_1k_tokens: parseFloat(((pack.price / (pack.tokens / 1000)) * 1000).toFixed(4)),
      })),
      can_recharge: packs.length > 0,
    });

  } catch (error: any) {
    console.error("[Token Recharge] Error:", error.message);
    return NextResponse.json(
      { error: error.message, type: "system_error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tokens/recharge
 * Create Stripe checkout for token recharge
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { pack_id } = await req.json();

  if (!pack_id) {
    return NextResponse.json(
      { error: "pack_id is required" },
      { status: 400 }
    );
  }

  try {
    // Get user's plan and available packs
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_plan, stripe_customer_id")
      .eq("id", user.id)
      .single();

    const packs = getRechargePacks(profile?.subscription_plan);
    const selectedPack = packs.find(p => p.id === pack_id);

    if (!selectedPack) {
      return NextResponse.json(
        { error: "Pack not found for your plan" },
        { status: 404 }
      );
    }

    // Create or get Stripe customer
    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      const stripe = getStripe();
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          user_id: user.id,
        },
      });
      customerId = customer.id;

      // Save customer ID
      await supabase
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);
    }

    // Create checkout session
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Token Recharge - ${selectedPack.tokens.toLocaleString()} tokens`,
              description: `${(selectedPack.tokens + Math.floor(selectedPack.tokens * (selectedPack.bonus_pct / 100))).toLocaleString()} total tokens (${selectedPack.bonus_pct > 0 ? `+${selectedPack.bonus_pct}% bonus` : "no bonus"})`,
              metadata: {
                pack_id: selectedPack.id,
                tokens: selectedPack.tokens.toString(),
                bonus_pct: selectedPack.bonus_pct.toString(),
              },
            },
            unit_amount: selectedPack.price * 100, // cents
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: "token_recharge",
        pack_id: selectedPack.id,
        tokens: selectedPack.tokens.toString(),
        bonus_pct: selectedPack.bonus_pct.toString(),
        user_id: user.id,
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?tab=tokens&success=1&pack=${pack_id}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?tab=tokens&cancelled=1`,
    });

    return NextResponse.json({
      checkout_url: session.url,
      session_id: session.id,
    });

  } catch (error: any) {
    console.error("[Token Recharge Checkout] Error:", error.message);
    return NextResponse.json(
      { error: error.message, type: "system_error" },
      { status: 500 }
    );
  }
}
