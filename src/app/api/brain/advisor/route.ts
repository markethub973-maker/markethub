/**
 * GET /api/brain/advisor — CEO Brain strategy engine
 *
 * Reads the platform's current state (MRR, growth, content backlog,
 * brand voice coverage, lead pipeline), then asks Claude to propose
 * 3-5 concrete next actions the operator (or Brain itself in Phase 3)
 * should take to grow revenue.
 *
 * Each recommendation includes:
 *   - action — short imperative ("Launch an affiliate page for X")
 *   - why — 1-line rationale grounded in the state
 *   - priority — "high" | "medium" | "low"
 *   - tool — the in-app / API endpoint that executes it
 *   - payload — pre-filled JSON for the execute call (operator can tweak)
 *
 * Admin-only. In Phase 3, Brain will call this endpoint itself and
 * auto-execute high-priority recommendations.
 */

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { Redis } from "@upstash/redis";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const HAIKU = "claude-haiku-4-5-20251001";

/**
 * Two-tier cache: Upstash Redis (shared across serverless instances, survives
 * cold starts) + in-memory Map (fallback when Redis is unreachable, keeps the
 * function hot instance fast). Redis is the primary — the Map mirror exists
 * only so a sudden Redis outage doesn't instantly flip every advisor call
 * to full LLM latency.
 *
 * Before this upgrade, the cache was module-only so each new serverless
 * instance paid the full Anthropic latency at least once. With Redis, the
 * first hit across the whole fleet pays, everyone else hits warm cache.
 */
const FULL_TTL_SEC = 5 * 60;
const STATE_ONLY_TTL_SEC = 2 * 60;
const ANTHROPIC_TIMEOUT_MS = 18_000;

type CacheEntry = { data: unknown; expiresAt: number };
const memCache = new Map<string, CacheEntry>();

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

async function cacheGet(key: string): Promise<unknown | null> {
  // Redis first (shared across instances)
  try {
    const r = getRedis();
    if (r) {
      const hit = await r.get(`advisor:${key}`);
      if (hit) return hit;
    }
  } catch { /* fall through to memory */ }
  const e = memCache.get(key);
  if (!e || e.expiresAt < Date.now()) {
    if (e) memCache.delete(key);
    return null;
  }
  return e.data;
}

async function cacheSet(key: string, data: unknown, ttlSec: number) {
  // Set in Redis (don't await failure — best effort) + in memory (always)
  try {
    const r = getRedis();
    if (r) await r.set(`advisor:${key}`, data, { ex: ttlSec });
  } catch { /* best effort */ }
  memCache.set(key, { data, expiresAt: Date.now() + ttlSec * 1000 });
}

interface BrainState {
  total_users: number;
  paying_users: number;
  trial_users: number;
  mrr_usd: number;
  new_signups_7d: number;
  published_posts_30d: number;
  scheduled_posts_next_7d: number;
  leads_total: number;
  leads_new_7d: number;
  ai_assets_30d: number;
  brand_voice_configured: boolean;
  content_strategy_configured: boolean;
  top_feature_used: string | null;
}

