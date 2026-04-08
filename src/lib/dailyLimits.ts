/**
 * Daily AI request limits per plan.
 * Uses Upstash Redis INCR with TTL until midnight UTC.
 * Fails open if Redis is unavailable — no outage risk.
 *
 * Types:
 *   "apex"     — APEX / AI generation calls (find-clients/*)
 *   "research" — External data fetch calls (research/*)
 */

export const AI_DAILY_LIMITS: Record<string, { apex: number; research: number }> = {
  free_test:  { apex: 5,   research: 0   },
  lite:       { apex: 20,  research: 15  },
  pro:        { apex: 50,  research: 30  },
  business:   { apex: 100, research: 80  },
  enterprise: { apex: -1,  research: -1  }, // -1 = unlimited
};

export type AILimitType = "apex" | "research";

export interface LimitResult {
  allowed:  boolean;
  used:     number;
  limit:    number;
  plan:     string;
  resetsAt: string;
}

export async function checkAndIncrDailyLimit(
  userId: string,
  plan:   string,
  type:   AILimitType,
): Promise<LimitResult> {
  const planLimits = AI_DAILY_LIMITS[plan] ?? AI_DAILY_LIMITS.free_test;
  const limit = planLimits[type];
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD UTC
  const resetsAt = "midnight UTC";

  if (limit === -1) return { allowed: true, used: 0, limit: -1, plan, resetsAt };

  const redisUrl   = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!redisUrl || !redisToken) return { allowed: true, used: 0, limit, plan, resetsAt };

  const key     = `daily:${type}:${userId}:${today}`;
  const headers = { Authorization: `Bearer ${redisToken}` };

  try {
    const incrRes = await fetch(`${redisUrl}/incr/${encodeURIComponent(key)}`, { headers });
    if (!incrRes.ok) return { allowed: true, used: 0, limit, plan, resetsAt };
    const { result: count } = await incrRes.json() as { result: number };

    if (count === 1) {
      // Expire at next midnight UTC
      const now      = new Date();
      const midnight = new Date(now);
      midnight.setUTCHours(24, 0, 0, 0);
      const ttl = Math.ceil((midnight.getTime() - now.getTime()) / 1000);
      fetch(`${redisUrl}/expire/${encodeURIComponent(key)}/${ttl}`, { headers }).catch(() => {});
    }

    return { allowed: count <= limit, used: count, limit, plan, resetsAt };
  } catch {
    return { allowed: true, used: 0, limit, plan, resetsAt }; // fail-open
  }
}

/** Standard 429 response body when daily limit is hit */
export function limitExceededResponse(result: LimitResult, type: AILimitType) {
  const label = type === "apex" ? "APEX / AI" : "Research";
  const hint  =
    result.plan === "free_test" ? " Upgrade your plan for more daily requests." :
    " Resets at midnight UTC.";
  return {
    error:       `Daily ${label} limit reached (${result.limit}/day on ${result.plan} plan).${hint}`,
    used:        result.used,
    limit:       result.limit,
    plan:        result.plan,
    resets_at:   result.resetsAt,
    upgrade_url: "/upgrade-required",
  };
}
