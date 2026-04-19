import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getStripe, RESELLER_TIERS, type ResellerTierId } from "@/lib/stripe";

const VALID_TIERS: ResellerTierId[] = ["emerging", "southeast", "europe", "premium", "ultra"];

export async function POST(req: Request) {
  try {
    const { name, email, password, tier } = await req.json();

    // Validate inputs
    if (!name?.trim() || !email?.trim() || !password?.trim()) {
      return NextResponse.json({ error: "All fields are required." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }

    const validTier = tier as ResellerTierId;
    if (!VALID_TIERS.includes(validTier)) {
      return NextResponse.json(
        { error: `Invalid tier. Choose one of: ${VALID_TIERS.join(", ")}.` },
        { status: 400 },
      );
    }

    const planConfig = RESELLER_TIERS[validTier];

    const supabase = createServiceClient();
    const stripe = getStripe();

    // Create user in Supabase Auth (service role = email auto-confirmed)
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
      user_metadata: { name: name.trim() },
    });

    if (authError) {
      // Duplicate email
      if (authError.message?.includes("already") || authError.message?.includes("exists")) {
        return NextResponse.json(
          { error: "An account with this email already exists. Please log in instead." },
          { status: 409 },
        );
      }
      console.error("[reseller/signup] auth error:", authError.message);
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const userId = authUser.user.id;

    // Update profile: set role to reseller, set plan
    await supabase
      .from("profiles")
      .update({
        role: "reseller",
        subscription_plan: `reseller_${validTier}`,
        name: name.trim(),
      })
      .eq("id", userId);

    // Create Stripe customer
    const customer = await stripe.customers.create({
      email: email.trim(),
      name: name.trim(),
      metadata: { supabase_user_id: userId, role: "reseller", tier: validTier },
    });

    // Save Stripe customer ID to profile
    await supabase
      .from("profiles")
      .update({ stripe_customer_id: customer.id })
      .eq("id", userId);

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: planConfig.priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/reseller/dashboard?subscribed=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/reseller/signup?tier=${validTier}`,
      metadata: { user_id: userId, role: "reseller", tier: validTier },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[reseller/signup] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
