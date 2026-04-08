import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createServerClient } from "@supabase/ssr";
import { sendPaymentConfirmationEmail, sendSubscriptionCancelledEmail, sendAdminPaymentFailedAlert } from "@/lib/resend";

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Webhook invalid." }, { status: 400 });
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  // Idempotency: each Stripe event_id may only be processed once
  const { error: idemErr } = await supabase
    .from("stripe_webhook_events")
    .insert({ event_id: event.id, event_type: event.type });
  if (idemErr) {
    // Code 23505 = unique violation = already processed → return success
    if ((idemErr as any).code === "23505") {
      return NextResponse.json({ received: true, replay: true });
    }
    // Any other error: fail closed so Stripe will retry
    console.error("[stripe webhook] idempotency insert failed:", idemErr);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as any;
    const userId = session.metadata?.user_id;
    const plan = session.metadata?.plan;
    const sessionType = session.metadata?.type;

    // ── AI credit pack purchase ──────────────────────────────────────────
    if (sessionType === "ai_credits" && userId) {
      const creditsUsd = parseFloat(session.metadata?.credits_usd ?? "0");
      const currentMonth = new Date().toISOString().substring(0, 7);

      // Atomic upsert via Postgres function — no lost updates
      const { error: rpcErr } = await supabase.rpc("add_ai_credits_atomic", {
        p_user: userId,
        p_month: currentMonth,
        p_amount: creditsUsd,
      });
      if (rpcErr) {
        console.error("[stripe webhook] add_ai_credits_atomic failed:", rpcErr);
        return NextResponse.json({ error: "credit insert failed" }, { status: 500 });
      }
    }

    // ── Subscription plan purchase ───────────────────────────────────────
    if (userId && plan) {
      await supabase.from("profiles").update({
        subscription_plan: plan,
        subscription_status: "active",
        trial_expires_at: null,
        stripe_subscription_id: session.subscription,
      }).eq("id", userId);

      const { data: profile } = await supabase
        .from("profiles")
        .select("email, name")
        .eq("id", userId)
        .single();
      if (profile?.email) {
        await sendPaymentConfirmationEmail(profile.email, profile.name ?? "", plan).catch(() => {});
      }
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as any;
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, name")
      .eq("stripe_subscription_id", sub.id)
      .single();

    await supabase.from("profiles")
      .update({ subscription_plan: "expired", subscription_status: "expired", stripe_subscription_id: null })
      .eq("stripe_subscription_id", sub.id);

    if (profile?.email) {
      await sendSubscriptionCancelledEmail(profile.email, profile.name ?? "").catch(() => {});
    }
  }

  // Handles plan upgrades, downgrades, and cancel_at_period_end changes
  if (event.type === "customer.subscription.updated") {
    const sub = event.data.object as any;
    const customerId = sub.customer as string;

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("stripe_customer_id", customerId)
      .single();

    if (profile) {
      // Determine new plan from price ID
      const priceId = sub.items?.data?.[0]?.price?.id as string | undefined;

      const { PLANS } = await import("@/lib/stripe");
      const matchedPlan = Object.entries(PLANS).find(
        ([, p]) => p.priceId === priceId
      )?.[0];

      const updates: Record<string, unknown> = {
        subscription_status: sub.status,
        stripe_subscription_id: sub.id,
      };

      if (matchedPlan) updates.subscription_plan = matchedPlan;

      await supabase.from("profiles").update(updates).eq("id", profile.id);
    }
  }

  if (event.type === "invoice.payment_failed") {
    const invoice = event.data.object as any;
    const customerId = invoice.customer as string;

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, email, name, subscription_plan")
      .eq("stripe_customer_id", customerId)
      .single();

    // Alert admin only — do not expose payment details to customer
    await sendAdminPaymentFailedAlert({
      customerEmail: profile?.email ?? "unknown",
      customerName: profile?.name ?? "unknown",
      plan: profile?.subscription_plan ?? "unknown",
      invoiceId: invoice.id,
      amount: (invoice.amount_due / 100).toFixed(2),
    }).catch(() => {});
  }

  return NextResponse.json({ received: true });
}
