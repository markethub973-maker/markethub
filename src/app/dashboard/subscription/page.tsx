"use client";

import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import { Zap, Clock, TrendingUp, ArrowUpRight } from "lucide-react";
import Link from "next/link";

interface SubStatus {
  plan: string;
  days_remaining: number | null;
  api_cost_this_month: number;
  api_cost_limit: number;
  ai_calls_today: { used: number; limit: number };
  social_accounts: { used: number; limit: number };
}

const PLAN_LABELS: Record<string, string> = {
  free_test: "Free Trial",
  starter: "Starter",
  lite: "Lite",
  pro: "Pro",
  business: "Business",
  enterprise: "Enterprise",
  expired: "Expired",
};

function UsageBar({ used, limit, label }: { used: number; limit: number; label: string }) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const color = pct >= 90 ? "bg-red-400" : pct >= 70 ? "bg-amber-400" : "bg-emerald-400";
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs text-stone-500">
        <span>{label}</span>
        <span>{used} / {limit === -1 ? "∞" : limit}</span>
      </div>
      <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function SubscriptionPage() {
  const [status, setStatus] = useState<SubStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/subscription/check")
      .then((r) => r.json())
      .then((data) => { setStatus(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const planLabel = PLAN_LABELS[status?.plan ?? ""] ?? status?.plan ?? "—";
  const budgetPct = status
    ? Math.min(100, Math.round((status.api_cost_this_month / (status.api_cost_limit || 1)) * 100))
    : 0;

  return (
    <div className="min-h-screen bg-[#FFF8F0]">
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-stone-800 mb-1">Subscription</h1>
        <p className="text-stone-500 text-sm mb-8">Manage your plan and usage</p>

        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-28 rounded-2xl bg-stone-100" />
            <div className="h-40 rounded-2xl bg-stone-100" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Current plan card */}
            <div className="bg-white rounded-2xl border border-stone-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs text-stone-400 font-medium uppercase tracking-wide mb-1">Current plan</p>
                  <p className="text-2xl font-bold text-stone-800">{planLabel}</p>
                  {status?.days_remaining !== null && status?.days_remaining !== undefined && (
                    <p className={`flex items-center gap-1 text-sm mt-1 ${
                      status.days_remaining <= 1 ? "text-red-500" : "text-stone-500"
                    }`}>
                      <Clock className="w-3.5 h-3.5" />
                      {status.days_remaining > 0
                        ? `${status.days_remaining} day${status.days_remaining !== 1 ? "s" : ""} remaining in trial`
                        : "Trial has ended"}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-50 border border-amber-100">
                  <Zap className="w-5 h-5 text-amber-500" />
                </div>
              </div>
              <Link
                href="/pricing"
                className="flex items-center gap-1 text-sm font-semibold text-amber-600 hover:text-amber-700"
              >
                <ArrowUpRight className="w-4 h-4" />
                {status?.plan === "free_test" || status?.plan === "expired"
                  ? "Upgrade plan"
                  : "Change plan"}
              </Link>
            </div>

            {/* Usage card */}
            <div className="bg-white rounded-2xl border border-stone-200 p-6">
              <div className="flex items-center gap-2 mb-5">
                <TrendingUp className="w-4 h-4 text-stone-500" />
                <p className="font-semibold text-stone-700 text-sm">This month's usage</p>
              </div>
              <div className="space-y-4">
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs text-stone-500">
                    <span>AI budget</span>
                    <span>
                      ${status?.api_cost_this_month?.toFixed(2) ?? "0.00"} / $
                      {status?.api_cost_limit?.toFixed(2) ?? "0.00"}
                    </span>
                  </div>
                  <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        budgetPct >= 90 ? "bg-red-400" : budgetPct >= 70 ? "bg-amber-400" : "bg-emerald-400"
                      }`}
                      style={{ width: `${budgetPct}%` }}
                    />
                  </div>
                </div>
                <UsageBar
                  used={status?.ai_calls_today?.used ?? 0}
                  limit={status?.ai_calls_today?.limit ?? 5}
                  label="AI calls today"
                />
                <UsageBar
                  used={status?.social_accounts?.used ?? 0}
                  limit={status?.social_accounts?.limit ?? 1}
                  label="Connected social accounts"
                />
              </div>
            </div>

            {/* Need more credits */}
            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-5 flex items-center justify-between">
              <div>
                <p className="font-semibold text-stone-800 text-sm">Need more AI credits?</p>
                <p className="text-xs text-stone-500 mt-0.5">Purchase extra tokens without upgrading your plan.</p>
              </div>
              <Link
                href="/settings?tab=credits"
                className="text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
              >
                Buy credits
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
