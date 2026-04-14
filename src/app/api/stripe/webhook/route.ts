import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createServerClient } from "@supabase/ssr";
import { sendPaymentConfirmationEmail, sendSubscriptionCancelledEmail, sendAdminPaymentFailedAlert } from "@/lib/resend";
import { emitOblioInvoice } from "@/lib/oblio";
import { logSecurityEvent } from "@/lib/siem";

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    // Invalid signature is the #1 sign of a spoofed webhook — always log.
    void logSecurityEvent({
      event_type: "unusual_activity",
      severity: "high",
      ip: req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? undefined,
      path: "/api/stripe/webhook",
      details: { reason: "stripe_signature_invalid" },
    });
    return NextResponse.json({ error: "Webhook invalid." }, { status: 400 });
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  // Idempotency: each Stripe event_id may only be processed once.
  // Tolerant to missing table — if the migration hasn't been applied yet,
  // degrade gracefully (idempotency disabled with warning) instead of 500.
  const { error: idemErr } = await supabase
    .from("stripe_webhook_events")
    .insert({ event_id: event.id, event_type: event.type });
  if (idemErr) {
    const code = (idemErr as { code?: string }).code;
    // 23505 = unique violation = already processed → return success
    if (code === "23505") {
      void logSecurityEvent({
        event_type: "stripe_webhook_replay",
        path: "/api/stripe/webhook",
        details: { event_id: event.id, event_type: event.type },
      });
      return NextResponse.json({ received: true, replay: true });
    }
    // PGRST205 / 42P01 = table missing → migration pending, degrade gracefully
    if (code === "PGRST205" || code === "42P01") {
      console.warn("[stripe webhook] stripe_webhook_events table missing — idempotency disabled until migration is applied");
    } else {
      // Any other error: fail closed so Stripe will retry
      console.error("[stripe webhook] idempotency insert failed:", idemErr);
      return NextResponse.json({ error: "internal" }, { status: 500 });
    }
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as any;
    const userId = session.metadata?.user_id;
    const plan = session.metadata?.plan;
    const sessionType = session.metadata?.type;

    // ── AI Marketing Accelerator DFY offer purchase ──────────────────────
    // Public landing → one-time payment; no userId (prospect has no account yet).
    if (session.metadata?.offer === "ai_marketing_accelerator") {
      const tier = session.metadata?.tier ?? "unknown";
      const businessName = session.metadata?.business_name ?? "";
      const website = session.metadata?.website ?? "";
      const clientEmail =
        session.customer_email ??
        session.customer_details?.email ??
        session.metadata?.email ??
        null;
      const amount = ((session.amount_total ?? 0) / 100).toFixed(2);
      const currency = (session.currency ?? "eur").toUpperCase();

      if (clientEmail && process.env.RESEND_API_KEY) {
        // Welcome email from Alex persona — sets expectations for 5-7 day delivery.
        const welcomeHtml = `
          <div style="font-family:system-ui,-apple-system,sans-serif;max-width:640px;margin:0 auto;color:#222;">
            <p>Hi ${businessName ? `${businessName} team` : "there"},</p>
            <p>Alex here — I just saw your payment come through. Welcome aboard 🎉</p>
            <p>Here's exactly what happens next:</p>
            <ol style="padding-left:20px;line-height:1.7;">
              <li><b>Right now (auto):</b> this email, so you have a paper trail. Receipt is attached to the Stripe confirmation you'll get separately.</li>
              <li><b>Within 24h:</b> I'll send you a short intake form (brand voice, audience, what to avoid) — takes ~10 min to complete.</li>
              <li><b>Day 1:</b> 30-min strategy call on Zoom. I'll propose 3 slots.</li>
              <li><b>Day 5–7:</b> I deliver 60 captions + 20 images + 30-day calendar + 50 qualified leads — everything in your inbox, nothing to install.</li>
            </ol>
            <p>If you want to speed things up, reply to this email with:</p>
            <ul>
              <li>Your website (if not already shared): ${website || "—"}</li>
              <li>2–3 competitors whose content you like</li>
              <li>1–2 things you absolutely do <i>not</i> want in your content</li>
            </ul>
            <p>Looking forward to it.</p>
            <p>— Alex<br/>
            <span style="color:#888;font-size:12px;">Founder, MarketHub Pro<br/>
            alex@markethubpromo.com · markethubpromo.com</span></p>
            <hr style="margin-top:24px;border:0;border-top:1px solid #eee;"/>
            <p style="font-size:11px;color:#aaa;">Order ref: ${session.id} · ${currency} ${amount} · Tier: ${tier}</p>
          </div>`;
        try {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "Alex <alex@markethubpromo.com>",
              to: [clientEmail],
              bcc: ["office@markethubpromo.com"],
              subject: "Welcome aboard — your AI Marketing Accelerator kickoff",
              html: welcomeHtml,
              reply_to: "alex@markethubpromo.com",
            }),
          });
        } catch (e) {
          console.error("[stripe webhook] offer welcome email failed:", e);
        }

        // Internal alert — so operator sees the sale in real time.
        try {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "MarketHub Pro <office@markethubpromo.com>",
              to: ["markethub973@gmail.com"],
              subject: `💰 New Accelerator sale — ${currency} ${amount} (${tier})`,
              html: `
                <p><b>${currency} ${amount}</b> paid for AI Marketing Accelerator (<b>${tier}</b>).</p>
                <ul>
                  <li>Email: ${clientEmail}</li>
                  <li>Business: ${businessName || "—"}</li>
                  <li>Website: ${website || "—"}</li>
                  <li>Stripe session: ${session.id}</li>
                </ul>
                <p>Welcome email has been auto-sent from Alex to the client. Start onboarding.</p>`,
            }),
          });
        } catch (e) {
          console.error("[stripe webhook] offer internal alert failed:", e);
        }
      }

      return NextResponse.json({ received: true, offer: "ai_marketing_accelerator" });
    }

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
        const code = (rpcErr as { code?: string }).code;
        // PGRST202 = function missing → fall back to non-atomic SELECT+UPDATE
        // (lost-update race possible but acceptable until migration is applied)
        if (code === "PGRST202") {
          console.warn("[stripe webhook] add_ai_credits_atomic RPC missing — falling back to non-atomic upsert");
          const { data: existing } = await supabase
            .from("ai_credits")
            .select("credits_usd")
            .eq("user_id", userId)
            .eq("month_year", currentMonth)
            .maybeSingle();
          const newTotal = (existing?.credits_usd ?? 0) + creditsUsd;
          const fallbackErr = existing
            ? (await supabase
                .from("ai_credits")
                .update({ credits_usd: newTotal })
                .eq("user_id", userId)
                .eq("month_year", currentMonth)).error
            : (await supabase
                .from("ai_credits")
                .insert({ user_id: userId, month_year: currentMonth, credits_usd: creditsUsd })).error;
          if (fallbackErr) {
            console.error("[stripe webhook] fallback credit upsert failed:", fallbackErr);
            return NextResponse.json({ error: "credit insert failed" }, { status: 500 });
          }
        } else {
          console.error("[stripe webhook] add_ai_credits_atomic failed:", rpcErr);
          return NextResponse.json({ error: "credit insert failed" }, { status: 500 });
        }
      }
    }

    // ── Subscription plan purchase ───────────────────────────────────────
    if (userId && plan) {
      await supabase.from("profiles").update({
        plan,
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
        // Fetch invoice details from Stripe for the receipt email
        let invoiceExtra: Parameters<typeof sendPaymentConfirmationEmail>[3] = {};
        try {
          const stripe = (await import("@/lib/stripe")).getStripe();
          const sub = session.subscription
            ? await stripe.subscriptions.retrieve(session.subscription as string)
            : null;
          const invoiceId = typeof sub?.latest_invoice === "string"
            ? sub.latest_invoice
            : (sub?.latest_invoice as any)?.id;
          if (invoiceId) {
            const inv = await stripe.invoices.retrieve(invoiceId);
            invoiceExtra = {
              amountPaid: `$${((inv.amount_paid ?? 0) / 100).toFixed(2)}`,
              invoiceId: inv.id ?? "",
              invoicePdfUrl: inv.invoice_pdf ?? undefined,
              renewalDate: sub?.current_period_end
                ? new Date(sub.current_period_end * 1000).toLocaleDateString("en-US", { day: "2-digit", month: "long", year: "numeric" })
                : undefined,
            };
          }
        } catch { /* non-fatal — send email with defaults */ }

        await sendPaymentConfirmationEmail(
          profile.email,
          profile.name ?? "",
          plan,
          invoiceExtra
        ).catch(() => {});

        // Emite factură Oblio (non-fatal)
        void emitOblioInvoice({
          clientName: profile.name ?? profile.email,
          clientEmail: profile.email,
          plan,
          amountUsd: invoiceExtra.amountPaid ? parseFloat(invoiceExtra.amountPaid.replace("$", "")) : 0,
          stripeInvoiceId: invoiceExtra.invoiceId ?? session.id,
        }).then(result => {
          if (!result.ok) {
            console.error("[oblio] Invoice emit failed:", result.error);
          } else {
            console.log(`[oblio] Invoice emitted: ${result.seriesName}${result.number} — ${result.link}`);
          }
        });
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

  // Handles new subscriptions created outside of Checkout (e.g. direct API, trials)
  if (event.type === "customer.subscription.created") {
    const sub = event.data.object as any;
    const customerId = sub.customer as string;

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("stripe_customer_id", customerId)
      .single();

    if (profile) {
      const priceId = sub.items?.data?.[0]?.price?.id as string | undefined;
      const { PLANS } = await import("@/lib/stripe");
      const matchedPlan = Object.entries(PLANS).find(
        ([, p]) => p.priceId === priceId
      )?.[0];

      const updates: Record<string, unknown> = {
        subscription_status: sub.status,
        stripe_subscription_id: sub.id,
      };
      if (matchedPlan) { updates.plan = matchedPlan; updates.subscription_plan = matchedPlan; }

      await supabase.from("profiles").update(updates).eq("id", profile.id);
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

      if (matchedPlan) { updates.plan = matchedPlan; updates.subscription_plan = matchedPlan; }

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
