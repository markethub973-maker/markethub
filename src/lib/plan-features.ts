/**
 * Plan feature gating.
 *
 * Defines which features/routes are available per plan and the upgrade
 * message shown when a user tries to access something locked.
 */

export type PlanId = "free_test" | "starter" | "lite" | "pro" | "business" | "enterprise";

// ── Plan order (index = rank, higher = more capable) ─────────────────────────
export const PLAN_ORDER: PlanId[] = [
  "free_test",
  "starter",
  "lite",
  "pro",
  "business",
  "enterprise",
];

export const PLAN_PRICES: Record<PlanId, number> = {
  free_test:  0,
  starter:    14,
  lite:       24,
  pro:        49,
  business:   99,
  enterprise: 249,
};

export const PLAN_LABELS: Record<PlanId, string> = {
  free_test:  "Free Trial",
  starter:    "Starter",
  lite:       "Lite",
  pro:        "Pro",
  business:   "Business",
  enterprise: "Enterprise",
};

export const PLAN_COLORS: Record<PlanId, string> = {
  free_test:  "#78614E",
  starter:    "#3B82F6",
  lite:       "#F59E0B",
  pro:        "#8B5CF6",
  business:   "#E1306C",
  enterprise: "#16A34A",
};

// ── Plan feature flags (mirrors token-plan-config.ts) ────────────────────────
export const PLAN_FEATURES: Record<PlanId, PlanFeatureSet> = {
  free_test: {
    has_calendar:       false,
    has_tiktok:         false,
    has_api_access:     false,
    has_white_label:    false,
    has_priority_support: false,
    tracked_channels:   2,
    competitor_brands:  1,
    team_members:       1,
    client_accounts:    1,
  },
  starter: {
    has_calendar:       false,
    has_tiktok:         false,
    has_api_access:     false,
    has_white_label:    false,
    has_priority_support: false,
    tracked_channels:   5,
    competitor_brands:  3,
    team_members:       1,
    client_accounts:    1,
  },
  lite: {
    has_calendar:       true,
    has_tiktok:         true,
    has_api_access:     false,
    has_white_label:    false,
    has_priority_support: false,
    tracked_channels:   12,
    competitor_brands:  8,
    team_members:       2,
    client_accounts:    2,
  },
  pro: {
    has_calendar:       true,
    has_tiktok:         true,
    has_api_access:     false,
    has_white_label:    false,
    has_priority_support: true,
    tracked_channels:   30,
    competitor_brands:  20,
    team_members:       3,
    client_accounts:    5,
  },
  business: {
    has_calendar:       true,
    has_tiktok:         true,
    has_api_access:     true,
    has_white_label:    false,
    has_priority_support: true,
    tracked_channels:   100,
    competitor_brands:  25,
    team_members:       2,
    client_accounts:    10,
  },
  enterprise: {
    has_calendar:       true,
    has_tiktok:         true,
    has_api_access:     true,
    has_white_label:    true,
    has_priority_support: true,
    tracked_channels:   -1,
    competitor_brands:  50,
    team_members:       5,
    client_accounts:    20,
  },
};

export interface PlanFeatureSet {
  has_calendar:       boolean;
  has_tiktok:         boolean;
  has_api_access:     boolean;
  has_white_label:    boolean;
  has_priority_support: boolean;
  tracked_channels:   number;
  competitor_brands:  number;
  team_members:       number;
  client_accounts:    number;
}

// ── Route gate map ────────────────────────────────────────────────────────────
// minPlan = the lowest plan that unlocks this route
// featureKey = optional specific feature flag to check
export interface RouteGate {
  minPlan:    PlanId;
  featureKey?: keyof PlanFeatureSet;
  label:      string;  // human-readable feature name
  description: string; // shown in upgrade modal
}

