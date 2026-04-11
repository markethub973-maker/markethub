/**
 * Maintenance Agent 2 — Schema Drift Detector
 *
 * Walks the `src/` tree, extracts every `supabase.from("table").select("col1,col2,...")`
 * occurrence, and compares referenced columns against Postgres
 * `information_schema.columns` (via the `public.agent_list_columns()` RPC
 * which returns the full column set for the `public` schema).
 *
 * Any column referenced in code but missing from the DB becomes a high-severity
 * finding. Would have caught these mismatches we hit manually today:
 *   - instagram_connections.access_token (missing — lives on profiles)
 *   - scheduled_posts.content (should be `caption`)
 *   - profiles.engagement_alert_threshold (missing)
 *
 * Auth: Bearer CRON_SECRET.
 *
 * Known limitations:
 *   - Only finds literal string selects. Dynamic selects
 *     (`supabase.from(tbl).select(cols)` where cols is a variable) are skipped.
 *   - Doesn't inspect .insert() / .update() payloads — agent 3 (consistency)
 *     will catch those at runtime.
 *   - PostgREST-embedded resource syntax `col, related_table(col1, col2)` is
 *     split on the outer comma only; nested columns are attributed to the
 *     inner table name when possible.
 */
import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cronAuth";
import { reportFinding, autoResolveStale } from "@/lib/maintenanceAgent";
import { createServiceClient } from "@/lib/supabase/service";
import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const AGENT_NAME = "schema-drift";
const SRC_ROOT = join(process.cwd(), "src");

// Matches `.from("table")` followed by `.select("...")` on the SAME chain.
//
// Naive non-greedy `[\s\S]*?` is wrong: if a `.from(X).update(...)` chain
// (no .select) is followed later by an unrelated `.from(Y).select(...)`,
// the regex pairs the wrong table with the wrong columns. We saw this
// firsthand on first run: 5 false-positive findings on profiles where
// the columns actually live on plan_limits, because checkPlanLimits.ts
// has a `.from("profiles").update(...)` between the two tables.
//
// Fix: the gap between `.from(` and `.select(` MUST NOT contain another
// `.from(`, `.update(`, `.insert(`, `.upsert(`, or `.delete(`. Any of
// those tokens means the chain broke and we're now in a different
// statement. Implemented with a tempered greedy token (negative lookahead
// at every character).
const FROM_SELECT_RE =
  /\.from\(\s*["'`]([a-zA-Z0-9_]+)["'`]\s*\)((?:(?!\.from\(|\.update\(|\.insert\(|\.upsert\(|\.delete\()[\s\S])*?)\.select\(\s*["'`]([^"'`]+)["'`]/g;

// Columns to ignore — these are PostgREST / Supabase conventions, not real DB
// columns, so we skip them during comparison.
const IGNORED_TOKENS = new Set(["*", "count"]);

// Table synonyms: some code calls a view that rewrites to a base table, so we
// count a column as present if it exists in either.
const TABLE_ALIASES: Record<string, string[]> = {};

interface Reference {
  table: string;
  column: string;
  file: string;
}

function walkDir(dir: string, out: string[] = []): string[] {
  let entries: string[] = [];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    if (name === "node_modules" || name === ".next" || name.startsWith(".")) continue;
    const full = join(dir, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      walkDir(full, out);
    } else if (name.endsWith(".ts") || name.endsWith(".tsx")) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Parse a Supabase select string into a flat list of (table, column) pairs.
 * Supports:
 *   "id, name, email"                                    → 3 cols on main table
 *   "id, related_table(id, name)"                        → id on main, id+name on related
 *   "id, alias:related_table!inner(field1, field2)"      → fields on related_table
 */
function parseSelectString(raw: string, mainTable: string): { table: string; column: string }[] {
  const out: { table: string; column: string }[] = [];

  // Tokenize top-level by comma, respecting nested parens.
  const tokens: string[] = [];
  let depth = 0;
  let buf = "";
  for (const ch of raw) {
    if (ch === "(") {
      depth++;
      buf += ch;
    } else if (ch === ")") {
      depth--;
      buf += ch;
    } else if (ch === "," && depth === 0) {
      if (buf.trim()) tokens.push(buf.trim());
      buf = "";
    } else {
      buf += ch;
    }
  }
  if (buf.trim()) tokens.push(buf.trim());

  for (const token of tokens) {
    // Embedded resource: "[alias:]table[!inner|!left](inner_selects)"
    const embed = token.match(/^(?:[\w]+:)?([\w]+)(?:!\w+)?\s*\(([\s\S]+)\)$/);
    if (embed) {
      const innerTable = embed[1];
      const inner = parseSelectString(embed[2], innerTable);
      out.push(...inner);
      continue;
    }

    // Plain column or alias. Handles "id", "alias:id", "id::text".
    let col = token;
    if (col.includes(":")) col = col.split(":").pop()!; // strip alias prefix
    if (col.includes("::")) col = col.split("::")[0]; // strip cast
    col = col.trim();
    // Strip trailing operators like `->>key` (JSONB extract)
    col = col.replace(/(->>|->)[\s\S]*$/, "").trim();
    if (!col || IGNORED_TOKENS.has(col)) continue;
    // Skip function-like or bracket expressions
    if (col.includes("(") || col.includes(")") || col.includes(" ")) continue;
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(col)) continue;
    out.push({ table: mainTable, column: col });
  }

  return out;
}

function extractReferencesFromFile(file: string, rel: string): Reference[] {
  let text: string;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    return [];
  }
  const refs: Reference[] = [];
  FROM_SELECT_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = FROM_SELECT_RE.exec(text)) !== null) {
    const table = m[1];
    // Capture group 2 is the (intentionally discarded) gap between
    // .from(...) and .select(...). Group 3 is the column list.
    const selectStr = m[3];
    const parsed = parseSelectString(selectStr, table);
    for (const p of parsed) refs.push({ ...p, file: rel });
  }
  return refs;
}

