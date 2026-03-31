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

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as any;
    const userId = session.metadata?.user_id;
    const plan = session.metadata?.plan;
    const sessionType = session.metadata?.type;

    // ── AI credit pack purchase ──────────────────────────────────────────
    if (sessionType === "ai_credits" && userId) {
      const creditsUsd = parseFloat(session.metadata?.credits_usd ?? "0");
      const currentMonth = new Date().toISOString().substring(0, 7);

      // Upsert into ai_credits table (add to existing balance for this month)
      const { data: existing } = await supabase
        .from("ai_credits")
        .select("id, credits_usd")
        .eq("user_id", userId)
        .eq("month_year", currentMonth)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("ai_credits")
          .update({ credits_usd: existing.credits_usd + creditsUsd })
          .eq("id", existing.id);
      } else {
        await supabase.from("ai_credits").insert({
          user_id: userId,
          month_year: currentMonth,
          credits_usd: creditsUsd,
          purchased_at: new Date().toISOString(),
        });
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