export const ROUTE_GATES: Record<string, RouteGate> = {
  // ── Lite ($24) features ───────────────────────────────────────────────────
  "/calendar": {
    minPlan:    "lite",
    featureKey: "has_calendar",
    label:      "Content Calendar",
    description: "Schedule posts, get best-time recommendations, and manage first comments for all your platforms.",
  },
  "/tiktok": {
    minPlan:    "lite",
    featureKey: "has_tiktok",
    label:      "TikTok Analytics",
    description: "Track TikTok trends, hashtags, and competitor videos to grow your presence.",
  },
  "/email-reports": {
    minPlan:    "lite",
    label:      "Email Reports",
    description: "Get weekly digest emails with your top metrics and AI recommendations.",
  },
  "/ads-library": {
    minPlan:    "lite",
    label:      "Ads Library",
    description: "Browse and analyze competitor ads across Meta platforms.",
  },
  "/bio": {
    minPlan:    "lite",
    label:      "Link in Bio",
    description: "Create a branded bio link page with click tracking and custom themes.",
  },
  "/hashtags": {
    minPlan:    "lite",
    label:      "Hashtag Manager",
    description: "Research, organize, and save hashtag sets for faster content creation.",
  },
  "/marketing": {
    minPlan:    "lite",
    label:      "Marketing Agent",
    description: "AI-powered marketing strategy and campaign planning for your niche.",
  },
  "/monthly-report": {
    minPlan:    "lite",
    label:      "Monthly Report AI",
    description: "Automated AI reports on your monthly performance, sent by email.",
  },
  "/campaigns": {
    minPlan:    "lite",
    label:      "Campaigns",
    description: "Create, track and optimize multi-platform marketing campaigns.",
  },
  "/clients": {
    minPlan:    "lite",
    label:      "Multi-Account",
    description: "Manage multiple client accounts from one dashboard.",
  },

  // ── Pro ($49) features ────────────────────────────────────────────────────
  "/ai-hub": {
    minPlan:    "pro",
    label:      "AI Hub",
    description: "Advanced AI agents for research, outreach, lead scoring, and automation.",
  },
  "/lead-finder": {
    minPlan:    "pro",
    label:      "Lead Finder",
    description: "AI-powered prospecting: find and score leads from Google Maps, web, and more.",
  },
  "/leads": {
    minPlan:    "pro",
    label:      "Leads Database",
    description: "Full CRM for managing and contacting leads found by the AI agent.",
  },
};

// ── Helper functions ──────────────────────────────────────────────────────────

/** Returns rank index of a plan (higher = better) */
export function planRank(planId: string): number {
  const idx = PLAN_ORDER.indexOf(planId as PlanId);
  return idx === -1 ? 0 : idx;
}

/** True if userPlan meets or exceeds requiredPlan */
export function hasPlanAccess(userPlan: string, requiredPlan: PlanId): boolean {
  return planRank(userPlan) >= planRank(requiredPlan);
}

/** Returns the gate for a pathname, or null if the route is free for all plans */
export function getRouteGate(pathname: string): RouteGate | null {
  // Exact match first, then prefix match
  if (ROUTE_GATES[pathname]) return ROUTE_GATES[pathname];
  const prefix = Object.keys(ROUTE_GATES).find(k => pathname.startsWith(k + "/"));
  return prefix ? ROUTE_GATES[prefix] : null;
}

/** True if the user's plan can access this route.
 *  Pass `overrides` (from admin_platform_config DB) to override code defaults. */
export function canAccessRoute(
  userPlan: string,
  pathname: string,
  overrides?: Record<string, Record<string, boolean>>
): boolean {
  const gate = getRouteGate(pathname);
  if (!gate) return true; // No gate = open to all

  if (!hasPlanAccess(userPlan, gate.minPlan)) return false;

  // Check specific feature flag — DB override wins over code default
  if (gate.featureKey) {
    const dbFeatures = overrides?.[userPlan];
    if (dbFeatures && gate.featureKey in dbFeatures) {
      return !!dbFeatures[gate.featureKey];
    }
    const features = PLAN_FEATURES[userPlan as PlanId] ?? PLAN_FEATURES.free_test;
    return !!features[gate.featureKey];
  }

  return true;
}

/** Returns a list of plans that include a given route (for the upgrade modal) */
export function plansWithAccess(pathname: string): PlanId[] {
  const gate = getRouteGate(pathname);
  if (!gate) return PLAN_ORDER;
  return PLAN_ORDER.filter(p => {
    if (!hasPlanAccess(p, gate.minPlan)) return false;
    if (gate.featureKey) {
      return !!PLAN_FEATURES[p][gate.featureKey];
    }
    return true;
  });
}

/** The minimum plan required for a given route */
export function minPlanForRoute(pathname: string): PlanId | null {
  const gate = getRouteGate(pathname);
  if (!gate) return null;

  // If featureKey is specified, find the actual minimum plan with that feature
  if (gate.featureKey) {
    return (
      PLAN_ORDER.find(p => {
        if (!hasPlanAccess(p, gate.minPlan)) return false;
        return !!PLAN_FEATURES[p][gate.featureKey!];
      }) ?? gate.minPlan
    );
  }
  return gate.minPlan;
}
