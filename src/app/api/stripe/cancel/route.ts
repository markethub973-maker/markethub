import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { requireAuth } from "@/lib/route-helpers";

// POST — schedule subscription cancellation at period end
export async function POST() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const user = { id: auth.userId };
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_subscription_id")
    .eq("id", auth.userId)
    .single();

  if (!profile?.stripe_subscription_id) {
    return NextResponse.json({ error: "No active subscription found" }, { status: 400 });
  }

  try {
    const stripe = getStripe();
    await stripe.subscriptions.update(profile.stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    return NextResponse.json({ ok: true, cancel_at_period_end: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[stripe/cancel] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE — undo the scheduled cancellation (reactivate)
export async function DELETE() {
  const auth = await requireAuth(); if (!auth.ok) return auth.response;
  const user = { id: auth.userId }; const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_subscription_id")
    .eq("id", auth.userId)
    .single();

  if (!profile?.stripe_subscription_id) {
    return NextResponse.json({ error: "No active subscription found" }, { status: 400 });
  }

  try {
    const stripe = getStripe();
    await stripe.subscriptions.update(profile.stripe_subscription_id, {
      cancel_at_period_end: false,
    });

    return NextResponse.json({ ok: true, cancel_at_period_end: false });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[stripe/cancel] undo error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
