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
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const HAIKU = "claude-haiku-4-5-20251001";

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

  // Run all reads in parallel
  const [profiles, posts, leads, images, brandVoice] = await Promise.all([
    service.from("profiles").select("plan,subscription_plan,trial_ends_at,created_at"),
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
  const paying = profs.filter((p) => {
    const plan = (p.plan ?? p.subscription_plan ?? "") as string;
    return ["pro", "studio", "agency", "business", "enterprise", "creator"].includes(plan);
  });
  const trials = profs.filter((p) => {
    const t = p.trial_ends_at ? new Date(p.trial_ends_at).getTime() : 0;
    return t > now;
  });
  const signups7 = profs.filter(
    (p) => p.created_at && now - new Date(p.created_at).getTime() < 7 * day,
  );

  // Plan pricing snapshot — quick MRR estimate
  const PLAN_PRICE: Record<string, number> = {
    creator: 24, pro: 49, studio: 99, business: 99, agency: 249, enterprise: 249,
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
    operatorId = process.env.BRAIN_OPERATOR_USER_ID ?? null;
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

  const apiKey = process.env.ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_API_KEY_APP;
  if (!apiKey) {
    return NextResponse.json({ error: "AI not configured" }, { status: 500 });
  }

  const service = createServiceClient();
  const state = await readState(operatorId);

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

  try {
    const anthropic = new Anthropic({ apiKey });
    const r = await anthropic.messages.create({
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
    });
    const text = r.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("");
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("No JSON in response");
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
    return NextResponse.json({
      ok: true,
      generated_at: new Date().toISOString(),
      state,
      summary_headline: parsed.summary_headline ?? "",
      recommendations: (parsed.recommendations ?? []).slice(0, 5),
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed", state }, { status: 500 });
  }
}
