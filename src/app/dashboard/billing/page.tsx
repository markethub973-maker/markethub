"use client";

import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import { CreditCard, ExternalLink, RefreshCw } from "lucide-react";
import Link from "next/link";

interface SubStatus {
  plan: string;
  api_cost_this_month: number;
  api_cost_limit: number;
}

const PLAN_PRICES: Record<string, number> = {
  starter: 9,
  lite: 19,
  pro: 39,
  business: 99,
  enterprise: 249,
};

export default function BillingPage() {
  const [status, setStatus] = useState<SubStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/subscription/check")
      .then((r) => r.json())
      .then((data) => { setStatus(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const isPaid = status?.plan && !["free_test", "expired"].includes(status.plan);
  const planPrice = status?.plan ? (PLAN_PRICES[status.plan] ?? 0) : 0;

  return (
    <div className="min-h-screen bg-[#FFF8F0]">
      <Header title="Billing" />
      <main className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-stone-800 mb-1">Billing</h1>
        <p className="text-stone-500 text-sm mb-8">Payment method and billing history</p>

        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-24 rounded-2xl bg-stone-100" />
            <div className="h-48 rounded-2xl bg-stone-100" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Current billing */}
            <div className="bg-white rounded-2xl border border-stone-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-4 h-4 text-stone-500" />
                <p className="font-semibold text-stone-700 text-sm">Current billing</p>
              </div>
              {isPaid ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-stone-100">
                    <span className="text-sm text-stone-600 capitalize">{status?.plan} plan</span>
                    <span className="font-semibold text-stone-800">${planPrice}/month</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-stone-100">
                    <span className="text-sm text-stone-600">AI usage this month</span>
                    <span className="text-sm text-stone-800">
                      ${status?.api_cost_this_month?.toFixed(2) ?? "0.00"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm font-medium text-stone-700">Billing cycle</span>
                    <span className="text-sm text-stone-800">Monthly</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-stone-500">
                  You're on the{" "}
                  <span className="font-medium text-stone-700 capitalize">
                    {status?.plan === "expired" ? "expired trial" : "free trial"}
                  </span>
                  . No payment on file.
                </p>
              )}
            </div>

            {/* Stripe customer portal */}
            {isPaid && (
              <div className="bg-white rounded-2xl border border-stone-200 p-6">
                <p className="font-semibold text-stone-700 text-sm mb-1">Manage payment method</p>
                <p className="text-xs text-stone-400 mb-4">
                  Update your card, download invoices, or cancel your subscription via the Stripe portal.
                </p>
                <a
                  href="/api/stripe/portal"
                  className="flex items-center gap-2 text-sm font-semibold text-amber-600 hover:text-amber-700"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open billing portal
                </a>
              </div>
            )}

            {/* Upgrade CTA for free/expired */}
            {!isPaid && (
              <div className="rounded-2xl bg-amber-50 border border-amber-200 p-6 flex flex-col gap-3">
                <div>
                  <p className="font-semibold text-stone-800">Ready to upgrade?</p>
                  <p className="text-sm text-stone-500 mt-0.5">
                    Plans start at $9/month. Cancel anytime, no contracts.
                  </p>
                </div>
                <Link
                  href="/pricing"
                  className="flex items-center gap-2 text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-lg transition-colors self-start"
                >
                  <RefreshCw className="w-4 h-4" />
                  Choose a plan
                </Link>
              </div>
            )}

            {/* Help */}
            <p className="text-xs text-stone-400 text-center pt-2">
              Questions about your bill?{" "}
              <a href="mailto:support@markethubpromo.com" className="underline">
                Contact support
              </a>
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
