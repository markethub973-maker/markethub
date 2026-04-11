import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  sendOnboarding2_Setup,
  sendOnboarding3_Instagram,
  sendOnboarding4_Competitors,
  sendOnboarding5_ProTips,
} from "@/lib/resend";

const CRON_SECRET = process.env.CRON_SECRET!;

// Step 1 is sent at registration. Steps 2–5 are sent by this cron (daily).
// Each step has a window of ±6h so we don't miss users across timezones.
const STEPS = [
  { daysAfter: 1, label: "step2", fn: sendOnboarding2_Setup },
  { daysAfter: 2, label: "step3", fn: sendOnboarding3_Instagram },
  { daysAfter: 4, label: "step4", fn: sendOnboarding4_Competitors },
  { daysAfter: 6, label: "step5", fn: sendOnboarding5_ProTips },
] as const;

const WINDOW_MS = 6 * 60 * 60 * 1000; // ±6 hours

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const fromCron = CRON_SECRET && authHeader === `Bearer ${CRON_SECRET}`;
  if (!fromCron) {
    let fromAdmin = false;
    try {
      const crypto = (await import("crypto")).default;
      const { generateAdminToken } = await import("@/lib/adminAuth");
      const expected = generateAdminToken();
      const cookieHeader = req.headers.get("cookie") ?? "";
      const match = cookieHeader.match(/admin_session_token=([^;]+)/);
      const token = match?.[1] ?? "";
      fromAdmin = token.length === expected.length &&
        crypto.timingSafeEqual(Buffer.from(token, "hex"), Buffer.from(expected, "hex"));
    } catch {}
    if (!fromAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const supabase = createServiceClient();
  const now = new Date();
  const summary: Record<string, { sent: number; errors: number }> = {};

  for (const step of STEPS) {
    const target = new Date(now.getTime() - step.daysAfter * 24 * 60 * 60 * 1000);
    const from = new Date(target.getTime() - WINDOW_MS).toISOString();
    const to = new Date(target.getTime() + WINDOW_MS).toISOString();

    const { data: users } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .gte("created_at", from)
      .lte("created_at", to)
      .not("email", "is", null);

    summary[step.label] = { sent: 0, errors: 0 };

    for (const user of users ?? []) {
      try {
        await step.fn(user.email, user.full_name || "there");
        summary[step.label].sent++;
      } catch {
        summary[step.label].errors++;
      }
    }
  }

  await supabase.from("cron_logs").upsert({
    job: "onboarding",
    ran_at: new Date().toISOString(),
    result: { summary },
  });
  return NextResponse.json({ success: true, summary });
}
