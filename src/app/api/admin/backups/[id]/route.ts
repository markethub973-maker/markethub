import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isAdminAuthorized } from "@/lib/adminAuth";

/** GET — Download backup as JSON (ZIP-like bundle) */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const supa = createServiceClient();

  const { data: backup, error } = await supa
    .from("platform_backups")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !backup) {
    return NextResponse.json({ error: "Backup not found" }, { status: 404 });
  }

  // Return the full backup data as a downloadable JSON file
  const exportData = {
    _meta: {
      backup_id: backup.id,
      name: backup.name,
      description: backup.description,
      git_tag: backup.git_tag,
      git_commit: backup.git_commit,
      tables_included: backup.tables_included,
      row_counts: backup.row_counts,
      total_size_bytes: backup.total_size_bytes,
      created_at: backup.created_at,
    },
    ...(backup.backup_data as Record<string, unknown>),
  };

  const json = JSON.stringify(exportData, null, 2);
  const filename = `backup-${backup.name.replace(/[^a-zA-Z0-9_-]/g, "_")}-${backup.created_at.slice(0, 10)}.json`;

  return new Response(json, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

/** DELETE — Remove a backup */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const supa = createServiceClient();

  const { error } = await supa
    .from("platform_backups")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}

/** PATCH — Restore from backup */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const supa = createServiceClient();

  // 1. Load backup
  const { data: backup, error: loadErr } = await supa
    .from("platform_backups")
    .select("*")
    .eq("id", id)
    .single();

  if (loadErr || !backup) {
    return NextResponse.json({ error: "Backup not found" }, { status: 404 });
  }

  const backupData = backup.backup_data as {
    tables?: Record<string, Record<string, unknown>[]>;
  } | null;

  if (!backupData?.tables) {
    return NextResponse.json(
      { error: "Backup has no table data (may have been exported without data)" },
      { status: 400 },
    );
  }

  // 2. Restore each table — delete existing rows, then upsert backup data
  const results: Record<string, { deleted: number; restored: number; error?: string }> = {};
  const tables = backup.tables_included as string[];

  // Safety: critical tables that should NOT be wiped during restore
  const SKIP_DELETE_TABLES = ["profiles"]; // profiles are tied to auth.users

  for (const table of tables) {
    const rows = backupData.tables[table];
    if (!rows || rows.length === 0) {
      results[table] = { deleted: 0, restored: 0 };
      continue;
    }

    try {
      let deletedCount = 0;

      // For non-critical tables, clear existing data first
      if (!SKIP_DELETE_TABLES.includes(table)) {
        // Delete all existing rows (we need to use a broad filter)
        const { error: delErr, count } = await supa
          .from(table)
          .delete({ count: "exact" })
          .neq("id", "00000000-0000-0000-0000-000000000000"); // match all rows

        if (delErr) {
          results[table] = { deleted: 0, restored: 0, error: `Delete failed: ${delErr.message}` };
          continue;
        }
        deletedCount = count ?? 0;
      }

      // Insert backup rows in batches of 500
      let restoredCount = 0;
      for (let i = 0; i < rows.length; i += 500) {
        const batch = rows.slice(i, i + 500);
        const { error: insErr } = await supa
          .from(table)
          .upsert(batch, { onConflict: "id", ignoreDuplicates: false });

        if (insErr) {
          results[table] = {
            deleted: deletedCount,
            restored: restoredCount,
            error: `Insert batch ${Math.floor(i / 500)} failed: ${insErr.message}`,
          };
          break;
        }
        restoredCount += batch.length;
      }

      if (!results[table]) {
        results[table] = { deleted: deletedCount, restored: restoredCount };
      }
    } catch (e) {
      results[table] = {
        deleted: 0,
        restored: 0,
        error: e instanceof Error ? e.message : "Unknown error",
      };
    }
  }

  return NextResponse.json({
    restored: true,
    backup_id: id,
    backup_name: backup.name,
    git_commit: backup.git_commit,
    results,
  });
}
