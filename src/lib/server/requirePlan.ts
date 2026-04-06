/**
 * Server-side plan enforcement.
 * Call at the top of any locked page (Server Component) to redirect
 * users whose plan doesn't include that route.
 *
 * Usage in a page.tsx:
 *   export default async function Page() {
 *     await requirePlan("/calendar");
 *     return <CalendarContent />;
 *   }
 */

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canAccessRoute } from "@/lib/plan-features";

export async function requirePlan(pathname: string): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Not logged in → middleware handles redirect, but just in case
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(pathname)}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_plan, plan, subscription_status, trial_expires_at, is_blocked")
    .eq("id", user.id)
    .single();

  // Blocked users
  if (profile?.is_blocked) {
    redirect("/blocked");
  }

  const plan = (profile?.subscription_plan || profile?.plan || "free_test") as string;

  // Check if plan is expired
  const trialExpiresAt = profile?.trial_expires_at;
  const isExpired =
    profile?.subscription_status === "expired" ||
    (plan === "free_test" && trialExpiresAt && new Date(trialExpiresAt) < new Date());

  if (isExpired) {
    redirect("/upgrade-required");
  }

  // Check route access
  if (!canAccessRoute(plan, pathname)) {
    redirect(`/upgrade-required?feature=${encodeURIComponent(pathname)}`);
  }

  return plan;
}

/**
 * Returns user plan without redirecting — use for conditional rendering.
 */
export async function getUserPlan(): Promise<{ plan: string; isExpired: boolean; trialDaysLeft: number | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { plan: "free_test", isExpired: false, trialDaysLeft: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_plan, plan, subscription_status, trial_expires_at")
    .eq("id", user.id)
    .single();

  const plan = profile?.subscription_plan || profile?.plan || "free_test";
  const trialExpiresAt = profile?.trial_expires_at;

  let isExpired = profile?.subscription_status === "expired";
  let trialDaysLeft: number | null = null;

  if (plan === "free_test" && trialExpiresAt) {
    const msLeft = new Date(trialExpiresAt).getTime() - Date.now();
    trialDaysLeft = Math.max(0, Math.ceil(msLeft / 86400000));
    if (msLeft <= 0) isExpired = true;
  }

  return { plan, isExpired, trialDaysLeft };
}
