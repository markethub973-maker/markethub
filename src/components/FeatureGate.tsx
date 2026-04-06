"use client";

/**
 * FeatureGate — wraps content that requires a specific plan.
 *
 * Usage:
 *   <FeatureGate feature="has_calendar" userPlan={plan}>
 *     <CalendarContent />
 *   </FeatureGate>
 *
 *   <FeatureGate route="/lead-finder" userPlan={plan}>
 *     <LeadFinderContent />
 *   </FeatureGate>
 *
 * When locked, renders a branded upgrade banner in place of the children.
 */

import { useState } from "react";
import Link from "next/link";
import { Lock, ArrowRight, X } from "lucide-react";
import {
  canAccessRoute, getRouteGate, PLAN_FEATURES, PLAN_LABELS, PLAN_COLORS,
  PLAN_PRICES, PLAN_ORDER, plansWithAccess, type PlanId, type PlanFeatureSet,
} from "@/lib/plan-features";

// ── Feature-key gate (e.g. has_calendar, has_tiktok) ─────────────────────────
function featureMinPlan(featureKey: keyof PlanFeatureSet): PlanId {
  return (
    PLAN_ORDER.find(p => !!PLAN_FEATURES[p][featureKey]) ?? "lite"
  );
}

interface FeatureGateProps {
  children: React.ReactNode;
  userPlan: string;
  /** Gate by specific feature key */
  feature?: keyof PlanFeatureSet;
  /** Gate by route path (uses ROUTE_GATES map) */
  route?: string;
  /** Optional: override the displayed feature label */
  label?: string;
  /** Optional: override the displayed feature description */
  description?: string;
  /** Render a compact inline badge instead of the full banner */
  compact?: boolean;
}

export default function FeatureGate({
  children,
  userPlan,
  feature,
  route,
  label,
  description,
  compact = false,
}: FeatureGateProps) {
  const [dismissed, setDismissed] = useState(false);

  // ── Determine if locked ──────────────────────────────────────────────────
  let locked = false;
  let resolvedLabel = label ?? "This Feature";
  let resolvedDescription = description ?? "Upgrade your plan to unlock this feature.";
  let resolvedMinPlan: PlanId = "lite";
  let qualifyingPlans: PlanId[] = [];

  if (route) {
    locked = !canAccessRoute(userPlan, route);
    const gate = getRouteGate(route);
    if (gate) {
      resolvedLabel = label ?? gate.label;
      resolvedDescription = description ?? gate.description;
      resolvedMinPlan = gate.minPlan;
    }
    qualifyingPlans = plansWithAccess(route).filter(p => p !== "free_test");
  } else if (feature) {
    const planFeatures = PLAN_FEATURES[userPlan as PlanId] ?? PLAN_FEATURES.free_test;
    locked = !planFeatures[feature];
    resolvedMinPlan = featureMinPlan(feature);
    qualifyingPlans = PLAN_ORDER.filter(p => {
      return !!PLAN_FEATURES[p][feature] && p !== "free_test";
    });
  }

  // Not locked → render children as-is
  if (!locked) return <>{children}</>;

  const minColor = PLAN_COLORS[resolvedMinPlan] ?? "#F59E0B";

  // ── Compact inline badge ──────────────────────────────────────────────────
  if (compact) {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer"
        style={{ backgroundColor: `${minColor}15`, color: minColor, border: `1px solid ${minColor}30` }}
        title={`Requires ${PLAN_LABELS[resolvedMinPlan]} plan`}
      >
        <Lock className="w-3 h-3" />
        {PLAN_LABELS[resolvedMinPlan]}+
      </span>
    );
  }

  // ── Full upgrade banner ───────────────────────────────────────────────────
  return (
    <div className="relative rounded-2xl overflow-hidden">
      {/* Blurred preview of children */}
      <div className="pointer-events-none select-none" style={{ filter: "blur(4px)", opacity: 0.25 }}>
        {children}
      </div>

      {/* Overlay */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center p-8"
        style={{ background: "linear-gradient(180deg, rgba(255,248,240,0.85) 0%, rgba(255,248,240,0.97) 60%)" }}
      >
        {/* Lock icon */}
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 shadow-md"
          style={{ background: `linear-gradient(135deg, ${minColor}22, ${minColor}44)`, border: `1px solid ${minColor}50` }}
        >
          <Lock size={24} style={{ color: minColor }} />
        </div>

        <h3 className="text-xl font-bold text-center mb-2" style={{ color: "#292524" }}>
          {resolvedLabel}
        </h3>
        <p className="text-sm text-center mb-2 max-w-sm" style={{ color: "#78716C" }}>
          {resolvedDescription}
        </p>

        {/* Current plan note */}
        <p className="text-xs text-center mb-5" style={{ color: "#A8967E" }}>
          Your plan:{" "}
          <span className="font-bold" style={{ color: PLAN_COLORS[userPlan as PlanId] ?? "#F59E0B" }}>
            {PLAN_LABELS[userPlan as PlanId] ?? userPlan}
          </span>
          {" · "}Available from:{" "}
          <span className="font-bold" style={{ color: minColor }}>
            {PLAN_LABELS[resolvedMinPlan]}
          </span>
        </p>

        {/* Plans that unlock this */}
        {qualifyingPlans.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center mb-5">
            {qualifyingPlans.map(p => (
              <span
                key={p}
                className="text-xs font-semibold px-3 py-1 rounded-full"
                style={{ backgroundColor: `${PLAN_COLORS[p]}15`, color: PLAN_COLORS[p], border: `1px solid ${PLAN_COLORS[p]}30` }}
              >
                {PLAN_LABELS[p]} — ${PLAN_PRICES[p]}/mo
              </span>
            ))}
          </div>
        )}

        <Link
          href={`/register?plan=${resolvedMinPlan}`}
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white shadow-lg transition-all hover:opacity-90"
          style={{ background: `linear-gradient(135deg, ${minColor}, ${minColor}cc)` }}
        >
          Upgrade to {PLAN_LABELS[resolvedMinPlan]} <ArrowRight size={15} />
        </Link>

        {!dismissed && (
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="mt-3 text-xs"
            style={{ color: "#A8967E" }}
          >
            Maybe later
          </button>
        )}
      </div>
    </div>
  );
}

// ── Hook version for programmatic checks ─────────────────────────────────────
export function usePlanAccess(userPlan: string) {
  return {
    can: (route: string) => canAccessRoute(userPlan, route),
    hasFeature: (feature: keyof PlanFeatureSet) =>
      !!(PLAN_FEATURES[userPlan as PlanId] ?? PLAN_FEATURES.free_test)[feature],
    plan: userPlan as PlanId,
    planLabel: PLAN_LABELS[userPlan as PlanId] ?? userPlan,
    planColor: PLAN_COLORS[userPlan as PlanId] ?? "#F59E0B",
  };
}
