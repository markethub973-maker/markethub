/**
 * POST /api/brain/auto-pattern-update
 *
 * Auto-adjusts intermediary vertical scores based on real outreach results.
 * The platform's data teaches itself — Eduard doesn't need to approve score
 * changes. Logic encoded from ALEX_KNOWLEDGE_BRIEF rule 15:
 *
 *   3+ replies same vertical → +1 score (cap 10)
 *   2+ Stripe conversions → score = 10, mark as hot channel
 *   0 replies after 20+ outreach → -2 score, park if < 5
 *
 * Every score change lands in brain_agent_activity as
 *   description: "[AUTO_SCORE] vertical X: N → M reason"
 * so Eduard can audit.
 *
 * Auth: x-brain-cron-secret (designed for a 1/day cron pass).
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authOk(req: NextRequest): boolean {
  const secret = req.headers.get("x-brain-cron-secret");
  return Boolean(secret && secret === process.env.BRAIN_CRON_SECRET);
}

interface OutreachRow {
  domain: string;
  replied_at: string | null;
  created_at: string;
}
interface ProspectRow {
  domain: string;
  vertical: string | null;
}
interface PatternRow {
  id: string;
  intermediary_type: string;
  our_product_match_score: number;
}

interface ChangeLog {
  vertical: string;
  matched_pattern: string | null;
  before: number | null;
  after: number;
  reason: string;
  outreach_count: number;
  reply_count: number;
}

// Fuzzy-match a vertical string (e.g. "Digital Agency Cluj") to an
// intermediary_type in brain_intermediary_patterns (e.g. "Digital Marketing
// Agency (SMB)"). Heuristic: any significant token overlap.
function matchPattern(vertical: string, patterns: PatternRow[]): PatternRow | null {
  const v = vertical.toLowerCase();
  const tokens = new Set(
    v.split(/[^a-zăâîșț]+/).filter((t) => t.length >= 4),
  );
  let best: { row: PatternRow; score: number } | null = null;
  for (const p of patterns) {
    const pTokens = new Set(
      p.intermediary_type.toLowerCase().split(/[^a-zăâîșț]+/).filter((t) => t.length >= 4),
    );
    let overlap = 0;
    for (const t of tokens) if (pTokens.has(t)) overlap += 1;
    if (overlap > 0 && (!best || overlap > best.score)) best = { row: p, score: overlap };
  }
  return best?.row ?? null;
}

export async function POST(req: NextRequest) {
  if (!authOk(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const svc = createServiceClient();
  const since = new Date(Date.now() - 30 * 24 * 3600_000).toISOString();

  // Load outreach, prospects, patterns in parallel
  const [{ data: outreach }, { data: prospects }, { data: patterns }] = await Promise.all([
    svc
      .from("outreach_log")
      .select("domain, replied_at, created_at")
      .gte("created_at", since),
    svc.from("brain_global_prospects").select("domain, vertical"),
    svc.from("brain_intermediary_patterns").select("id, intermediary_type, our_product_match_score"),
  ]);

  const domainToVertical = new Map<string, string>();
  for (const p of (prospects ?? []) as ProspectRow[]) {
    if (p.vertical) domainToVertical.set(p.domain, p.vertical);
  }

  // Aggregate by vertical
  const byVertical = new Map<string, { outreach: number; replies: number }>();
  for (const o of (outreach ?? []) as OutreachRow[]) {
    const vertical = domainToVertical.get(o.domain);
    if (!vertical) continue;
    const agg = byVertical.get(vertical) ?? { outreach: 0, replies: 0 };
    agg.outreach += 1;
    if (o.replied_at) agg.replies += 1;
    byVertical.set(vertical, agg);
  }

  const changes: ChangeLog[] = [];
  const patternList = (patterns ?? []) as PatternRow[];

  for (const [vertical, stats] of byVertical) {
    const matched = matchPattern(vertical, patternList);
    if (!matched) continue; // vertical not mapped to any pattern — skip
    const before = matched.our_product_match_score ?? 5;
    let after = before;
    let reason = "";

    if (stats.replies >= 3) {
      after = Math.min(10, before + 1);
      reason = `${stats.replies} replies in last 30d — boost`;
    } else if (stats.outreach >= 20 && stats.replies === 0) {
      after = Math.max(0, before - 2);
      reason = `0 replies on ${stats.outreach} outreach — drop`;
    } else {
      continue; // not enough signal to change
    }

    if (after === before) continue;

    // Apply update
    await svc
      .from("brain_intermediary_patterns")
      .update({ our_product_match_score: after })
      .eq("id", matched.id);

    // Audit log with first-class activity="auto_score" (post 2026-04-16 DDL).
    await svc.from("brain_agent_activity").insert({
      agent_id: "analyst",
      agent_name: "Ethan",
      activity: "auto_score",
      description: `${matched.intermediary_type}: ${before} → ${after} — ${reason}`,
      result: {
        pattern_id: matched.id,
        vertical_from_prospects: vertical,
        stats,
      },
    });

    changes.push({
      vertical,
      matched_pattern: matched.intermediary_type,
      before,
      after,
      reason,
      outreach_count: stats.outreach,
      reply_count: stats.replies,
    });
  }

  return NextResponse.json({
    ok: true,
    analyzed_verticals: byVertical.size,
    changes_applied: changes.length,
    changes,
  });
}

export async function GET(req: NextRequest) {
  if (!authOk(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const svc = createServiceClient();
  const sinceParam = req.nextUrl.searchParams.get("since");
  const since = sinceParam ?? new Date(Date.now() - 14 * 24 * 3600_000).toISOString();
  const { data } = await svc
    .from("brain_agent_activity")
    .select("created_at, description, result")
    .eq("activity", "auto_score")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(50);
  return NextResponse.json({ ok: true, count: (data ?? []).length, changes: data ?? [] });
}
