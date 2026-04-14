/**
 * GET/POST /api/brain/goals — persistent business goals that CEO Brain
 * uses as extra context when generating recommendations.
 *
 * Stored in user_brand_voice.goals (JSONB column). Graceful fallback
 * if the column doesn't exist yet — returns null with migration_pending.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export interface BrainGoals {
  target_mrr_usd: number | null;
  target_deadline: string | null;          // ISO date
  primary_audience: string | null;         // ICP one-liner
  revenue_sources: string[];               // ["SaaS", "Affiliate", "Consulting"]
  constraints: string | null;              // e.g. "No paid ads until $10k MRR"
  notes: string | null;
}

const DEFAULT_GOALS: BrainGoals = {
  target_mrr_usd: null,
  target_deadline: null,
  primary_audience: null,
  revenue_sources: [],
  constraints: null,
  notes: null,
};

export async function GET() {
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supa
    .from("user_brand_voice")
    .select("goals")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    if (error.code === "42703") {
      return NextResponse.json({ ok: true, goals: DEFAULT_GOALS, migration_pending: true });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({
    ok: true,
    goals: (data?.goals as BrainGoals | null) ?? DEFAULT_GOALS,
  });
}

export async function POST(req: NextRequest) {
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as Partial<BrainGoals> | null;

  const goals: BrainGoals = {
    target_mrr_usd: typeof body?.target_mrr_usd === "number" ? body.target_mrr_usd : null,
    target_deadline: body?.target_deadline || null,
    primary_audience: body?.primary_audience?.trim().slice(0, 400) || null,
    revenue_sources: Array.isArray(body?.revenue_sources)
      ? body.revenue_sources.map((s) => String(s).trim()).filter(Boolean).slice(0, 8)
      : [],
    constraints: body?.constraints?.trim().slice(0, 500) || null,
    notes: body?.notes?.trim().slice(0, 800) || null,
  };

  const { error } = await supa
    .from("user_brand_voice")
    .upsert({ user_id: user.id, goals }, { onConflict: "user_id" });

  if (error) {
    if (error.code === "42703") {
      return NextResponse.json(
        { error: "Migration pending — add goals JSONB column to user_brand_voice", migration_pending: true },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, goals });
}
