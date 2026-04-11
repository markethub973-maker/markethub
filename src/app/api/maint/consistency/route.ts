/**
 * Maintenance Agent 3 — Cross-System Consistency
 *
 * Finds drift between systems that should agree:
 *
 *   1. Stripe → DB subscription mismatch
 *      For each profile with non-null `stripe_subscription_id`, fetch the sub
 *      from Stripe. If Stripe says canceled/expired but DB says active (or
 *      vice versa), that's a finding.
 *
 *   2. Orphan Stripe subscriptions
 *      List every `active` subscription in Stripe, verify each maps to a
 *      profile with the same `stripe_subscription_id`. Orphans are paying
 *      customers we've lost track of — critical.
 *
 *   3. Instagram token health
 *      For each row in `instagram_connections` with `page_access_token`, call
 *      `graph.facebook.com/v22.0/me`. A 400/401 means the token is expired or
 *      revoked.
 *
 *   4. LinkedIn token health
 *      For each profile with `linkedin_access_token`, call
 *      `api.linkedin.com/v2/userinfo`. 401 = expired.
 *
 * Auth: Bearer CRON_SECRET.
 */
import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cronAuth";
import { reportFinding, autoResolveStale } from "@/lib/maintenanceAgent";
import { createServiceClient } from "@/lib/supabase/service";
import { getStripe } from "@/lib/stripe";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const AGENT_NAME = "consistency";

// Hard cap on how many rows of each kind we check per run. Prevents the agent
// from blowing its maxDuration budget on huge user sets. Escalate to a queue
// job if this ever becomes a real limit.
const MAX_STRIPE_PROFILES = 200;
const MAX_IG_CONNECTIONS = 100;
const MAX_LINKEDIN_PROFILES = 100;

async function checkStripeVsDB(active: Set<string>): Promise<{ checked: number; drift: number }> {
  const supa = createServiceClient();
  const stripe = getStripe();

  const { data: profiles, error } = await supa
    .from("profiles")
    .select("id, email, stripe_subscription_id, subscription_plan, subscription_status")
    .not("stripe_subscription_id", "is", null)
    .limit(MAX_STRIPE_PROFILES);

  if (error || !profiles) return { checked: 0, drift: 0 };

  let drift = 0;
  for (const p of profiles) {
    const subId = p.stripe_subscription_id as string;
    try {
      const sub = await stripe.subscriptions.retrieve(subId);
      const stripeActive =
        sub.status === "active" || sub.status === "trialing" || sub.status === "past_due";
      const dbActive = (p.subscription_status ?? "active") !== "expired" && p.subscription_plan !== "expired";

      if (stripeActive !== dbActive) {
        drift++;
        const fp = `consistency:sub-drift:${p.id}`;
        active.add(fp);
        await reportFinding({
          agent: AGENT_NAME,
          severity: "high",
          fingerprint: fp,
          title: `Stripe/DB subscription drift for ${p.email ?? p.id}`,
          details: {
            profile_id: p.id,
            email: p.email,
            stripe_sub_id: subId,
            stripe_status: sub.status,
            db_plan: p.subscription_plan,
            db_status: p.subscription_status,
          },
          fix_suggestion:
            stripeActive && !dbActive
              ? `Stripe says active but DB says expired. Re-run webhook customer.subscription.updated for ${subId}, or PATCH profile directly.`
              : `Stripe says canceled but DB still thinks user is active. Clear stripe_subscription_id + set subscription_plan='expired' for profile ${p.id}.`,
        });
      }
    } catch (e) {
      // Stripe 404 = sub gone entirely (deleted from Stripe side). That's drift too.
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("No such subscription")) {
        drift++;
        const fp = `consistency:sub-gone:${p.id}`;
        active.add(fp);
        await reportFinding({
          agent: AGENT_NAME,
          severity: "high",
          fingerprint: fp,
          title: `Subscription ${subId} no longer exists in Stripe but still on profile ${p.email}`,
          details: { profile_id: p.id, email: p.email, stripe_sub_id: subId },
          fix_suggestion: `Clear stripe_subscription_id for profile ${p.id} and reconcile subscription_plan.`,
        });
      }
    }
  }

  return { checked: profiles.length, drift };
}

async function checkOrphanStripeSubs(active: Set<string>): Promise<{ checked: number; orphans: number }> {
  const stripe = getStripe();
  const supa = createServiceClient();
  let checked = 0;
  let orphans = 0;

  // Only check the first page — if we have hundreds of active subs, escalate
  // this to a paginated background job rather than running in a 60s window.
  const list = await stripe.subscriptions.list({ status: "active", limit: 100 });
  checked = list.data.length;

  const ids = list.data.map((s) => s.id);
  if (ids.length === 0) return { checked, orphans };

  const { data: known } = await supa
    .from("profiles")
    .select("stripe_subscription_id")
    .in("stripe_subscription_id", ids);

  const knownSet = new Set((known ?? []).map((r) => r.stripe_subscription_id as string));

  for (const sub of list.data) {
    if (knownSet.has(sub.id)) continue;
    orphans++;
    const fp = `consistency:orphan-sub:${sub.id}`;
    active.add(fp);
    await reportFinding({
      agent: AGENT_NAME,
      severity: "critical",
      fingerprint: fp,
      title: `Orphan Stripe subscription ${sub.id} — customer paying, no matching profile`,
      details: {
        subscription_id: sub.id,
        customer_id: sub.customer,
        status: sub.status,
        current_period_end: sub.current_period_end,
      },
      fix_suggestion: `Find the Stripe customer ${sub.customer}, look up their email in Stripe dashboard, then set profiles.stripe_subscription_id = '${sub.id}' on the matching profile. Or refund + cancel the sub if the user no longer exists.`,
    });
  }

  return { checked, orphans };
}

