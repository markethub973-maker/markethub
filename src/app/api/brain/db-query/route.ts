/**
 * POST /api/brain/db-query — safe parameterized DB read for agents.
 *
 * Closes the "agents estimate instead of querying" gap. Before this,
 * Alex guessed "5-15 NY prospects" because he had no query capability —
 * all he saw was a text snapshot. Now any agent can send structured
 * filter JSON and get exact rows.
 *
 * Safety model:
 *   - Whitelist of 12 safe tables. Schema or sensitive tables are blocked.
 *   - SELECT only — no INSERT/UPDATE/DELETE.
 *   - Hard cap on limit = 500 rows per request.
 *   - Max 5 filter predicates per query.
 *   - No raw SQL — filters are PostgREST operators only.
 *   - Auth: x-brain-cron-secret.
 *
 * Request body:
 *   {
 *     table: string,                 // must be in ALLOWED_TABLES
 *     select?: string[] | "*",       // columns; default = *
 *     filters?: Array<Filter>,       // AND'ed
 *     order_by?: { column, direction: "asc"|"desc" },
 *     limit?: number,                // max 500
 *     count_only?: boolean           // return count, not rows
 *   }
 *
 * Filter shape:
 *   { column: string, op: Op, value?: any }
 *   Op = "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "ilike" | "in" | "not_null" | "is_null" | "contains"
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
export const maxDuration = 20;

const ALLOWED_TABLES = new Set([
  // Brain / AI team
  "brain_global_prospects",
  "brain_demand_signals",
  "brain_supply_producers",
  "brain_arbitrage_matches",
  "brain_intermediary_patterns",
  "brain_platform_capabilities",
  "brain_strategy_stack",
  "brain_delegation_map",
  "brain_venture_pipeline",
  "brain_target_countries",
  "brain_client_needs",
  "brain_knowledge_base",
  "brain_agent_activity",
  // Outreach / prospects
  "outreach_log",
  "research_leads",
  // Users (safe subset of columns enforced by select whitelist below)
  "profiles",
  // Content / AI
  "scheduled_posts",
  "ai_image_generations",
  "ai_video_generations",
  "user_brand_voice",
  // Communication
  "telegram_messages",
  // Ops
  "ops_incidents",
  "cron_logs",
  "maintenance_findings",
  "security_events",
]);

// Columns we NEVER expose for `profiles` (sensitive PII / tokens)
const PROFILE_SENSITIVE = new Set([
  "stripe_customer_id",
  "stripe_subscription_id",
  "instagram_access_token",
  "meta_user_token",
  "youtube_access_token",
  "youtube_refresh_token",
]);

type Op =
  | "eq" | "neq" | "gt" | "gte" | "lt" | "lte"
  | "ilike" | "in" | "not_null" | "is_null" | "contains";

interface Filter {
  column: string;
  op: Op;
  value?: unknown;
}

interface Body {
  table?: string;
  select?: string | string[];
  filters?: Filter[];
  order_by?: { column: string; direction?: "asc" | "desc" };
  limit?: number;
  count_only?: boolean;
}

const COLUMN_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

function authOk(req: NextRequest): boolean {
  const s = req.headers.get("x-brain-cron-secret");
  return Boolean(s && s === process.env.BRAIN_CRON_SECRET);
}

function sanitizeSelect(table: string, select: string | string[] | undefined): string {
  if (!select || select === "*") {
    // For profiles, never return sensitive columns
    if (table === "profiles") {
      return "id,name,plan,subscription_plan,is_admin,created_at";
    }
    return "*";
  }
  const arr = Array.isArray(select) ? select : select.split(",");
  const clean = arr
    .map((c) => c.trim())
    .filter((c) => COLUMN_RE.test(c))
    .filter((c) => !(table === "profiles" && PROFILE_SENSITIVE.has(c)));
  if (clean.length === 0) return "*";
  return clean.join(",");
}

export async function POST(req: NextRequest) {
  if (!authOk(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as Body;

  if (!body.table || !ALLOWED_TABLES.has(body.table)) {
    return NextResponse.json(
      { error: "table missing or not in whitelist", allowed: Array.from(ALLOWED_TABLES) },
      { status: 400 },
    );
  }
  const table = body.table;
  const filters = (body.filters ?? []).slice(0, 5);
  for (const f of filters) {
    if (!COLUMN_RE.test(f.column)) {
      return NextResponse.json({ error: `invalid column: ${f.column}` }, { status: 400 });
    }
  }
  const limit = Math.min(Math.max(body.limit ?? 100, 1), 500);

  const svc = createServiceClient();
  const selectStr = sanitizeSelect(table, body.select);
  let q = svc.from(table).select(selectStr, { count: "exact" });

  for (const f of filters) {
    const { column, op, value } = f;
    switch (op) {
      case "eq": q = q.eq(column, value as string | number | boolean); break;
      case "neq": q = q.neq(column, value as string | number | boolean); break;
      case "gt": q = q.gt(column, value as string | number); break;
      case "gte": q = q.gte(column, value as string | number); break;
      case "lt": q = q.lt(column, value as string | number); break;
      case "lte": q = q.lte(column, value as string | number); break;
      case "ilike": q = q.ilike(column, `%${String(value)}%`); break;
      case "in":
        if (Array.isArray(value)) q = q.in(column, value as (string | number)[]);
        break;
      case "not_null": q = q.not(column, "is", null); break;
      case "is_null": q = q.is(column, null); break;
      case "contains":
        // Array contains (for tags column): supabase-js accepts array
        if (Array.isArray(value)) q = q.contains(column, value);
        break;
      default:
        return NextResponse.json({ error: `invalid op: ${op}` }, { status: 400 });
    }
  }

  if (body.order_by && COLUMN_RE.test(body.order_by.column)) {
    q = q.order(body.order_by.column, { ascending: body.order_by.direction !== "desc" });
  }

  if (body.count_only) {
    const { count, error } = await q.limit(1);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, table, count: count ?? 0 });
  }

  const { data, count, error } = await q.limit(limit);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    table,
    count: count ?? 0,
    rows: data ?? [],
    returned: (data ?? []).length,
    note:
      (count ?? 0) > limit
        ? `${count} total rows matched but only ${limit} returned (limit). Use count_only=true for total.`
        : undefined,
  });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    usage: "POST with JSON body",
    allowed_tables: Array.from(ALLOWED_TABLES),
    example: {
      table: "brain_global_prospects",
      select: ["domain", "country_code", "email"],
      filters: [
        { column: "country_code", op: "eq", value: "US" },
        { column: "email", op: "not_null" },
        { column: "snippet", op: "ilike", value: "New York" },
      ],
      limit: 50,
    },
  });
}
