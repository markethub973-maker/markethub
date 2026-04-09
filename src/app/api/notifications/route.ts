/**
 * GET /api/notifications
 * Returns system notifications for the current user:
 * - Trial expiry warning
 * - Abuse flags (if admin)
 * - Cron health (if admin)
 * - Engagement alerts triggered
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export interface Notification {
  id: string;
  type: "warning" | "error" | "info" | "success";
  title: string;
  message: string;
  action_url?: string;
  action_label?: string;
  created_at: string;
  read: boolean;
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const notifications: Notification[] = [];
  const now = new Date().toISOString();

  // ── 1. Trial expiry ───────────────────────────────────────────────────────
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_plan, plan, trial_expires_at, is_admin, subscription_status")
    .eq("id", user.id)
    .single();

  const currentPlan = profile?.subscription_plan || profile?.plan || "free_test";

  if (currentPlan === "free_test" && profile?.trial_expires_at) {
    const msLeft = new Date(profile.trial_expires_at).getTime() - Date.now();
    const daysLeft = Math.ceil(msLeft / 86400000);

    if (msLeft <= 0) {
      notifications.push({
        id: "trial_expired",
        type: "error",
        title: "Trial Expired",
        message: "Your free trial has ended. Upgrade to keep access to all features.",
        action_url: "/upgrade-required",
        action_label: "Choose a Plan",
        created_at: profile.trial_expires_at,
        read: false,
      });
    } else if (daysLeft <= 1) {
      notifications.push({
        id: "trial_last_day",
        type: "error",
        title: "Last day of trial!",
        message: "Your free trial ends today. Upgrade now to avoid losing access.",
        action_url: "/upgrade-required",
        action_label: "Upgrade Now",
        created_at: now,
        read: false,
      });
    } else if (daysLeft <= 3) {
      notifications.push({
        id: `trial_${daysLeft}d`,
        type: "warning",
        title: `${daysLeft} days left in trial`,
        message: "Upgrade before your trial expires to keep your data and settings.",
        action_url: "/upgrade-required",
        action_label: "View Plans",
        created_at: now,
        read: false,
      });
    }
  }

  // ── 2. Triggered engagement alerts ───────────────────────────────────────
  try {
    const { data: triggeredAlerts } = await supabase
      .from("alert_rules")
      .select("id, name, last_triggered_at, last_value")
      .eq("user_id", user.id)
      .eq("status", "triggered")
      .order("last_triggered_at", { ascending: false })
      .limit(3);

    (triggeredAlerts || []).forEach((a: any) => {
      notifications.push({
        id: `alert_${a.id}`,
        type: "warning",
        title: `Alert Triggered: ${a.name}`,
        message: `Your metric alert "${a.name}" was triggered. Current value: ${a.last_value ?? "N/A"}.`,
        action_url: "/alerts",
        action_label: "View Alerts",
        created_at: a.last_triggered_at || now,
        read: false,
      });
    });
  } catch { /* table may not exist */ }

  // ── 3. Admin-only: abuse flags ────────────────────────────────────────────
  // abuse_flags + cron_logs are now RLS-protected (vul2 migration). Admin
  // notifications need to read all rows across users, so we use the service
  // client which bypasses RLS. The is_admin check above gates this branch.
  if (profile?.is_admin) {
    const svc = createServiceClient();
    try {
      const { data: flags } = await svc
        .from("abuse_flags")
        .select("id, user_id, reason, severity, detected_at")
        .eq("resolved", false)
        .order("detected_at", { ascending: false })
        .limit(5);

      const flagCount = flags?.length ?? 0;
      if (flagCount > 0) {
        notifications.push({
          id: "abuse_flags",
          type: "error",
          title: `${flagCount} Unresolved Abuse Flag${flagCount > 1 ? "s" : ""}`,
          message: `${flagCount} account${flagCount > 1 ? "s" : ""} flagged for possible abuse. Review in the admin panel.`,
          action_url: "/dashboard/admin/users?tab=users&filter=flagged",
          action_label: "Review",
          created_at: flags?.[0]?.detected_at || now,
          read: false,
        });
      }
    } catch { /* table not yet created */ }

    // Admin: cron health
    try {
      const { data: cronLogs } = await svc
        .from("cron_logs")
        .select("job, ran_at, result")
        .order("ran_at", { ascending: false })
        .limit(10);

      const oneDayAgo = new Date(Date.now() - 25 * 3600000).toISOString();
      const staleCrons = (cronLogs || []).filter(
        (c: any) => c.ran_at && c.ran_at < oneDayAgo
      );

      if (staleCrons.length > 0) {
        notifications.push({
          id: "stale_crons",
          type: "warning",
          title: `${staleCrons.length} Cron Job${staleCrons.length > 1 ? "s" : ""} Overdue`,
          message: `Jobs not run in 25h: ${staleCrons.map((c: any) => c.job).join(", ")}.`,
          action_url: "/dashboard/admin",
          action_label: "Admin Panel",
          created_at: now,
          read: true,
        });
      }
    } catch { /* ignore */ }
  }

  // ── 4. Welcome / onboarding tip ──────────────────────────────────────────
  if (notifications.length === 0) {
    notifications.push({
      id: "welcome",
      type: "info",
      title: "Everything looks good!",
      message: "No alerts at the moment. We'll notify you when something needs your attention.",
      created_at: now,
      read: true,
    });
  }

  const unread = notifications.filter(n => !n.read).length;

  return NextResponse.json({ notifications, unread });
}