async function readState(userId: string): Promise<BrainState> {
  const service = createServiceClient();

  // Run all reads in parallel. NOTE: profiles.trial_ends_at doesn't exist —
  // the column was referenced historically but never added. Selecting it
  // was making the whole profiles query fail silently, zeroing out
  // total_users + paying_users + mrr_usd for every advisor call, which in
  // turn made morning-debate + boardroom think we had 0 paying clients.
  // Removing it un-breaks the aggregate stats. 2026-04-16.
  const [profiles, posts, leads, images, brandVoice] = await Promise.all([
    service.from("profiles").select("plan,subscription_plan,created_at"),
    service
      .from("scheduled_posts")
      .select("status,created_at,scheduled_for")
      .eq("user_id", userId),
    service.from("research_leads").select("id,created_at").eq("user_id", userId),
    service.from("ai_image_generations").select("id,created_at").eq("user_id", userId),
    service.from("user_brand_voice").select("tone,strategy").eq("user_id", userId).maybeSingle(),
  ]);

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  const profs = profiles.data ?? [];
  // ONLY 4 real pricing bands (validated with Eduard 2026-04-16):
  //   Starter = 14d trial (not paid) · Creator $24 · Pro $49 · Studio $99 · Agency $249
  // Legacy DB values (enterprise/business/lite) = test accounts, NOT real MRR.
  // For accurate MRR use /api/brain/stripe-mrr which reads from Stripe API.
  const paying = profs.filter((p) => {
    const plan = (p.plan ?? p.subscription_plan ?? "").toLowerCase();
    return ["creator", "pro", "studio", "agency"].includes(plan);
  });
  // Trial users: profiles.trial_ends_at doesn't exist in this schema, so
  // we can't compute real trial cohort. Proxy: free users signed up
  // in the last 14 days — the typical trial window.
  const trials = profs.filter((p) => {
    const plan = (p.plan ?? p.subscription_plan ?? "") as string;
    if (plan && plan !== "free" && plan !== "free_test") return false;
    if (!p.created_at) return false;
    const ageDays = (now - new Date(p.created_at).getTime()) / day;
    return ageDays >= 0 && ageDays <= 14;
  });
  const signups7 = profs.filter(
    (p) => p.created_at && now - new Date(p.created_at).getTime() < 7 * day,
  );

  // Real prices (USD) from /pricing page, validated 2026-04-16 by Eduard.
  // Stripe account is in RON; USD charges auto-convert on payout (~1-2% fee).
  const PLAN_PRICE: Record<string, number> = {
    starter: 0, // 14-day trial, no MRR contribution
    creator: 24,
    pro: 49,
    studio: 99,
    agency: 249,
  };
  const mrr = paying.reduce((s, p) => {
    const plan = (p.plan ?? p.subscription_plan ?? "") as string;
    return s + (PLAN_PRICE[plan] ?? 0);
  }, 0);

  const pstArr = posts.data ?? [];
  const published30d = pstArr.filter((p) =>
    p.status === "published" && p.created_at && now - new Date(p.created_at).getTime() < 30 * day,
  ).length;
  const scheduledNext7 = pstArr.filter((p) =>
    p.status === "scheduled" && p.scheduled_for &&
    new Date(p.scheduled_for).getTime() - now < 7 * day &&
    new Date(p.scheduled_for).getTime() >= now,
  ).length;

  const leadArr = leads.data ?? [];
  const leads7 = leadArr.filter((l) =>
    l.created_at && now - new Date(l.created_at).getTime() < 7 * day,
  ).length;

  const imgArr = images.data ?? [];
  const assets30 = imgArr.filter((i) =>
    i.created_at && now - new Date(i.created_at).getTime() < 30 * day,
  ).length;

  const bv = brandVoice.data as { tone?: string | null; strategy?: unknown } | null;

  return {
    total_users: profs.length,
    paying_users: paying.length,
    trial_users: trials.length,
    mrr_usd: mrr,
    new_signups_7d: signups7.length,
    published_posts_30d: published30d,
    scheduled_posts_next_7d: scheduledNext7,
    leads_total: leadArr.length,
    leads_new_7d: leads7,
    ai_assets_30d: assets30,
    brand_voice_configured: Boolean(bv?.tone),
    content_strategy_configured: Boolean(bv?.strategy),
    top_feature_used: null,
  };
}

