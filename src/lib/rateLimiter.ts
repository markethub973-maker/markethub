/**
 * Plan-based rate limiter using in-memory store.
 *
 * Limits requests per user per minute based on their plan.
 * Free users get throttled, paying users get priority.
 *
 * For production scale (500+ users), replace with Upstash Redis.
 */

type PlanId = string;

const PLAN_LIMITS: Record<PlanId, { requestsPerMin: number }> = {
  free: { requestsPerMin: 10 },
  free_forever: { requestsPerMin: 10 },
  free_test: { requestsPerMin: 10 },
  lite: { requestsPerMin: 30 },      // Creator $24
  pro: { requestsPerMin: 60 },       // Pro $49
  business: { requestsPerMin: 120 },  // Studio $99
  agency: { requestsPerMin: 999 },    // Agency $249 — practically unlimited
};

interface RateEntry {
  count: number;
  resetAt: number; // timestamp
}

// In-memory store — resets on deploy/restart. Good enough for <500 users.
// For scale: swap to Upstash Redis ($10/mo).
const store = new Map<string, RateEntry>();

// Cleanup old entries every 5 min
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key);
  }
}, 300_000);

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetInSeconds: number;
}

/**
 * Check rate limit for a user.
 * Call this at the start of any API route.
 */
export function checkRateLimit(userId: string, plan: PlanId): RateLimitResult {
  const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
  const key = `rl:${userId}`;
  const now = Date.now();

  let entry = store.get(key);
  if (!entry || entry.resetAt < now) {
    entry = { count: 0, resetAt: now + 60_000 }; // 1 minute window
    store.set(key, entry);
  }

  entry.count++;

  const remaining = Math.max(0, limits.requestsPerMin - entry.count);
  const resetInSeconds = Math.max(0, Math.ceil((entry.resetAt - now) / 1000));

  return {
    allowed: entry.count <= limits.requestsPerMin,
    limit: limits.requestsPerMin,
    remaining,
    resetInSeconds,
  };
}

/**
 * Get rate limit headers for HTTP response.
 */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(result.resetInSeconds),
  };
}
