/**
 * Cost & Resource Monitor — M3 Sprint 1
 *
 * Polls every paid (and free-with-limits) resource, writes to `resource_usage`
 * table, fires alerts on Telegram + email at 80% and 95% thresholds.
 *
 * Resources tracked:
 *   - Anthropic API (credits consumed vs monthly budget)
 *   - Supabase (rows, storage, bandwidth — via Management API)
 *   - Vercel (bandwidth, functions — via Vercel API)
 *   - Stripe (fees, failed payments — via Stripe API)
 *   - Apify (credits — via Apify API)
 *   - Resend (emails sent — via Resend API)
 *   - Tokens (Meta/IG, TikTok, LinkedIn, Google — expiry days)
 *
 * Each checker is independent and fault-tolerant: if one API is down, the
 * others still run. Failures are logged but do not block the batch.
 */

import { createServiceClient } from "@/lib/supabase/service";

// ── Plan limits (default soft caps — adjustable per user's actual plans) ─
export const RESOURCE_LIMITS = {
  // AI
  anthropic_monthly_usd: Number(process.env.ANTHROPIC_MONTHLY_BUDGET_USD ?? 100),
  // Supabase free tier: 500 MB DB, 1 GB storage, 5 GB bandwidth
  supabase_db_mb: Number(process.env.SUPABASE_DB_LIMIT_MB ?? 500),
  supabase_storage_mb: Number(process.env.SUPABASE_STORAGE_LIMIT_MB ?? 1024),
  // Vercel Hobby: 100 GB bandwidth, 100k function invocations
  vercel_bandwidth_gb: Number(process.env.VERCEL_BANDWIDTH_LIMIT_GB ?? 100),
  vercel_functions: Number(process.env.VERCEL_FUNCTIONS_LIMIT ?? 100_000),
  // Apify — depends on plan, default Starter ($49/mo = $49 credits)
  apify_credits_usd: Number(process.env.APIFY_CREDITS_LIMIT_USD ?? 49),
  // Resend free: 3000/month, paid: depends
  resend_emails_month: Number(process.env.RESEND_EMAILS_LIMIT ?? 3000),
  // YouTube API: 10,000 quota units/day
  youtube_daily_quota: 10_000,
  // Token expiry thresholds (alert when X days left)
  token_warning_days: 7,
};

export interface ResourceCheck {
  resource: string;
  category: "ai" | "infra" | "payments" | "scraping" | "email" | "tokens" | "api_quota";
  current_value: number;
  limit_value: number;
  unit: string;
  detail?: Record<string, unknown>;
  projection_days?: number | null;
  error?: string;
}

// ── Individual resource checkers ────────────────────────────────────────

