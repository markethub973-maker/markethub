"use client";

/**
 * /offer/thanks — post-checkout confirmation page.
 *
 * Stripe redirects here with ?session_id=cs_xxx after successful payment.
 * We just show a confirmation + next-steps; the actual fulfillment is
 * triggered by the Stripe webhook (email + Brain intake task creation).
 */

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Mail, Calendar, Clock } from "lucide-react";

export default function OfferThanksPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ backgroundColor: "#FAFAF8" }} />}>
      <ThanksContent />
    </Suspense>
  );
}

function ThanksContent() {
  const sp = useSearchParams();
  const sessionId = sp?.get("session_id") ?? null;

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#FAFAF8", color: "#1C1814" }}>
      <div className="max-w-xl mx-auto px-6 py-16 text-center">
        <div
          className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-5"
          style={{ backgroundColor: "#10B981" }}
        >
          <Check className="w-8 h-8" style={{ color: "white" }} />
        </div>

        <h1 className="text-3xl font-bold mb-2">You&apos;re in. Welcome aboard.</h1>
        <p className="opacity-70 mb-8">
          Your founding-client spot is secured. Here&apos;s what happens next.
        </p>

        <div className="text-left space-y-3 mb-8">
          {[
            { icon: Mail,     t: "Check your inbox (next 5 min)", d: "Intake form + onboarding details from office@markethubpromo.com" },
            { icon: Calendar, t: "Strategy call link (within 24h)", d: "We'll propose 3 slots — pick whichever works." },
            { icon: Clock,    t: "Delivery in 5-7 days", d: "60 captions + 20 images + content calendar + leads shipped to you." },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl" style={{ backgroundColor: "white", border: "1px solid rgba(0,0,0,0.06)" }}>
                <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: "#F59E0B" }} />
                <div>
                  <p className="font-bold text-sm">{s.t}</p>
                  <p className="text-xs opacity-70">{s.d}</p>
                </div>
              </div>
            );
          })}
        </div>

        {sessionId && (
          <p className="text-xs opacity-40 font-mono">Ref: {sessionId.slice(0, 20)}...</p>
        )}

        <p className="text-xs opacity-60 mt-6">
          Any issues? Reply to the confirmation email or write to
          {" "}
          <a href="mailto:office@markethubpromo.com" style={{ color: "#F59E0B" }}>
            office@markethubpromo.com
          </a>
        </p>
      </div>
    </div>
  );
}
