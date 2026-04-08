/**
 * GET /api/admin/users — All registered users with subscription revenue, abuse flags, tokens used
 * POST /api/admin/users — Block / unblock a user or change plan
 *
 * Auth: HMAC admin token (isAdminAuthorized)
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isAdminAuthorized } from "@/lib/adminAuth";
import { logAudit, getIpFromHeaders } from "@/lib/auditLog";
import { TOKEN_PLANS } from "@/lib/token-plan-config";

const PLAN_PRICES: Record<string, number> = {
  free_test:  0,
  lite:       24,
  pro:        49,
  business:   99,
  enterprise: 249,
};

function getPlanPrice(plan: string): number {
  return PLAN_PRICES[plan] ?? 0;
}

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supa = createServiceClient();

  // ── 1. All profiles ───────────────────────────────────────────────────────
  const { data: profiles, error: profilesErr } = await supa
    .from("profiles")
    .select(
      `id, email, name, full_name, subscription_plan, subscription_status,
       trial_expires_at, is_admin, is_blocked, blocked_reason,
       registration_ip, normalized_email,
       tokens_used_month, created_at`
    )
    .order("created_at", { ascending: false });

  if (profilesErr) {
    return NextResponse.json({ error: profilesErr.message }, { status: 500 });
  }

  // ── 2. Abuse flags ────────────────────────────────────────────────────────
  let abuseFlags: Record<string, any[]> = {};
  try {
    const { data: flags } = await supa
      .from("abuse_flags")
      .select("user_id, reason, severity, detected_at, resolved");
    (flags || []).forEach((f: any) => {
      if (!abuseFlags[f.user_id]) abuseFlags[f.user_id] = [];
      abuseFlags[f.user_id].push(f);
    });
  } catch { /* table may not exist yet */ }

  // ── 3. Current month AI cost from usage_tracking ─────────────────────────
  const monthKey = new Date().toISOString().substring(0, 7); // "2026-04"
  let usageCosts: Record<string, number> = {};
  try {
    const { data: usageRows } = await supa
      .from("usage_tracking")
      .select("user_id, cost_usd")
      .eq("month_year", monthKey);
    (usageRows || []).forEach((r: any) => {
      usageCosts[r.user_id] = (usageCosts[r.user_id] || 0) + (r.cost_usd || 0);
    });
  } catch { /* ignore */ }

  // ── 4. Build enriched users ───────────────────────────────────────────────
  const users = (profiles || []).map((p: any) => {
    const plan = p.subscription_plan || "free_test";
    const planPrice = getPlanPrice(plan);
    const aiCost = usageCosts[p.id] || 0;

    return {
      id: p.id,
      email: p.email || "",
      name: p.name || p.full_name || "",
      plan,
      subscription_status: p.subscription_status || "inactive",
      trial_expires_at: p.trial_expires_at || null,
      is_admin: p.is_admin || false,
      is_blocked: p.is_blocked || false,
      blocked_reason: p.blocked_reason || null,
      registration_ip: p.registration_ip || null,
      normalized_email: p.normalized_email || null,
      tokens_used_month: p.tokens_used_month || 0,
      monthly_revenue: planPrice,
      ai_cost_month: parseFloat(aiCost.toFixed(4)),
      net_per_user: parseFloat((planPrice - aiCost).toFixed(4)),
      created_at: p.created_at,
      abuse_flags: abuseFlags[p.id] || [],
    };
  });

  // ── 5. Aggregates ─────────────────────────────────────────────────────────
  const totalRevenue = users.reduce((s: number, u: any) => s + u.monthly_revenue, 0);
  const totalAiCost  = users.reduce((s: number, u: any) => s + u.ai_cost_month, 0);

  // Revenue breakdown per plan
  const revenueByPlan: Record<string, { count: number; revenue: number }> = {};
  users.forEach((u: any) => {
    if (!revenueByPlan[u.plan]) revenueByPlan[u.plan] = { count: 0, revenue: 0 };
    revenueByPlan[u.plan].count++;
    revenueByPlan[u.plan].revenue += u.monthly_revenue;
  });

  return NextResponse.json({
    success: true,
    users,
    summary: {
      total_users: users.length,
      total_monthly_revenue: parseFloat(totalRevenue.toFixed(2)),
      total_ai_cost_month: parseFloat(totalAiCost.toFixed(4)),
      net_profit_month: parseFloat((totalRevenue - totalAiCost).toFixed(4)),
      revenue_by_plan: revenueByPlan,
      blocked_count: users.filter((u: any) => u.is_blocked).length,
      flagged_count: users.filter((u: any) => u.abuse_flags.length > 0).length,
    },
  });
}

// ── POST: block/unblock/change plan ──────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { user_id, action, reason, plan } = body;

  if (!user_id || !action) {
    return NextResponse.json({ error: "user_id and action required" }, { status: 400 });
  }

  const supa = createServiceClient();

  // Never block an admin account
  const { data: targetProfile } = await supa
    .from("profiles")
    .select("is_admin")
    .eq("id", user_id)
    .single();

  if (action === "block") {
    if (targetProfile?.is_admin) {
      return NextResponse.json({ error: "Cannot block an admin account" }, { status: 403 });
    }
    await supa.from("profiles").update({
      is_blocked: true,
      blocked_reason: reason || "Blocked by admin",
    }).eq("id", user_id);

    // Also log an abuse flag
    try {
      await supa.from("abuse_flags").upsert({
        user_id,
        reason: reason || "Manual block by admin",
        severity: "high",
        resolved: false,
      }, { onConflict: "user_id,reason" });
    } catch { /* ignore */ }

    await logAudit({
      action: "user_blocked",
      actor_id: "admin",
      target_id: user_id,
      entity_type: "user",
      details: { reason: reason || "Manual block by admin" },
      ip: getIpFromHeaders(req.headers),
    });
    return NextResponse.json({ success: true, action: "blocked" });
  }

  if (action === "unblock") {
    await supa.from("profiles").update({
      is_blocked: false,
      blocked_reason: null,
    }).eq("id", user_id);
    await logAudit({
      action: "user_unblocked",
      actor_id: "admin",
      target_id: user_id,
      entity_type: "user",
      ip: getIpFromHeaders(req.headers),
    });
    return NextResponse.json({ success: true, action: "unblocked" });
  }

  if (action === "change_plan") {
    if (!plan) return NextResponse.json({ error: "plan required" }, { status: 400 });
    await supa.from("profiles").update({
      subscription_plan: plan,
    }).eq("id", user_id);
    await logAudit({
      action: "plan_changed",
      actor_id: "admin",
      target_id: user_id,
      entity_type: "user",
      details: { new_plan: plan },
      ip: getIpFromHeaders(req.headers),
    });
    return NextResponse.json({ success: true, action: "plan_changed", plan });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
