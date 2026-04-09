/**
 * Premium AI Actions — atomic counter helper.
 *
 * Wraps the `consume_premium_action` Postgres RPC, which:
 *   1. Locks the profile row (FOR UPDATE)
 *   2. Auto-resets `premium_actions_used` if past `premium_actions_reset_at`
 *   3. Increments the counter (or refuses if quota exhausted)
 *   4. Returns { allowed, used, remaining, resets_at }
 *
 * Treat the returned shape as authoritative — never read profiles directly
 * for quota decisions, because the RPC handles races and lazy resets.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { getPlanConfig, type PlanId } from "@/lib/plan-config";

export interface PremiumActionResult {
  allowed: boolean;
  used: number;
  remaining: number;        // -1 = unlimited
  resets_at: string;        // ISO timestamp
}

/**
 * Atomically consume one Premium AI Action for the given user.
 * Looks up the plan's `premium_actions_per_month` cap and calls the RPC.
 */
export async function consumePremiumAction(
  userId: string,
  plan: string | null | undefined
): Promise<PremiumActionResult> {
  const planConfig = getPlanConfig(plan);
  const limit = planConfig.premium_actions_per_month;

  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("consume_premium_action", {
    p_user_id: userId,
    p_limit: limit,
  });

  if (error) {
    throw new Error(`consume_premium_action failed: ${error.message}`);
  }

  // RPC returns a single-row TABLE — supabase-js gives us an array
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    throw new Error("consume_premium_action returned no row");
  }

  return {
    allowed: row.allowed,
    used: row.used,
    remaining: row.remaining,
    resets_at: row.resets_at,
  };
}

export type { PlanId };
