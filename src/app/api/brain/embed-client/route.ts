/**
 * POST /api/brain/embed-client — generate / refresh a client's profile embedding.
 *
 * Pulls the client's public signals (plan, brand voice, content strategy,
 * goals, recent post topics) into a single profile text, embeds it with
 * OpenAI, stores in brain_knowledge_base with category="client_need" and
 * tag `user:${user_id}` for retrieval.
 *
 * Once enough clients exist (~20+), this enables:
 *   - similar-client clustering for content / playbook recommendations
 *   - "clients who like X also like Y" on the dashboard
 *   - warmer onboarding ("we've seen 3 clients in your niche succeed with...")
 *
 * Can be called:
 *   - After signup (from the onboarding finisher)
 *   - After user_brand_voice is set / updated
 *   - After content_strategy is set / updated
 *   - Once a week via cron (batch refresh)
 *
 * Body: { user_id: string } OR { scan_all?: boolean, limit?: number }
 *
 * Auth: x-brain-cron-secret OR admin cookie.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { embedBatch } from "@/lib/embed";

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
  name: string | null;
  plan: string | null;
  subscription_plan: string | null;
  created_at: string;
}
interface BrandVoiceRow {
  tone: string | null;
  strategy: unknown;
  goals: unknown;
}
interface PostRow {
  caption: string | null;
  status: string | null;
}

async function buildProfileText(userId: string): Promise<string | null> {
  const svc = createServiceClient();
  const [profileRes, brandRes, postsRes, leadsRes] = await Promise.all([
    svc.from("profiles").select("id,name,plan,subscription_plan,created_at").eq("id", userId).maybeSingle(),
    svc.from("user_brand_voice").select("tone,strategy,goals").eq("user_id", userId).maybeSingle(),
    svc.from("scheduled_posts").select("caption,status").eq("user_id", userId).order("created_at", { ascending: false }).limit(15),
    svc.from("research_leads").select("id", { count: "exact", head: true }).eq("user_id", userId),
  ]);
  const profile = profileRes.data;
  const brand = brandRes.data;
  const posts = postsRes.data;
  const leads = { count: leadsRes.count ?? 0 };

  if (!profile) return null;
  const p = profile as ProfileRow;
  const b = (brand ?? null) as BrandVoiceRow | null;

  const plan = p.plan ?? p.subscription_plan ?? "unknown";
  const captions = ((posts ?? []) as PostRow[])
    .map((x) => (x.caption ?? "").slice(0, 200))
    .filter(Boolean)
    .slice(0, 10)
    .join(" || ");
  const strategyJson = b?.strategy ? JSON.stringify(b.strategy).slice(0, 800) : "";
  const goalsJson = b?.goals ? JSON.stringify(b.goals).slice(0, 400) : "";

  const text = [
    `Client ${p.name ?? p.id.slice(0, 8)} on ${plan} plan since ${p.created_at?.slice(0, 10)}`,
    b?.tone ? `Brand voice tone: ${b.tone}` : "",
    strategyJson ? `Content strategy: ${strategyJson}` : "",
    goalsJson ? `Goals: ${goalsJson}` : "",
    captions ? `Recent post topics: ${captions}` : "",
    leads?.count ? `Research leads collected: ${leads.count}` : "",
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, 8000);

  return text;
}

async function embedAndStore(userId: string): Promise<{
  ok: boolean;
  kb_id?: string;
  signals?: number;
  error?: string;
}> {
  const text = await buildProfileText(userId);
  if (!text) return { ok: false, error: "user not found or no signals yet" };

  const signalCount = text.split("\n").length;
  const [embedding] = await embedBatch([text]);
  if (!embedding) return { ok: false, error: "embedding failed" };

  const svc = createServiceClient();

  // Upsert by user tag — one embedding row per client
  const { data: existing } = await svc
    .from("brain_knowledge_base")
    .select("id")
    .eq("category", "client_need")
    .contains("tags", [`user:${userId}`])
    .maybeSingle();

  if (existing) {
    const { error } = await svc
      .from("brain_knowledge_base")
      .update({
        name: `Client profile · ${userId.slice(0, 8)}`,
        summary: text.slice(0, 300),
        content: { profile_text: text, signals: signalCount, last_embedded_at: new Date().toISOString() },
        embedding,
        confidence: Math.min(1, 0.4 + signalCount * 0.08),
      })
      .eq("id", existing.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true, kb_id: existing.id as string, signals: signalCount };
  }

  const { data: inserted, error } = await svc
    .from("brain_knowledge_base")
    .insert({
      category: "client_need",
      name: `Client profile · ${userId.slice(0, 8)}`,
      summary: text.slice(0, 300),
      content: { profile_text: text, signals: signalCount, last_embedded_at: new Date().toISOString() },
      embedding,
      tags: ["client_embedding", `user:${userId}`],
      source: "embed-client endpoint",
      confidence: Math.min(1, 0.4 + signalCount * 0.08),
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, kb_id: inserted?.id as string, signals: signalCount };
}

export async function POST(req: NextRequest) {
  if (!authOk(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as {
    user_id?: string;
    scan_all?: boolean;
    limit?: number;
  };

  if (body.user_id) {
    const result = await embedAndStore(body.user_id);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  }

  if (body.scan_all) {
    const svc = createServiceClient();
    const { data: profiles } = await svc
      .from("profiles")
      .select("id")
      .order("created_at", { ascending: false })
      .limit(Math.min(body.limit ?? 50, 200));

    const results: Array<{ user_id: string; ok: boolean; signals?: number; error?: string }> = [];
    for (const p of (profiles ?? []) as { id: string }[]) {
      const r = await embedAndStore(p.id);
      results.push({ user_id: p.id, ...r });
    }
    return NextResponse.json({
      ok: true,
      processed: results.length,
      embedded: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
      sample: results.slice(0, 3),
    });
  }

  return NextResponse.json({ error: "user_id or scan_all required" }, { status: 400 });
}