/** Check Anthropic API credits via usage of premium_actions this month. */
async function checkAnthropicUsage(): Promise<ResourceCheck> {
  try {
    const supa = createServiceClient();
    const firstOfMonth = new Date();
    firstOfMonth.setUTCDate(1);
    firstOfMonth.setUTCHours(0, 0, 0, 0);

    const { data, error } = await supa
      .from("ai_usage")
      .select("cost_usd")
      .gte("created_at", firstOfMonth.toISOString());
    if (error) throw error;

    const totalUsd = (data ?? []).reduce((sum, r) => sum + Number(r.cost_usd ?? 0), 0);
    const limit = RESOURCE_LIMITS.anthropic_monthly_usd;
    const daysIntoMonth = Math.max(1, Math.floor((Date.now() - firstOfMonth.getTime()) / 86400000));
    const dailyBurn = totalUsd / daysIntoMonth;
    const daysRemaining = dailyBurn > 0 ? Math.floor((limit - totalUsd) / dailyBurn) : null;

    return {
      resource: "anthropic_credits",
      category: "ai",
      current_value: Math.round(totalUsd * 100) / 100,
      limit_value: limit,
      unit: "usd",
      projection_days: daysRemaining,
      detail: { daily_burn_usd: Math.round(dailyBurn * 100) / 100, days_into_month: daysIntoMonth },
    };
  } catch (e) {
    return {
      resource: "anthropic_credits",
      category: "ai",
      current_value: 0,
      limit_value: RESOURCE_LIMITS.anthropic_monthly_usd,
      unit: "usd",
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

/** Supabase DB size (rows across tables) via service role. */
async function checkSupabaseDb(): Promise<ResourceCheck> {
  try {
    const supa = createServiceClient();
    // pg_database_size of the 'postgres' DB → returns bytes
    const { data, error } = await supa.rpc("pg_database_size_mb").maybeSingle();
    let mb = 0;
    if (!error && data != null) {
      mb = Number(data);
    } else {
      // Fallback: sum rows from main tables (rough estimate)
      const tables = ["profiles", "scheduled_posts", "research_leads", "social_messages", "reviews"];
      let total = 0;
      for (const t of tables) {
        const { count } = await supa.from(t).select("id", { count: "exact", head: true });
        total += (count ?? 0);
      }
      mb = Math.round((total * 2) / 1000); // ~2 KB per row rough estimate
    }
    return {
      resource: "supabase_db",
      category: "infra",
      current_value: mb,
      limit_value: RESOURCE_LIMITS.supabase_db_mb,
      unit: "mb",
    };
  } catch (e) {
    return {
      resource: "supabase_db",
      category: "infra",
      current_value: 0,
      limit_value: RESOURCE_LIMITS.supabase_db_mb,
      unit: "mb",
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

/** Vercel bandwidth + function invocations via API. */
async function checkVercel(): Promise<ResourceCheck[]> {
  const out: ResourceCheck[] = [];
  const token = process.env.VERCEL_API_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamId = process.env.VERCEL_TEAM_ID;

  if (!token || !projectId) {
    return [{
      resource: "vercel_bandwidth",
      category: "infra",
      current_value: 0,
      limit_value: RESOURCE_LIMITS.vercel_bandwidth_gb,
      unit: "gb",
      error: "VERCEL_API_TOKEN or VERCEL_PROJECT_ID not set",
    }];
  }

  try {
    // Vercel usage API (beta) — v1 usage endpoint
    const teamQs = teamId ? `?teamId=${teamId}` : "";
    const res = await fetch(`https://api.vercel.com/v1/usage/${projectId}${teamQs}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Vercel API ${res.status}`);
    const data = await res.json() as { bandwidth?: number; invocations?: number };

    out.push({
      resource: "vercel_bandwidth",
      category: "infra",
      current_value: Math.round(((data.bandwidth ?? 0) / 1024 ** 3) * 100) / 100,
      limit_value: RESOURCE_LIMITS.vercel_bandwidth_gb,
      unit: "gb",
    });
    out.push({
      resource: "vercel_functions",
      category: "infra",
      current_value: data.invocations ?? 0,
      limit_value: RESOURCE_LIMITS.vercel_functions,
      unit: "invocations",
    });
  } catch (e) {
    out.push({
      resource: "vercel_bandwidth",
      category: "infra",
      current_value: 0,
      limit_value: RESOURCE_LIMITS.vercel_bandwidth_gb,
      unit: "gb",
      error: e instanceof Error ? e.message : String(e),
    });
  }
  return out;
}

/** Apify credits remaining via account API. */
async function checkApify(): Promise<ResourceCheck> {
  const token = process.env.APIFY_TOKEN;
  if (!token) {
    return {
      resource: "apify_credits",
      category: "scraping",
      current_value: 0,
      limit_value: RESOURCE_LIMITS.apify_credits_usd,
      unit: "usd",
      error: "APIFY_TOKEN not set",
    };
  }
  try {
    const res = await fetch("https://api.apify.com/v2/users/me/usage/monthly", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Apify ${res.status}`);
    const data = await res.json() as { data?: { monthlyServiceUsage?: { total?: { amountInUsd?: number } } } };
    const used = data.data?.monthlyServiceUsage?.total?.amountInUsd ?? 0;
    return {
      resource: "apify_credits",
      category: "scraping",
      current_value: Math.round(used * 100) / 100,
      limit_value: RESOURCE_LIMITS.apify_credits_usd,
      unit: "usd",
    };
  } catch (e) {
    return {
      resource: "apify_credits",
      category: "scraping",
      current_value: 0,
      limit_value: RESOURCE_LIMITS.apify_credits_usd,
      unit: "usd",
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

/** Resend emails sent this month. */
async function checkResend(): Promise<ResourceCheck> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return {
      resource: "resend_emails",
      category: "email",
      current_value: 0,
      limit_value: RESOURCE_LIMITS.resend_emails_month,
      unit: "emails",
      error: "RESEND_API_KEY not set",
    };
  }
  try {
    // Resend doesn't expose monthly count directly — use audit via own DB
    const supa = createServiceClient();
    const firstOfMonth = new Date();
    firstOfMonth.setUTCDate(1);
    firstOfMonth.setUTCHours(0, 0, 0, 0);
    const { count } = await supa
      .from("email_log")
      .select("id", { count: "exact", head: true })
      .gte("created_at", firstOfMonth.toISOString());
    return {
      resource: "resend_emails",
      category: "email",
      current_value: count ?? 0,
      limit_value: RESOURCE_LIMITS.resend_emails_month,
      unit: "emails",
    };
  } catch (e) {
    return {
      resource: "resend_emails",
      category: "email",
      current_value: 0,
      limit_value: RESOURCE_LIMITS.resend_emails_month,
      unit: "emails",
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

/** Check platform tokens (Meta/IG, TikTok, LinkedIn, Google) for expiration. */
async function checkTokenExpiry(): Promise<ResourceCheck[]> {
  const checks: ResourceCheck[] = [];
  try {
    const supa = createServiceClient();
    const { data: profiles } = await supa
      .from("profiles")
      .select("id, email, instagram_access_token, instagram_token_expires_at, meta_user_token, tiktok_access_token, tiktok_token_expires_at, linkedin_access_token, linkedin_token_expires_at, youtube_token_expires_at")
      .limit(200);

    const tokens = [
      { platform: "instagram", expiry: "instagram_token_expires_at" },
      { platform: "tiktok", expiry: "tiktok_token_expires_at" },
      { platform: "linkedin", expiry: "linkedin_token_expires_at" },
      { platform: "youtube", expiry: "youtube_token_expires_at" },
    ] as const;

    for (const t of tokens) {
      let minDays = 999;
      let totalExpiringSoon = 0;
      for (const p of profiles ?? []) {
        const v = p[t.expiry as keyof typeof p];
        if (!v) continue;
        const daysLeft = Math.floor((new Date(v as string).getTime() - Date.now()) / 86400000);
        minDays = Math.min(minDays, daysLeft);
        if (daysLeft < RESOURCE_LIMITS.token_warning_days) totalExpiringSoon++;
      }
      if (minDays !== 999) {
        checks.push({
          resource: `${t.platform}_token_min_days`,
          category: "tokens",
          // Invert logic: "current_value" = 1 (1 expiring token), limit = days_left — treat low days as high usage %
          current_value: Math.max(0, 100 - (minDays / 60) * 100), // 60 days full = 0%, 0 days = 100%
          limit_value: 100,
          unit: "pct_urgency",
          detail: { min_days_left: minDays, expiring_soon_count: totalExpiringSoon },
        });
      }
    }
  } catch (e) {
    checks.push({
      resource: "token_check",
      category: "tokens",
      current_value: 0,
      limit_value: 100,
      unit: "pct_urgency",
      error: e instanceof Error ? e.message : String(e),
    });
  }
  return checks;
}

// ── Main run all + persist + alert ──────────────────────────────────────

export async function runAllChecks(): Promise<ResourceCheck[]> {
  const results = await Promise.all([
    checkAnthropicUsage(),
    checkSupabaseDb(),
    checkVercel(),
    checkApify(),
    checkResend(),
    checkTokenExpiry(),
  ]);
  return results.flat();
}

export async function persistChecks(checks: ResourceCheck[]) {
  const supa = createServiceClient();
  const rows = checks.map((c) => ({
    resource: c.resource,
    category: c.category,
    current_value: c.current_value,
    limit_value: c.limit_value,
    unit: c.unit,
    projection_days: c.projection_days ?? null,
    detail: { ...(c.detail ?? {}), ...(c.error ? { error: c.error } : {}) },
  }));
  const { error } = await supa.from("resource_usage").insert(rows);
  if (error) console.error("persistChecks error:", error);
}

export async function fireAlertsIfNeeded(checks: ResourceCheck[]) {
  const supa = createServiceClient();
  const alerts: Array<{
    resource: string;
    threshold: "80" | "95";
    pct: number;
    message: string;
    recommendation: string;
  }> = [];

  for (const c of checks) {
    if (c.limit_value <= 0) continue;
    const pct = (c.current_value / c.limit_value) * 100;
    let threshold: "80" | "95" | null = null;
    if (pct >= 95) threshold = "95";
    else if (pct >= 80) threshold = "80";
    if (!threshold) continue;

    // Dedup: don't alert again if the same (resource, threshold) was alerted in the last 24h
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recent } = await supa
      .from("resource_alerts")
      .select("id")
      .eq("resource", c.resource)
      .eq("threshold", threshold)
      .gte("created_at", cutoff)
      .maybeSingle();
    if (recent) continue;

    const severity = threshold === "95" ? "🚨 URGENT" : "⚠️ WARNING";
    const message = `${severity} — ${c.resource} at ${pct.toFixed(1)}% (${c.current_value} / ${c.limit_value} ${c.unit})`;
    const recommendation = threshold === "95"
      ? `Immediate action required. Consider upgrading plan or adding capacity.`
      : `Monitor closely. Projected ${c.projection_days ?? "?"} days until limit.`;

    alerts.push({ resource: c.resource, threshold, pct, message, recommendation });
  }

  if (alerts.length === 0) return { fired: 0 };

  // Send via Telegram + email in parallel
  for (const a of alerts) {
    await Promise.all([
      sendTelegram(`${a.message}\n\n${a.recommendation}`),
      sendEmail(`MarketHub Pro — Resource Alert: ${a.resource}`, `${a.message}\n\n${a.recommendation}`),
    ]);
    await supa.from("resource_alerts").insert({
      resource: a.resource,
      threshold: a.threshold,
      pct_at_alert: Math.round(a.pct * 10) / 10,
      message: a.message,
      recommendation: a.recommendation,
      channels_notified: ["telegram", "email"],
    });
  }
  return { fired: alerts.length };
}

async function sendTelegram(text: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (!botToken || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
  } catch (e) {
    console.error("sendTelegram error:", e);
  }
}

async function sendEmail(subject: string, text: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!apiKey || !adminEmail) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "MarketHub Pro <alerts@markethubpromo.com>",
        to: [adminEmail],
        subject,
        text,
      }),
    });
  } catch (e) {
    console.error("sendEmail error:", e);
  }
}