export async function GET(req: NextRequest) {
  // Resolve operator user id: either via cron secret header (n8n / scheduled jobs)
  // or via admin session (in-app /dashboard/admin/brain).
  let operatorId: string | null = null;

  const cronSecret = req.headers.get("x-brain-cron-secret");
  if (cronSecret && process.env.BRAIN_CRON_SECRET && cronSecret === process.env.BRAIN_CRON_SECRET) {
    // Allow override via ?operator=<uuid> so a single cron can loop multiple operators.
    const overrideId = req.nextUrl.searchParams.get("operator");
    operatorId = overrideId ?? process.env.BRAIN_OPERATOR_USER_ID ?? null;
    if (!operatorId) {
      return NextResponse.json({ error: "BRAIN_OPERATOR_USER_ID not set" }, { status: 500 });
    }
  } else {
    const supa = await createClient();
    const { data: { user } } = await supa.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const svc = createServiceClient();
    const { data: profile } = await svc
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();
    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }
    operatorId = user.id;
  }

  // Fast paths (before any heavy work) — honor ?state_only=1 and cache.
  const stateOnly = req.nextUrl.searchParams.get("state_only") === "1";
  const force = req.nextUrl.searchParams.get("force") === "1";
  const cacheKey = `${operatorId}:${stateOnly ? "state" : "full"}`;

  if (!force) {
    const hit = await cacheGet(cacheKey);
    if (hit) {
      return NextResponse.json({ ...(hit as object), cache: "hit" });
    }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_API_KEY_APP;
  if (!stateOnly && !apiKey) {
    return NextResponse.json({ error: "AI not configured" }, { status: 500 });
  }

  const service = createServiceClient();
  const state = await readState(operatorId);

  // state_only path — skip the LLM entirely. Used by the Telegram webhook
  // (after the 4s timeout hardening) and by health probes that just want
  // to verify the endpoint is up + DB reads work.
  if (stateOnly) {
    const payload = {
      ok: true,
      generated_at: new Date().toISOString(),
      state,
      mode: "state_only",
    };
    await cacheSet(cacheKey, payload, STATE_ONLY_TTL_SEC);
    return NextResponse.json({ ...payload, cache: "miss" });
  }

  // Load optional goals — ignore if column/row missing
  let goals: Record<string, unknown> | null = null;
  try {
    const { data: gData } = await service
      .from("user_brand_voice")
      .select("goals")
      .eq("user_id", operatorId)
      .maybeSingle();
    goals = (gData?.goals as Record<string, unknown> | undefined) ?? null;
  } catch { /* column missing, skip */ }

  const system = `You are CEO Brain — a strategic advisor for a bootstrapped SaaS business (MarketHub Pro).

Given the current state of the platform + the operator's own content/lead pipeline, produce 3-5 concrete NEXT ACTIONS to grow revenue. Actions must be specific, not generic. Ground each one in a number from the state. Prefer actions the platform can execute via its own tools (Campaign Auto-Pilot, Brain Product Generator, Lead Finder, Content Calendar, etc.).

Output STRICT JSON:
{
  "recommendations": [
    {
      "action": "Imperative sentence — what to do",
      "why": "One line: specific reason tied to a number in the state",
      "priority": "high" | "medium" | "low",
      "tool": "Which in-app tool or API handles this",
      "app_path": "/full/in-app/path",
      "estimated_hours": 0.5,
      "prefill": {
        "query": { "optional_key": "value that Brain can infer from state" },
        "note": "Optional one-line hint shown next to the Execute button"
      }
    }
  ],
  "summary_headline": "One-sentence snapshot of current momentum"
}

The "prefill" object is OPTIONAL but powerful when you can be specific:
  - /studio/campaign  → {"query": {"brief": "This week's brief based on state"}}
  - /studio/repurpose → {"query": {"caption": "..."}}
  - /brand/voice      → {"note": "Paste 5-10 past captions to auto-analyze"}
  - /studio/content-gap → {"note": "Paste 5+ competitor captions + 3 of yours"}
Include prefill ONLY if inferrable. Never fabricate quotes/stats.

Rules:
- If a critical foundation is missing (no brand voice set, no content strategy), make that #1 high-priority.
- If scheduled content is empty (<3 in next 7d), recommend a Campaign Auto-Pilot run.
- If lead count <10, recommend Lead Finder.
- If affiliate/Brain products exist but aren't promoted, recommend a promotion campaign.
- No more than 1 recommendation per tool.
- Be DIRECT. No fluff.`;

  // Hard timeout on the Anthropic call. If it doesn't come back in time,
  // degrade gracefully: return state with no recommendations rather than
  // a 5xx — callers (Telegram webhook, boardroom, ask-agent) can proceed.
  try {
    const anthropic = new Anthropic({ apiKey: apiKey! });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ANTHROPIC_TIMEOUT_MS);
    let text = "";
    try {
      const r = await anthropic.messages.create(
        {
          model: HAIKU,
          max_tokens: 1500,
          system,
          messages: [
            {
              role: "user",
              content: `Platform state (snapshot):\n${JSON.stringify(state, null, 2)}${
                goals ? `\n\nBusiness goals (operator-set, use as strategic compass):\n${JSON.stringify(goals, null, 2)}` : ""
              }`,
            },
          ],
        },
        { signal: controller.signal },
      );
      text = r.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("");
    } finally {
      clearTimeout(timer);
    }

    const m = text.match(/\{[\s\S]*\}/);
    if (!m) {
      // LLM returned junk — still give callers the state
      const payload = {
        ok: true,
        generated_at: new Date().toISOString(),
        state,
        summary_headline: "",
        recommendations: [],
        mode: "state_only_llm_junk",
      };
      await cacheSet(cacheKey, payload, STATE_ONLY_TTL_SEC);
      return NextResponse.json({ ...payload, cache: "miss" });
    }
    const parsed = JSON.parse(m[0]) as {
      recommendations?: Array<{
        action: string;
        why: string;
        priority: "high" | "medium" | "low";
        tool: string;
        prefill?: { query?: Record<string, string>; note?: string };
        app_path: string;
        estimated_hours?: number;
      }>;
      summary_headline?: string;
    };
    const payload = {
      ok: true,
      generated_at: new Date().toISOString(),
      state,
      summary_headline: parsed.summary_headline ?? "",
      recommendations: (parsed.recommendations ?? []).slice(0, 5),
      mode: "full",
    };
    await cacheSet(cacheKey, payload, FULL_TTL_SEC);
    return NextResponse.json({ ...payload, cache: "miss" });
  } catch (e) {
    // AbortError (timeout) or network error → give callers the state anyway
    const errMsg = e instanceof Error ? e.message : "Failed";
    const payload = {
      ok: true,
      generated_at: new Date().toISOString(),
      state,
      summary_headline: "",
      recommendations: [],
      mode: "state_only_llm_error",
      llm_error: errMsg,
    };
    await cacheSet(cacheKey, payload, STATE_ONLY_TTL_SEC);
    return NextResponse.json({ ...payload, cache: "miss" });
  }
}
