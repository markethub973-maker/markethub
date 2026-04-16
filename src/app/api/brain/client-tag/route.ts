/**
 * POST /api/brain/client-tag — compute explicit need tags for clients.
 *
 * Reads each client's profile + brand voice + post cadence signals and
 * assigns explicit tags (beside the embedding) so Sofia / Vera can filter
 * segments without running similarity queries. Rules-based, deterministic,
 * cheap — no LLM call.
 *
 * Tags written to the `tags` array on the client's brain_knowledge_base
 * row (category=client_need). Eduard / agents can query:
 *   SELECT * FROM brain_knowledge_base
 *   WHERE category='client_need' AND 'high_trial_risk' = ANY(tags)
 *
 * Body: { user_id?: string } OR { scan_all?: boolean, limit?: number }
 * Auth: x-brain-cron-secret OR admin cookie.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

function authOk(req: NextRequest): boolean {
  const cookieOk = req.cookies.get("brain_admin")?.value === "1";
  const cronOk =
    req.headers.get("x-brain-cron-secret") &&
    req.headers.get("x-brain-cron-secret") === process.env.BRAIN_CRON_SECRET;
  return Boolean(cookieOk || cronOk);
}

interface ProfileRow {
  id: string;
  plan: string | null;
  subscription_plan: string | null;
  created_at: string;
}
interface BrandRow {
  tone: string | null;
  strategy: unknown;
  goals: unknown;
}
interface PostRow {
  status: string | null;
  created_at: string;
}

const PAID_PLANS = new Set(["pro", "studio", "agency", "business", "enterprise", "creator"]);
const DAY_MS = 24 * 3600_000;

function computeTags(profile: ProfileRow, brand: BrandRow | null, posts: PostRow[]): string[] {
  const tags: string[] = [];
  const now = Date.now();
  const plan = (profile.plan ?? profile.subscription_plan ?? "free").toLowerCase();
  const isPaid = PAID_PLANS.has(plan);
  const createdMs = new Date(profile.created_at).getTime();
  const ageDays = (now - createdMs) / DAY_MS;

  // Plan band
  if (isPaid) tags.push("paid");
  else tags.push("free");
  tags.push(`plan:${plan}`);

  // Lifecycle
  if (ageDays < 7) tags.push("new_signup");
  if (ageDays > 60 && !isPaid) tags.push("long_free_user");

  // Trial signals — column trial_ends_at doesn't exist on profiles; trial
  // info is tracked elsewhere (stripe_subscription_id + Stripe data). For
  // now, infer trial risk from plan:free + age_days 1-14 only.
  if (!isPaid && ageDays > 1 && ageDays < 14) tags.push("early_free_no_trial_convert");

  // Setup signals
  if (!brand?.tone) tags.push("needs_brand_voice");
  if (!brand?.strategy) tags.push("needs_content_strategy");
  if (!brand?.goals) tags.push("needs_goals_set");

  // Content cadence (last 30 days)
  const cutoff30 = now - 30 * DAY_MS;
  const posts30 = posts.filter((p) => p.created_at && new Date(p.created_at).getTime() > cutoff30);
  const published30 = posts30.filter((p) => p.status === "published").length;
  const scheduled = posts.filter((p) => p.status === "scheduled").length;

  if (posts30.length === 0 && ageDays > 14) tags.push("dormant");
  if (published30 >= 10) tags.push("power_user");
  if (published30 >= 1 && published30 < 5) tags.push("light_user");
  if (scheduled >= 10) tags.push("pipeline_full");
  if (scheduled === 0 && ageDays > 7) tags.push("no_scheduled");

  // Upgrade candidates — free user producing content = willing to pay
  if (!isPaid && published30 >= 5) tags.push("upgrade_candidate");

  // Retention risk — paid user going dormant
  if (isPaid && posts30.length === 0 && ageDays > 30) tags.push("churn_risk");

  return Array.from(new Set(tags));
}

async function processOne(svc: ReturnType<typeof createServiceClient>, userId: string): Promise<{
  ok: boolean;
  user_id: string;
  tags?: string[];
  kb_id?: string;
  error?: string;
}> {
  const [profileRes, brandRes, postsRes] = await Promise.all([
    svc.from("profiles").select("id,plan,subscription_plan,created_at").eq("id", userId).maybeSingle(),
    svc.from("user_brand_voice").select("tone,strategy,goals").eq("user_id", userId).maybeSingle(),
    svc.from("scheduled_posts").select("status,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
  ]);
  const profile = profileRes.data as ProfileRow | null;
  if (!profile) {
    return {
      ok: false,
      user_id: userId,
      error: `profile not found (db error: ${profileRes.error?.message ?? "no error"})`,
    };
  }
  const brand = brandRes.data as BrandRow | null;
  const posts = (postsRes.data ?? []) as PostRow[];

  const tags = computeTags(profile, brand, posts);

  // Find the existing client_need row for this user
  const { data: existing } = await svc
    .from("brain_knowledge_base")
    .select("id, tags")
    .eq("category", "client_need")
    .contains("tags", [`user:${userId}`])
    .maybeSingle();

  if (!existing) {
    // No client_need row yet — embed-client must be run first
    return { ok: false, user_id: userId, error: "no client_need row — run embed-client first" };
  }

  // Merge: keep user:<id> + client_embedding tags, replace the computed ones
  const preserved = ((existing.tags as string[] | null) ?? []).filter(
    (t) => t === "client_embedding" || t.startsWith("user:"),
  );
  const newTags = Array.from(new Set([...preserved, ...tags]));

  const { error } = await svc
    .from("brain_knowledge_base")
    .update({ tags: newTags })
    .eq("id", existing.id);

  if (error) return { ok: false, user_id: userId, error: error.message };
  return { ok: true, user_id: userId, tags, kb_id: existing.id as string };
}

export async function POST(req: NextRequest) {
  if (!authOk(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as {
    user_id?: string;
    scan_all?: boolean;
    limit?: number;
  };
  const svc = createServiceClient();

  if (body.user_id) {
    const r = await processOne(svc, body.user_id);
    return NextResponse.json(r, { status: r.ok ? 200 : 400 });
  }

  if (body.scan_all) {
    const { data: rows } = await svc
      .from("brain_knowledge_base")
      .select("tags")
      .eq("category", "client_need")
      .limit(Math.min(body.limit ?? 50, 200));

    const userIds = new Set<string>();
    for (const r of (rows ?? []) as { tags: string[] | null }[]) {
      for (const t of r.tags ?? []) {
        if (t.startsWith("user:")) userIds.add(t.slice(5));
      }
    }

    const results: Array<{ ok: boolean; user_id: string; tags?: string[]; error?: string }> = [];
    for (const uid of userIds) {
      results.push(await processOne(svc, uid));
    }

    // Tag distribution summary
    const distribution: Record<string, number> = {};
    for (const r of results) {
      for (const t of r.tags ?? []) distribution[t] = (distribution[t] ?? 0) + 1;
    }

    return NextResponse.json({
      ok: true,
      processed: results.length,
      tagged: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
      distribution: Object.fromEntries(
        Object.entries(distribution).sort(([, a], [, b]) => b - a),
      ),
      sample: results.slice(0, 5),
    });
  }

  return NextResponse.json({ error: "user_id or scan_all required" }, { status: 400 });
}

// GET: return currently tagged clients matching a tag
export async function GET(req: NextRequest) {
  if (!authOk(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tag = req.nextUrl.searchParams.get("tag");
  const svc = createServiceClient();

  if (tag) {
    const { data } = await svc
      .from("brain_knowledge_base")
      .select("id, name, summary, tags")
      .eq("category", "client_need")
      .contains("tags", [tag])
      .limit(100);
    return NextResponse.json({ ok: true, tag, count: (data ?? []).length, clients: data ?? [] });
  }

  // Return overall tag distribution
  const { data } = await svc
    .from("brain_knowledge_base")
    .select("tags")
    .eq("category", "client_need")
    .limit(500);
  const distribution: Record<string, number> = {};
  for (const r of (data ?? []) as { tags: string[] | null }[]) {
    for (const t of r.tags ?? []) {
      if (t.startsWith("user:") || t === "client_embedding") continue;
      distribution[t] = (distribution[t] ?? 0) + 1;
    }
  }
  return NextResponse.json({
    ok: true,
    total_clients: (data ?? []).length,
    distribution: Object.fromEntries(
      Object.entries(distribution).sort(([, a], [, b]) => b - a),
    ),
  });
}
