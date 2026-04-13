/**
 * Learning DB — search (M5 Sprint 1)
 *
 * GET ?q=...&category=...&platform=... — returns up to 5 matches.
 * Public-ish: authed users only (so we don't leak internal solutions broadly).
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchResolvedIssues } from "@/lib/learningDB";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q") ?? "";
  const category = req.nextUrl.searchParams.get("category") ?? undefined;
  const platform = req.nextUrl.searchParams.get("platform") ?? undefined;
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 5), 20);

  const matches = await searchResolvedIssues(q, { category, platform, limit });
  return NextResponse.json({ ok: true, matches });
}