async function checkInstagramTokens(active: Set<string>): Promise<{ checked: number; broken: number }> {
  const supa = createServiceClient();
  const { data: conns, error } = await supa
    .from("instagram_connections")
    .select("id, user_id, instagram_username, page_access_token")
    .not("page_access_token", "is", null)
    .limit(MAX_IG_CONNECTIONS);

  if (error || !conns) return { checked: 0, broken: 0 };

  let broken = 0;
  for (const c of conns) {
    const token = c.page_access_token as string | null;
    if (!token) continue;
    try {
      const res = await fetch(
        `https://graph.facebook.com/v22.0/me?access_token=${encodeURIComponent(token)}`,
      );
      if (!res.ok) {
        broken++;
        const fp = `consistency:ig-token:${c.id}`;
        active.add(fp);
        const body = await res.text();
        await reportFinding({
          agent: AGENT_NAME,
          severity: "medium",
          fingerprint: fp,
          title: `Instagram token expired/revoked for @${c.instagram_username ?? c.id}`,
          details: {
            connection_id: c.id,
            user_id: c.user_id,
            username: c.instagram_username,
            http: res.status,
            body: body.slice(0, 500),
          },
          fix_suggestion: `User must re-auth Instagram via /settings. Alternatively, refresh via Graph API long-lived token endpoint if refresh cron is configured.`,
        });
      }
    } catch (e) {
      // Network errors don't count as broken tokens — skip silently.
      void e;
    }
  }

  return { checked: conns.length, broken };
}

async function checkLinkedInTokens(active: Set<string>): Promise<{ checked: number; broken: number }> {
  const supa = createServiceClient();
  const { data: profiles, error } = await supa
    .from("profiles")
    .select("id, email, linkedin_access_token")
    .not("linkedin_access_token", "is", null)
    .limit(MAX_LINKEDIN_PROFILES);

  if (error || !profiles) return { checked: 0, broken: 0 };

  let broken = 0;
  for (const p of profiles) {
    const token = p.linkedin_access_token as string | null;
    if (!token) continue;
    try {
      const res = await fetch("https://api.linkedin.com/v2/userinfo", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        broken++;
        const fp = `consistency:linkedin-token:${p.id}`;
        active.add(fp);
        await reportFinding({
          agent: AGENT_NAME,
          severity: "medium",
          fingerprint: fp,
          title: `LinkedIn token expired for ${p.email ?? p.id}`,
          details: { profile_id: p.id, email: p.email, http: res.status },
          fix_suggestion: `User must re-auth LinkedIn via /settings. LinkedIn tokens last ~60 days and cannot be refreshed silently.`,
        });
      }
    } catch (e) {
      void e;
    }
  }

  return { checked: profiles.length, broken };
}

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req, "/api/maint/consistency")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const active = new Set<string>();

  const results = {
    stripe_vs_db: { checked: 0, drift: 0 } as { checked: number; drift: number; error?: string },
    orphan_stripe_subs: { checked: 0, orphans: 0 } as { checked: number; orphans: number; error?: string },
    instagram_tokens: { checked: 0, broken: 0 } as { checked: number; broken: number; error?: string },
    linkedin_tokens: { checked: 0, broken: 0 } as { checked: number; broken: number; error?: string },
  };

  try {
    results.stripe_vs_db = await checkStripeVsDB(active);
  } catch (e) {
    results.stripe_vs_db.error = e instanceof Error ? e.message : String(e);
  }

  try {
    results.orphan_stripe_subs = await checkOrphanStripeSubs(active);
  } catch (e) {
    results.orphan_stripe_subs.error = e instanceof Error ? e.message : String(e);
  }

  try {
    results.instagram_tokens = await checkInstagramTokens(active);
  } catch (e) {
    results.instagram_tokens.error = e instanceof Error ? e.message : String(e);
  }

  try {
    results.linkedin_tokens = await checkLinkedInTokens(active);
  } catch (e) {
    results.linkedin_tokens.error = e instanceof Error ? e.message : String(e);
  }

  await autoResolveStale(AGENT_NAME, active);

  const totalFindings =
    results.stripe_vs_db.drift +
    results.orphan_stripe_subs.orphans +
    results.instagram_tokens.broken +
    results.linkedin_tokens.broken;

  return NextResponse.json({
    ok: totalFindings === 0,
    total_findings: totalFindings,
    results,
  });
}
