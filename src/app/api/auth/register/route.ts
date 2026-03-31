import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendWelcomeEmail, sendOnboarding1_Welcome } from "@/lib/resend";

const VALID_PLANS = ["free_test", "starter", "lite", "pro", "business", "enterprise"];

export async function POST(req: Request) {
  const { name, email, password, plan } = await req.json();

  if (!name || !email || !password) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const selectedPlan = VALID_PLANS.includes(plan) ? plan : "free_test";
  const trialExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, subscription_plan: selectedPlan },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/auth/callback`,
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Set subscription fields on the profile (trigger creates the row, we update it)
  if (data.user) {
    await supabase
      .from("profiles")
      .update({
        subscription_plan: selectedPlan,
        subscription_status: "active",
        trial_expires_at: selectedPlan === "free_test" ? trialExpiresAt : null,
      })
      .eq("id", data.user.id);
  }

  await sendWelcomeEmail(email, name).catch(() => {});
  await sendOnboarding1_Welcome(email, name).catch(() => {});

  return NextResponse.json({
    user: data.user,
    message: "Account created successfully! Check your email to confirm.",
  });
}
