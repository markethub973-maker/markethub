import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isAdminAuthorized } from "@/lib/adminAuth";

// All tables to include in backups
const BACKUP_TABLES = [
  "profiles",
  "scheduled_posts",
  "publish_log",
  "instagram_connections",
  "tiktok_connections",
  "youtube_connections",
  "assets",
  "user_themes",
  "brain_knowledge_base",
  "brain_agent_activity",
  "brain_global_prospects",
  "outreach_log",
  "outreach_reply_log",
  "alerts",
  "hooks",
  "saved_captions",
  "saved_searches",
  "competitor_snapshots",
  "automation_runs",
  "api_tokens",
  "audit_logs",
  "cron_logs",
  "ops_incidents",
] as const;

/** Paginated fetch — 1000 rows at a time */
async function fetchAllRows(
  supa: ReturnType<typeof createServiceClient>,
  table: string,
): Promise<{ rows: Record<string, unknown>[]; count: number }> {
  const allRows: Record<string, unknown>[] = [];
  let offset = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supa
      .from(table)
      .select("*")
      .range(offset, offset + pageSize - 1)
      .order("created_at", { ascending: true });

    if (error) {
      // Table might not exist — try without ordering
      const { data: d2, error: e2 } = await supa
        .from(table)
        .select("*")
        .range(offset, offset + pageSize - 1);

      if (e2) {
        // Table genuinely doesn't exist or is empty
        return { rows: [], count: 0 };
      }
      if (d2) allRows.push(...(d2 as Record<string, unknown>[]));
      if (!d2 || d2.length < pageSize) break;
    } else {
      if (data) allRows.push(...(data as Record<string, unknown>[]));
      if (!data || data.length < pageSize) break;
    }
    offset += pageSize;
  }

  return { rows: allRows, count: allRows.length };
}

/** GET — List all backups */
export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supa = createServiceClient();

  const { data, error } = await supa
    .from("platform_backups")
    .select("id, name, description, git_tag, git_commit, tables_included, row_counts, total_size_bytes, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ backups: [], error: error.message });
  }

  return NextResponse.json({ backups: data ?? [] });
}

/** POST — Create a new backup */
export async function POST(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const name: string = body.name || `Backup ${new Date().toISOString().slice(0, 16).replace("T", " ")}`;
  const description: string = body.description || "";
  const backupType: string = body.backup_type || "total"; // "total" | "incremental"

  const supa = createServiceClient();

  // For incremental: find last backup to get timestamp cutoff
  let incrementalSince: string | null = null;
  if (backupType === "incremental") {
    const { data: lastBackup } = await supa
      .from("platform_backups")
      .select("created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (lastBackup) {
      incrementalSince = lastBackup.created_at;
    }
  }

  // 1. Get git info
  let gitCommit = "unknown";
  let gitTag = `backup-${Date.now()}`;
  try {
    // In serverless, we can't run git commands — use env or fallback
    gitCommit = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) || "local-dev";
    gitTag = `backup-${new Date().toISOString().slice(0, 10)}-${gitCommit.slice(0, 7)}`;
  } catch {
    // Ignore git errors in serverless
  }

  // 2. Dump tables (total = all rows, incremental = only changed since last backup)
  const tableData: Record<string, Record<string, unknown>[]> = {};
  const rowCounts: Record<string, number> = {};
  const tablesIncluded: string[] = [];

  for (const table of BACKUP_TABLES) {
    if (backupType === "incremental" && incrementalSince) {
      // Incremental: only rows created or updated since last backup
      let query = supa.from(table).select("*");
      // Try updated_at first, fall back to created_at
      const { data: updatedRows } = await query.or(`created_at.gte.${incrementalSince},updated_at.gte.${incrementalSince}`).limit(10000);
      if (updatedRows && updatedRows.length > 0) {
        tableData[table] = updatedRows as Record<string, unknown>[];
        rowCounts[table] = updatedRows.length;
        tablesIncluded.push(table);
      } else {
        // Try only created_at (table might not have updated_at)
        const { data: createdRows } = await supa.from(table).select("*").gte("created_at", incrementalSince).limit(10000);
        tableData[table] = (createdRows || []) as Record<string, unknown>[];
        rowCounts[table] = (createdRows || []).length;
        tablesIncluded.push(table);
      }
    } else {
      // Total: all rows
      const { rows, count } = await fetchAllRows(supa, table);
      tableData[table] = rows;
      rowCounts[table] = count;
      tablesIncluded.push(table);
    }
  }

  // 3. Env var names (NOT values)
  const envVarNames = Object.keys(process.env).filter(
    (k) =>
      k.startsWith("NEXT_PUBLIC_") ||
      k.startsWith("SUPABASE_") ||
      k.startsWith("VERCEL_") ||
      k.startsWith("STRIPE_") ||
      k.startsWith("FAL_") ||
      k.startsWith("OPENAI_") ||
      k.startsWith("ANTHROPIC_") ||
      k.startsWith("SENTRY_") ||
      k === "ADMIN_PASSWORD" ||
      k === "CRON_SECRET",
  );

  // 4. Calculate approximate size
  const backupPayload = {
    tables: tableData,
    env_var_names: envVarNames,
    git: { commit: gitCommit, tag: gitTag },
    backup_type: backupType,
    incremental_since: incrementalSince,
    created_at: new Date().toISOString(),
    platform: "markethubpromo.com",
  };

  const jsonStr = JSON.stringify(backupPayload);
  const totalSizeBytes = new TextEncoder().encode(jsonStr).length;

  // 5. Store in platform_backups
  const { data: inserted, error: insertErr } = await supa
    .from("platform_backups")
    .insert({
      name,
      description,
      git_tag: gitTag,
      git_commit: gitCommit,
      tables_included: tablesIncluded,
      row_counts: rowCounts,
      total_size_bytes: totalSizeBytes,
      backup_data: backupPayload,
    })
    .select("id, name, created_at")
    .single();

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({
    id: inserted.id,
    name: inserted.name,
    created_at: inserted.created_at,
    tables: tablesIncluded.length,
    total_rows: Object.values(rowCounts).reduce((a, b) => a + b, 0),
    size_bytes: totalSizeBytes,
  });
}
