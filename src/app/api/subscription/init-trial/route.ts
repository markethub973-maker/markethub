import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check current profile — only allow init-trial if user has never had one
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_plan, subscription_status, trial_expires_at")
    .eq("id", user.id)
    .single();

  // Block if trial was already used or user already has a paid plan
  const alreadyHadTrial =
    profile?.trial_expires_at !== null && profile?.trial_expires_at !== undefined;
  const hasPaidPlan =
    profile?.subscription_plan && !["free_test", null, ""].includes(profile.subscription_plan);
  const isActive = profile?.subscription_status === "active" && hasPaidPlan;

  if (alreadyHadTrial || isActive) {
    return NextResponse.json(
      { error: "Trial already used or account has active plan" },
      { status: 409 }
    );
  }

  const { plan = "free_test" } = await req.json().catch(() => ({}));

  // Only allow setting free_test plan — prevent privilege escalation via this endpoint
  if (plan !== "free_test") {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const trialExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase
    .from("profiles")
    .update({
      subscription_plan: "free_test",
      subscription_status: "active",
      trial_expires_at: trialExpiresAt,
    })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    plan: "free_test",
    trial_expires_at: trialExpiresAt,
  });
}