interface ColumnRow {
  table_name: string;
  column_name: string;
  data_type: string;
}

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req, "/api/maint/schema-drift")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1. Fetch actual column map from DB
  const supa = createServiceClient();
  const { data: columns, error } = await supa.rpc("agent_list_columns");
  if (error || !columns) {
    return NextResponse.json(
      { error: "Failed to fetch column map", details: error?.message },
      { status: 500 },
    );
  }

  const dbColumns = new Map<string, Set<string>>();
  for (const row of columns as ColumnRow[]) {
    if (!dbColumns.has(row.table_name)) dbColumns.set(row.table_name, new Set());
    dbColumns.get(row.table_name)!.add(row.column_name);
  }

  // 2. Walk src/ and collect all (table, column, file) references
  const files = walkDir(SRC_ROOT);
  const allRefs: Reference[] = [];
  for (const file of files) {
    const rel = file.replace(process.cwd() + "/", "");
    allRefs.push(...extractReferencesFromFile(file, rel));
  }

  // 3. Diff: find columns in code that don't exist in DB
  const activeFingerprints = new Set<string>();
  const missingMap = new Map<string, { table: string; column: string; files: Set<string> }>();
  let totalRefs = 0;
  let skippedUnknownTables = 0;

  for (const ref of allRefs) {
    totalRefs++;
    // Check both the table itself and any aliases
    const candidates = [ref.table, ...(TABLE_ALIASES[ref.table] ?? [])];
    let found = false;
    let tableKnown = false;
    for (const t of candidates) {
      const set = dbColumns.get(t);
      if (set) {
        tableKnown = true;
        if (set.has(ref.column)) {
          found = true;
          break;
        }
      }
    }
    if (!tableKnown) {
      // Unknown table — probably a view, rpc target, or typo. Skip for now;
      // we don't want false positives on non-public schemas. Could be a future
      // agent (orphan table reference detector).
      skippedUnknownTables++;
      continue;
    }
    if (found) continue;
    const key = `${ref.table}.${ref.column}`;
    if (!missingMap.has(key)) {
      missingMap.set(key, { table: ref.table, column: ref.column, files: new Set() });
    }
    missingMap.get(key)!.files.add(ref.file);
  }

  // 4. Report findings
  for (const [key, info] of missingMap) {
    const fp = `schema-drift:${key}`;
    activeFingerprints.add(fp);
    const fileList = [...info.files].sort().slice(0, 5);
    await reportFinding({
      agent: AGENT_NAME,
      severity: "high",
      fingerprint: fp,
      title: `Column missing in DB: ${info.table}.${info.column}`,
      details: {
        table: info.table,
        column: info.column,
        referenced_in: fileList,
        total_files: info.files.size,
      },
      fix_suggestion: `Either:\n  1. Add column via migration: ALTER TABLE ${info.table} ADD COLUMN ${info.column} <type>;\n  2. Or remove the reference from: ${fileList.join(", ")}`,
    });
  }

  await autoResolveStale(AGENT_NAME, activeFingerprints);

  return NextResponse.json({
    ok: missingMap.size === 0,
    scanned_files: files.length,
    total_references: totalRefs,
    skipped_unknown_tables: skippedUnknownTables,
    missing_columns: missingMap.size,
    findings: [...missingMap.values()].map((info) => ({
      table: info.table,
      column: info.column,
      files: [...info.files],
    })),
  });
}
