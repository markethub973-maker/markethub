import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id, stripe_subscription_id, plan, subscription_plan, subscription_status, trial_expires_at")
    .eq("id", user.id)
    .single();

  if (!profile?.stripe_customer_id) {
    return NextResponse.json({
      plan: profile?.subscription_plan ?? profile?.plan ?? "free_test",
      status: profile?.subscription_status ?? "active",
      trial_expires_at: profile?.trial_expires_at ?? null,
      invoices: [],
      payment_method: null,
      subscription: null,
    });
  }

  const stripe = getStripe();

  // Fetch invoices, payment method and subscription in parallel
  const [invoicesRes, paymentMethodsRes, subscriptionRes] = await Promise.allSettled([
    stripe.invoices.list({ customer: profile.stripe_customer_id, limit: 12 }),
    stripe.paymentMethods.list({ customer: profile.stripe_customer_id, type: "card" }),
    profile.stripe_subscription_id
      ? stripe.subscriptions.retrieve(profile.stripe_subscription_id)
      : Promise.resolve(null),
  ]);

  const invoices = invoicesRes.status === "fulfilled"
    ? invoicesRes.value.data.map((inv) => ({
        id: inv.id,
        number: inv.number,
        amount: inv.amount_paid / 100,
        currency: inv.currency.toUpperCase(),
        status: inv.status,
        date: new Date(inv.created * 1000).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" }),
        pdf: inv.invoice_pdf,
        period_start: new Date((inv.period_start ?? inv.created) * 1000).toLocaleDateString("en-US", { month: "short", year: "numeric" }),
        period_end: new Date((inv.period_end ?? inv.created) * 1000).toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      }))
    : [];

  const cards = paymentMethodsRes.status === "fulfilled" ? paymentMethodsRes.value.data : [];
  const card = cards[0]?.card ?? null;
  const paymentMethod = card
    ? { brand: card.brand, last4: card.last4, exp_month: card.exp_month, exp_year: card.exp_year }
    : null;

  const sub = subscriptionRes.status === "fulfilled" ? subscriptionRes.value : null;
  const subscription = sub && typeof sub === "object" && "current_period_end" in sub
    ? {
        current_period_end: new Date((sub as any).current_period_end * 1000).toLocaleDateString("en-US", { day: "2-digit", month: "long", year: "numeric" }),
        cancel_at_period_end: (sub as any).cancel_at_period_end,
        status: (sub as any).status,
      }
    : null;

  return NextResponse.json({
    plan: profile.subscription_plan ?? profile.plan,
    status: profile.subscription_status,
    trial_expires_at: profile.trial_expires_at,
    invoices,
    payment_method: paymentMethod,
    subscription,
  });
}
