import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendTrialExpiredEmail, sendTrialExpiringSoonEmail } from "@/lib/resend";

// Protected by CRON_SECRET to prevent unauthorized calls
// Call via cron: GET /api/subscription/check-trial
// Header: Authorization: Bearer <CRON_SECRET>

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  const now = new Date();

  // 1. Fetch users whose trial has expired
  const { data: expired, error } = await supabase
    .from("profiles")
    .select("id, name, trial_expires_at")
    .eq("subscription_plan", "free_test")
    .eq("subscription_status", "active")
    .lt("trial_expires_at", now.toISOString());

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 2. Fetch users expiring in the next 24h (day-6 warning)
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const { data: expiringSoon } = await supabase
    .from("profiles")
    .select("id, name, trial_expires_at")
    .eq("subscription_plan", "free_test")
    .eq("subscription_status", "active")
    .gte("trial_expires_at", now.toISOString())
    .lte("trial_expires_at", in24h.toISOString());

  // Send "expiring soon" emails (fire-and-forget)
  if (expiringSoon && expiringSoon.length > 0) {
    for (const profile of expiringSoon) {
      const { data: authUser } = await supabase.auth.admin.getUserById(profile.id);
      const email = authUser?.user?.email;
      if (email && profile.name && profile.trial_expires_at) {
        const msLeft = new Date(profile.trial_expires_at).getTime() - now.getTime();
        const daysLeft = Math.max(1, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
        await sendTrialExpiringSoonEmail(email, profile.name, daysLeft).catch(() => {});
      }
    }
  }

  if (!expired || expired.length === 0) {
    return NextResponse.json({ success: true, expired_count: 0, warned_count: expiringSoon?.length ?? 0 });
  }

  // Expire all found users in one update
  const expiredIds = expired.map((u) => u.id);
  await supabase
    .from("profiles")
    .update({ subscription_plan: "expired", subscription_status: "expired" })
    .in("id", expiredIds);

  // Send expiry emails (fire-and-forget)
  for (const profile of expired) {
    const { data: authUser } = await supabase.auth.admin.getUserById(profile.id);
    const email = authUser?.user?.email;
    if (email && profile.name) {
      await sendTrialExpiredEmail(email, profile.name).catch(() => {});
    }
  }

  return NextResponse.json({
    success: true,
    expired_count: expired.length,
    warned_count: expiringSoon?.length ?? 0,
  });
}
