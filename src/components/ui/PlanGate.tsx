"use client";

import { useEffect, useState } from "react";
import { Lock, Zap } from "lucide-react";
import Link from "next/link";

interface SubscriptionData {
  plan: string;
  status: string;
}

interface PlanGateProps {
  /** Minimum plan required: "lite" | "pro" | "business" | "enterprise" */
  requiredPlan: "lite" | "pro" | "business" | "enterprise";
  children: React.ReactNode;
  /** Custom message to show instead of default */
  message?: string;
}

const PLAN_ORDER = ["free_test", "lite", "pro", "business", "enterprise"];

function meetsRequirement(userPlan: string, required: string): boolean {
  const userIdx = PLAN_ORDER.indexOf(userPlan);
  const reqIdx = PLAN_ORDER.indexOf(required);
  return userIdx >= reqIdx;
}

export default function PlanGate({ requiredPlan, children, message }: PlanGateProps) {
  const [sub, setSub] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/subscription/check")
      .then((r) => r.json())
      .then((d) => setSub({ plan: d.plan, status: d.status }))
      .catch(() => setSub({ plan: "free_test", status: "active" }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl p-6 animate-pulse" style={{ backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.2)" }}>
        <div className="h-4 rounded w-1/3 mb-2" style={{ backgroundColor: "rgba(245,215,160,0.4)" }} />
        <div className="h-3 rounded w-1/2" style={{ backgroundColor: "rgba(245,215,160,0.3)" }} />
      </div>
    );
  }

  const plan = sub?.plan ?? "free_test";
  const isExpired = plan === "expired" || sub?.status === "expired";
  const hasAccess = !isExpired && meetsRequirement(plan, requiredPlan);

  if (hasAccess) return <>{children}</>;

  const planLabel = { lite: "Lite", pro: "Pro", business: "Business", enterprise: "Enterprise" }[requiredPlan];

  return (
    <div
      className="rounded-2xl p-6 flex flex-col items-center justify-center gap-3 text-center min-h-[140px]"
      style={{
        backgroundColor: "#FFFCF7",
        border: "1px dashed rgba(245,215,160,0.5)",
      }}
    >
      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(245,158,11,0.12)" }}>
        <Lock className="w-5 h-5" style={{ color: "#F59E0B" }} />
      </div>
      <div>
        <p className="font-semibold text-sm mb-1" style={{ color: "#292524" }}>
          {message ?? `Requires ${planLabel} plan`}
        </p>
        <p className="text-xs" style={{ color: "#A8967E" }}>
          {isExpired ? "Your trial has expired." : `Upgrade to ${planLabel} or higher to unlock this feature.`}
        </p>
      </div>
      <Link
        href="/upgrade"
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all hover:opacity-90"
        style={{ backgroundColor: "#F59E0B", color: "#1C1814" }}
      >
        <Zap className="w-3.5 h-3.5" />
        {isExpired ? "Upgrade Now" : `Upgrade to ${planLabel}`}
      </Link>
    </div>
  );
}
