"use client";

import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import { CreditCard, Zap, Calendar, TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";
import Link from "next/link";

interface SubscriptionInfo {
  plan: string;
  status: string;
  days_remaining: number | null;
  api_cost_this_month: number;
  api_cost_limit: number;
  ai_calls_today: { used: number; limit: number };
  features: {
    email_reports: boolean;
    webhook_integration: boolean;
    custom_dashboard: boolean;
    priority_support: boolean;
  };
}

const PLAN_LABELS: Record<string, string> = {
  free_test: "Free Trial",
  lite: "Lite",
  pro: "Pro",
  business: "Business",
  enterprise: "Enterprise",
  expired: "Expired",
};

function UsageBar({ used, limit, label }: { used: number; limit: number; label: string }) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const color = pct >= 90 ? "#ef4444" : pct >= 70 ? "#F59E0B" : "#22c55e";
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5" style={{ color: "#78614E" }}>
        <span>{label}</span>
        <span style={{ color: "#292524", fontWeight: 600 }}>
          {used} / {limit <= 0 ? "∞" : limit}
        </span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(245,215,160,0.3)" }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function FeatureBadge({ enabled, label }: { enabled: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {enabled
        ? <CheckCircle2 className="w-4 h-4 text-green-500" />
        : <div className="w-4 h-4 rounded-full border-2" style={{ borderColor: "rgba(168,150,126,0.4)" }} />
      }
      <span style={{ color: enabled ? "#292524" : "#A8967E" }}>{label}</span>
    </div>
  );
}

export default function SubscriptionPage() {
  const [info, setInfo] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/subscription/check")
      .then((r) => r.json())
      .then(setInfo)
      .finally(() => setLoading(false));
  }, []);

  const isExpired = info?.plan === "expired" || info?.status === "expired";
  const isTrial = info?.plan === "free_test";
  const planLabel = PLAN_LABELS[info?.plan ?? "free_test"] ?? info?.plan;

  return (
    <div>
      <Header title="Subscription" subtitle="Manage your plan and usage" />

      <div className="p-6 max-w-2xl space-y-5">
        {loading && (
          <div className="rounded-2xl p-6 animate-pulse" style={{ backgroundColor: "#FFFCF7" }}>
            <div className="h-5 w-1/3 rounded mb-3" style={{ backgroundColor: "rgba(245,215,160,0.4)" }} />
            <div className="h-3 w-1/2 rounded" style={{ backgroundColor: "rgba(245,215,160,0.3)" }} />
          </div>
        )}

        {!loading && info && (
          <>
            {/* Plan Card */}
            <div
              className="rounded-2xl p-6"
              style={{
                background: isExpired
                  ? "rgba(239,68,68,0.04)"
                  : "linear-gradient(135deg,rgba(245,158,11,0.08),rgba(245,215,160,0.15))",
                border: isExpired
                  ? "1px solid rgba(239,68,68,0.2)"
                  : "1px solid rgba(245,215,160,0.35)",
              }}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <CreditCard className="w-5 h-5" style={{ color: "#F59E0B" }} />
                    <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#A8967E" }}>
                      Current Plan
                    </span>
                  </div>
                  <h2 className="text-2xl font-black" style={{ color: "#292524" }}>{planLabel}</h2>
                </div>
                <div
                  className="px-3 py-1 rounded-full text-xs font-bold"
                  style={
                    isExpired
                      ? { backgroundColor: "rgba(239,68,68,0.1)", color: "#dc2626" }
                      : { backgroundColor: "rgba(34,197,94,0.1)", color: "#16a34a" }
                  }
                >
                  {isExpired ? "Expired" : "Active"}
                </div>
              </div>

              {isTrial && info.days_remaining !== null && (
                <div
                  className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg mb-4"
                  style={{
                    backgroundColor: info.days_remaining <= 2 ? "rgba(239,68,68,0.08)" : "rgba(245,158,11,0.08)",
                    color: info.days_remaining <= 2 ? "#dc2626" : "#D97706",
                  }}
                >
                  {info.days_remaining <= 2 && <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
                  <Calendar className="w-4 h-4 flex-shrink-0" />
                  <span>
                    {info.days_remaining === 0
                      ? "Trial expires today"
                      : `${info.days_remaining} day${info.days_remaining === 1 ? "" : "s"} left in trial`}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-3 flex-wrap">
                <Link
                  href="/upgrade"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90"
                  style={{ backgroundColor: "#F59E0B", color: "#1C1814" }}
                >
                  <Zap className="w-4 h-4" />
                  {isExpired ? "Reactivate Plan" : isTrial ? "Upgrade Now" : "Change Plan"}
                </Link>
                {!isTrial && !isExpired && (
                  <Link
                    href="/dashboard/billing"
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
                    style={{ backgroundColor: "rgba(245,215,160,0.15)", color: "#78614E", border: "1px solid rgba(245,215,160,0.3)" }}
                  >
                    <CreditCard className="w-4 h-4" />
                    Billing & Invoices
                  </Link>
                )}
              </div>
            </div>

            {/* Usage Card */}
            <div
              className="rounded-2xl p-6 space-y-4"
              style={{ backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)" }}
            >
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4" style={{ color: "#F59E0B" }} />
                <span className="font-semibold text-sm" style={{ color: "#292524" }}>Usage This Month</span>
              </div>

              <UsageBar
                label="AI Calls Today"
                used={info.ai_calls_today.used}
                limit={info.ai_calls_today.limit}
              />
              <UsageBar
                label="AI Budget ($)"
                used={parseFloat(info.api_cost_this_month.toFixed(2))}
                limit={info.api_cost_limit}
              />
            </div>

            {/* Features Card */}
            <div
              className="rounded-2xl p-6 space-y-3"
              style={{ backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)" }}
            >
              <p className="font-semibold text-sm mb-3" style={{ color: "#292524" }}>Plan Features</p>
              <FeatureBadge enabled={info.features.email_reports} label="Email Reports" />
              <FeatureBadge enabled={info.features.webhook_integration} label="Webhook Integration" />
              <FeatureBadge enabled={info.features.custom_dashboard} label="Custom Dashboard" />
              <FeatureBadge enabled={info.features.priority_support} label="Priority Support" />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
