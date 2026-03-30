import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendTrialExpiredEmail, sendTrialExpiringSoonEmail } from "@/lib/resend";

/**
 * GET /api/subscription/check-trial
 *
 * Cron job — run daily.
 * 1. Finds users on free_test whose trial expires in exactly 1 day → sends warning email.
 * 2. Finds users whose trial has already expired → marks plan as "expired" + sends email.
 *
 * Protected by CRON_SECRET header.
 */
export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const now = new Date();

  // ── 1. Warn users expiring in 24 hours ──────────────────────────────────────
  const warningWindow = new Date(now);
  warningWindow.setDate(warningWindow.getDate() + 1);

  const { data: expiringSoon } = await supabase
    .from("profiles")
    .select("id, email, full_name, trial_expires_at")
    .eq("plan", "free_test")
    .eq("trial_warning_sent", false)
    .lte("trial_expires_at", warningWindow.toISOString())
    .gt("trial_expires_at", now.toISOString());

  const warned: string[] = [];
  for (const profile of expiringSoon ?? []) {
    const email = profile.email as string | null;
    const name = (profile.full_name as string | null) ?? "there";
    if (email) {
      await sendTrialExpiringSoonEmail(email, name).catch(() => {});
    }
    await supabase
      .from("profiles")
      .update({ trial_warning_sent: true })
      .eq("id", profile.id);
    warned.push(profile.id as string);
  }

  // ── 2. Expire trials that have passed ───────────────────────────────────────
  const { data: expired } = await supabase
    .from("profiles")
    .select("id, email, full_name")
    .eq("plan", "free_test")
    .lt("trial_expires_at", now.toISOString());

  const expiredIds: string[] = [];
  for (const profile of expired ?? []) {
    const email = profile.email as string | null;
    const name = (profile.full_name as string | null) ?? "there";

    await supabase
      .from("profiles")
      .update({ plan: "expired" })
      .eq("id", profile.id);

    if (email) {
      await sendTrialExpiredEmail(email, name).catch(() => {});
    }
    expiredIds.push(profile.id as string);
  }

  return NextResponse.json({
    success: true,
    warned: warned.length,
    expired: expiredIds.length,
  });
}
