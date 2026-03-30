"use client";

import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { PlanId } from "@/lib/plan-config";

interface SubscriptionStatus {
  plan: string;
  days_remaining: number | null;
  trial_expired?: boolean;
}

const PLAN_ORDER: PlanId[] = ["free_test", "starter", "lite", "pro", "business", "enterprise"];

function planRank(plan: string): number {
  const idx = PLAN_ORDER.indexOf(plan as PlanId);
  return idx === -1 ? 0 : idx;
}

interface PlanGateProps {
  /** Minimum plan required to see the content */
  requiredPlan: PlanId;
  children: React.ReactNode;
  /** Optional label shown in the upgrade prompt */
  featureName?: string;
}

/**
 * Wraps any premium feature.
 * Shows an "Upgrade" overlay if the user's plan is below requiredPlan.
 *
 * Usage:
 *   <PlanGate requiredPlan="pro" featureName="A/B Title Generator">
 *     <ABTitlesGenerator />
 *   </PlanGate>
 */
export default function PlanGate({ requiredPlan, children, featureName }: PlanGateProps) {
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/subscription/check")
      .then((r) => r.json())
      .then((data) => {
        setStatus(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse rounded-xl bg-stone-100 dark:bg-stone-800 h-32" />
    );
  }

  const userRank = planRank(status?.plan ?? "free_test");
  const requiredRank = planRank(requiredPlan);
  const hasAccess = userRank >= requiredRank && status?.plan !== "expired";

  if (hasAccess) {
    return <>{children}</>;
  }

  return (
    <div className="relative rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 overflow-hidden">
      {/* Blurred preview */}
      <div className="pointer-events-none select-none opacity-20 blur-sm p-4">
        {children}
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900">
          <Lock className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <p className="font-semibold text-stone-800 dark:text-stone-100 text-sm">
            {featureName ? `${featureName} requires` : "Requires"}{" "}
            <span className="capitalize">{requiredPlan.replace("_", " ")}</span> plan or higher
          </p>
          {status?.plan === "free_test" && status.days_remaining !== null && (
            <p className="text-xs text-stone-500 mt-1">
              {status.days_remaining > 0
                ? `${status.days_remaining} day${status.days_remaining !== 1 ? "s" : ""} left in your trial`
                : "Your trial has ended"}
            </p>
          )}
        </div>
        <a
          href="/pricing"
          className="inline-block bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm px-5 py-2 rounded-lg transition-colors"
        >
          Upgrade now
        </a>
      </div>
    </div>
  );
}
