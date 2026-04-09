import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { canAccessRoute } from "@/lib/plan-features";
import { consumePremiumAction } from "@/lib/premiumActions";

// ── Per-plan daily API call limits for protected routes ───────────────────────
// free_test gets TikTok + Instagram but with strict daily caps (max 50 calls/day)
const PLAN_DAILY_LIMITS: Record<string, Record<string, number>> = {
  free_test: {
    "/tiktok":    50,   // max 50 TikTok API calls/day
    "/instagram": 50,   // max 50 Instagram API calls/day
  },
};

async function checkPlanRateLimit(
  userId: string,
  userPlan: string,
  route: string
): Promise<boolean> {
  const limits = PLAN_DAILY_LIMITS[userPlan];
  if (!limits) return true; // no limits for paid plans

  // find matching route prefix
  const matchedRoute = Object.keys(limits).find(r => route.startsWith(r));
  if (!matchedRoute) return true;

  const limit = limits[matchedRoute];
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!redisUrl || !redisToken) return true;

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const key = `plan_rl:${userPlan}:${userId}:${matchedRoute}:${today}`;
  const headers = { Authorization: `Bearer ${redisToken}` };

  try {
    const incrRes = await fetch(`${redisUrl}/incr/${encodeURIComponent(key)}`, { headers });
    if (!incrRes.ok) return true;
    const { result: count } = await incrRes.json() as { result: number };
    if (count === 1) {
      // expires at end of day (86400s)
      fetch(`${redisUrl}/expire/${encodeURIComponent(key)}/86400`, { headers }).catch(() => {});
    }
    return count <= limit;
  } catch {
    return true;
  }
}

/**
 * Verifies the request has a valid Supabase session AND the user's plan
 * can access the given route. Returns { userId, userPlan } on success,
 * or a ready-to-return 401/403 NextResponse on failure.
 */
export async function requirePlan(
  req: NextRequest,
  route: string
): Promise<{ userId: string; userPlan: string } | NextResponse> {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll(); },
        setAll() {},
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  const userPlan = (profile as any)?.plan ?? "free_test";

  if (!canAccessRoute(userPlan, route)) {
    return NextResponse.json(
      { error: "Upgrade required", requiredPlan: route },
      { status: 403 }
    );
  }

  // Check per-plan daily rate limit (e.g. free_test: 50 calls/day on TikTok/Instagram)
  const withinLimit = await checkPlanRateLimit(user.id, userPlan, route);
  if (!withinLimit) {
    return NextResponse.json(
      { error: "Daily limit reached for your plan. Upgrade to get unlimited access.", plan: userPlan },
      { status: 429 }
    );
  }

  return { userId: user.id, userPlan };
}

export interface PremiumActionContext {
  userId: string;
  userPlan: string;
  premiumAction: {
    used: number;
    remaining: number;
    resets_at: string;
  };
}

/**
 * Like requirePlan(), but additionally consumes one Premium AI Action via the
 * `consume_premium_action` RPC. Use this on routes that should debit the
 * monthly quota (Lead Scoring, Outreach Personalization, Full Campaign,
 * Marketing Advisor / APEX).
 *
 * On quota exhausted, returns a 402 NextResponse:
 *   { error: "LIMIT_REACHED", current, limit, resetDate }
 *
 * On success, returns { userId, userPlan, premiumAction: { used, remaining, resets_at } }.
 * Routes should surface `remaining` and `resets_at` in their response meta so
 * the UI can render the "Mai ai N credite luna aceasta" banner.
 */
export async function requirePremiumAction(
  req: NextRequest,
  route: string
): Promise<PremiumActionContext | NextResponse> {
  const base = await requirePlan(req, route);
  if (base instanceof NextResponse) return base;

  const result = await consumePremiumAction(base.userId, base.userPlan);

  if (!result.allowed) {
    return NextResponse.json(
      {
        error: "LIMIT_REACHED",
        current: result.used,
        limit: result.used, // quota exhausted ⇒ used == limit
        resetDate: result.resets_at,
      },
      { status: 402 }
    );
  }

  return {
    userId: base.userId,
    userPlan: base.userPlan,
    premiumAction: {
      used: result.used,
      remaining: result.remaining,
      resets_at: result.resets_at,
    },
  };
}
