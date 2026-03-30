import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/subscription/init-trial
 *
 * Call this after a new user registers.
 * Sets plan = "free_test" and trial_expires_at = now + 7 days on the user's profile.
 */
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if trial already initialized
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, trial_expires_at")
    .eq("id", user.id)
    .single();

  if (profile?.trial_expires_at) {
    return NextResponse.json({
      success: true,
      already_initialized: true,
      plan: profile.plan,
      trial_expires_at: profile.trial_expires_at,
    });
  }

  const now = new Date();
  const trialExpiresAt = new Date(now);
  trialExpiresAt.setDate(trialExpiresAt.getDate() + 7);

  const { error } = await supabase
    .from("profiles")
    .update({
      plan: "free_test",
      trial_expires_at: trialExpiresAt.toISOString(),
      trial_started_at: now.toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    console.error("[init-trial] Supabase error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    plan: "free_test",
    trial_started_at: now.toISOString(),
    trial_expires_at: trialExpiresAt.toISOString(),
    days_remaining: 7,
  });
}
