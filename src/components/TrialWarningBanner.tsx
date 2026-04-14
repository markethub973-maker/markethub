"use client";

/**
 * TrialWarningBanner — shown at the top of every page when the free trial
 * has 3 or fewer days remaining.
 *
 * Include once in the root layout or DashboardLayout.
 */

import { useEffect, useState } from "react";
import { Clock, X, ArrowRight } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function TrialWarningBanner() {
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [plan, setPlan] = useState<string | null>(null);

  useEffect(() => {
    const key = "trial_banner_dismissed_date";
    const todayStr = new Date().toDateString();
    if (sessionStorage.getItem(key) === todayStr) {
      setDismissed(true);
      return;
    }

    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("subscription_plan, plan, trial_expires_at")
        .eq("id", user.id)
        .single();

      const currentPlan = data?.subscription_plan || data?.plan || "free_test";
      setPlan(currentPlan);

      if (currentPlan !== "free_test") return; // Only show for trial

      if (!data?.trial_expires_at) return;
      const msLeft = new Date(data.trial_expires_at).getTime() - Date.now();
      const days = Math.ceil(msLeft / 86400000);
      if (days <= 3 && days > 0) setDaysLeft(days);
    });
  }, []);

  const handleDismiss = () => {
    sessionStorage.setItem("trial_banner_dismissed_date", new Date().toDateString());
    setDismissed(true);
  };

  if (dismissed || daysLeft === null || plan !== "free_test") return null;

  const isUrgent = daysLeft === 1;
  const bg = isUrgent ? "rgba(239,68,68,0.1)" : "rgba(245,158,11,0.1)";
  const border = isUrgent ? "rgba(239,68,68,0.3)" : "rgba(245,158,11,0.3)";
  const color = isUrgent ? "#DC2626" : "var(--color-primary-hover)";

  return (
    <div
      className="flex items-center justify-between gap-4 px-5 py-3 text-sm"
      style={{ backgroundColor: bg, borderBottom: `1px solid ${border}` }}
    >
      <div className="flex items-center gap-3">
        <Clock size={16} style={{ color, flexShrink: 0 }} />
        <span style={{ color }}>
          <strong>
            {isUrgent ? "Last day!" : `${daysLeft} days left`}
          </strong>{" "}
          {isUrgent
            ? " Your free trial ends today. Upgrade now to keep all your data."
            : " of your free trial. Upgrade to a paid plan before it expires."}
        </span>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <Link
          href="/upgrade-required"
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold text-white"
          style={{ backgroundColor: color }}
        >
          Upgrade Now <ArrowRight size={12} />
        </Link>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss"
          style={{ color }}
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
