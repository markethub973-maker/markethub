import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { plan = "free_test" } = await req.json().catch(() => ({}));

  const trialExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase
    .from("profiles")
    .update({
      subscription_plan: plan,
      subscription_status: "active",
      trial_expires_at: plan === "free_test" ? trialExpiresAt : null,
    })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    plan,
    trial_expires_at: plan === "free_test" ? trialExpiresAt : null,
  });
}
