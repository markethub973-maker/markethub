/**
 * GET/POST /api/brand/strategy — Content Strategy Profile
 *
 * Stored as a JSONB column `strategy` on user_brand_voice. Migration:
 * supabase-migrations/20260414_content_strategy.sql must be applied
 * before writes succeed; the GET endpoint handles the pre-migration
 * case gracefully by returning null.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface Strategy {
  icp: string | null;
  values: string[];
  topic_clusters: string[];
  north_star: string | null;
}

export async function GET() {
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supa
    .from("user_brand_voice")
    .select("strategy")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    // Column missing (pre-migration) → return empty strategy so UI works.
    if (error.code === "42703") {
      return NextResponse.json({ ok: true, strategy: null, migration_pending: true });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    strategy: (data?.strategy as Strategy | null) ?? null,
  });
}

export async function POST(req: NextRequest) {
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    icp?: string;
    values?: string[];
    topic_clusters?: string[];
    north_star?: string;
  } | null;

  const strategy: Strategy = {
    icp: body?.icp?.trim().slice(0, 600) || null,
    values: Array.isArray(body?.values)
      ? body.values.map((v) => String(v).trim()).filter(Boolean).slice(0, 5)
      : [],
    topic_clusters: Array.isArray(body?.topic_clusters)
      ? body.topic_clusters.map((v) => String(v).trim()).filter(Boolean).slice(0, 8)
      : [],
    north_star: body?.north_star?.trim().slice(0, 300) || null,
  };

  // Upsert by user_id. If the row doesn't exist yet (no brand voice
  // configured), create a minimal row holding just the strategy.
  const { error } = await supa
    .from("user_brand_voice")
    .upsert(
      { user_id: user.id, strategy },
      { onConflict: "user_id" },
    );

  if (error) {
    if (error.code === "42703") {
      return NextResponse.json(
        {
          error: "This feature is being configured. Please try again shortly.",
          migration_pending: true,
        },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, strategy });
}
