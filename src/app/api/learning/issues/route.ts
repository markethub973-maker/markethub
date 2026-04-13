/**
 * Learning DB — issues CRUD (M5 Sprint 1)
 *
 * GET  — admin list most recent issues (optionally filtered by category)
 * POST — admin create a new resolved issue manually
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { saveResolvedIssue, type ResolvedIssueInput } from "@/lib/learningDB";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return { error: "Unauthorized", status: 401, user: null };
  const { data: profile } = await supa
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.is_admin) return { error: "Forbidden", status: 403, user: null };
  return { error: null, status: 200, user };
}

export async function GET(req: NextRequest) {
  const gate = await requireAdmin();
  if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const category = req.nextUrl.searchParams.get("category") ?? undefined;
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 50), 200);

  const service = createServiceClient();
  let q = service
    .from("resolved_issues")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (category) q = q.eq("category", category);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, issues: data ?? [] });
}

export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const body = (await req.json().catch(() => null)) as Partial<ResolvedIssueInput> | null;
  if (!body?.category || !body.symptom || !body.solution) {
    return NextResponse.json(
      { error: "category, symptom, solution are required" },
      { status: 400 },
    );
  }
  const id = await saveResolvedIssue({
    category: body.category,
    symptom: body.symptom,
    solution: body.solution,
    root_cause: body.root_cause ?? null,
    platform: body.platform ?? null,
    error_code: body.error_code ?? null,
    language: body.language ?? "en",
    source: "manual",
    source_ref: null,
    auto_resolved: false,
    resolution_time_minutes: body.resolution_time_minutes ?? null,
    created_by: gate.user?.id ?? null,
  });
  if (!id) return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  return NextResponse.json({ ok: true, id });
}
