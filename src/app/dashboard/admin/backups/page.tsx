"use client";

/**
 * Admin -> Platform Backups
 *
 * Create, list, download, restore, and delete platform backups.
 * Follows the cream/amber admin theme established by other admin pages.
 */

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  Trash2,
  RotateCcw,
  Plus,
  Database,
  GitBranch,
  Clock,
  AlertTriangle,
  CheckCircle2,
  X,
  Loader2,
  HardDrive,
  FileDown,
} from "lucide-react";

interface Backup {
  id: string;
  name: string;
  description: string | null;
  git_tag: string;
  git_commit: string;
  tables_included: string[];
  row_counts: Record<string, number>;
  total_size_bytes: number;
  created_at: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function BackupsPage() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<Backup | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [restoreResult, setRestoreResult] = useState<Record<string, unknown> | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Backup | null>(null);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [exporting, setExporting] = useState(false);

  const loadBackups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/backups", { cache: "no-store" });
      if (res.status === 401 || res.status === 403) {
        setError("SESSION_EXPIRED");
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setBackups(json.backups ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBackups();
  }, [loadBackups]);

  async function createBackup() {
    setCreating(true);
    try {
      const res = await fetch("/api/admin/backups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName || undefined,
          description: newDesc || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      setShowCreateForm(false);
      setNewName("");
      setNewDesc("");
      await loadBackups();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setCreating(false);
    }
  }

  async function downloadBackup(backup: Backup) {
    const res = await fetch(`/api/admin/backups/${backup.id}`);
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backup-${backup.name.replace(/[^a-zA-Z0-9_-]/g, "_")}-${backup.created_at.slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function fullExport() {
    setExporting(true);
    try {
      const res = await fetch("/api/admin/backups/export");
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `markethub-full-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  async function restoreBackup(id: string) {
    setRestoring(true);
    setRestoreResult(null);
    try {
      const res = await fetch(`/api/admin/backups/${id}`, {
        method: "PATCH",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Restore failed");
      setRestoreResult(json.results);
      await loadBackups();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Restore failed");
    } finally {
      setRestoring(false);
    }
  }

  async function deleteBackup(id: string) {
    try {
      const res = await fetch(`/api/admin/backups/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      setDeleteTarget(null);
      await loadBackups();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  }

  const totalRows = (b: Backup) =>
    Object.values(b.row_counts).reduce((a, c) => a + c, 0);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#1C1814",
        color: "#FAF5EF",
        padding: "24px 16px",
      }}
    >
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 8,
            flexWrap: "wrap",
          }}
        >
          <Link
            href="/dashboard/admin"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              background: "rgba(255,255,255,0.05)",
              borderRadius: 8,
              color: "#C4AA8A",
              textDecoration: "none",
              fontSize: 13,
            }}
          >
            <ArrowLeft size={14} /> Back
          </Link>
          <div style={{ flex: 1 }}>
            <h1
              style={{
                fontSize: 22,
                fontWeight: 700,
                margin: 0,
                color: "#FAF5EF",
              }}
            >
              Platform Backups
            </h1>
            <p
              style={{
                fontSize: 13,
                color: "#C4AA8A",
                margin: "4px 0 0",
              }}
            >
              Create, download, and restore complete platform snapshots
            </p>
          </div>
        </div>

        {/* Action bar */}
        <div
          style={{
            display: "flex",
            gap: 10,
            marginBottom: 24,
            marginTop: 16,
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={() => setShowCreateForm(true)}
            style={{
              padding: "10px 20px",
              background: "var(--color-primary, #F59E0B)",
              color: "#1C1814",
              border: "none",
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Plus size={16} /> Create Backup
          </button>
          <button
            onClick={fullExport}
            disabled={exporting}
            style={{
              padding: "10px 20px",
              background: "rgba(245,158,11,0.15)",
              color: "var(--color-primary, #F59E0B)",
              border: "1px solid rgba(245,158,11,0.3)",
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              cursor: exporting ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {exporting ? <Loader2 size={16} className="spin" /> : <FileDown size={16} />}
            {exporting ? "Exporting..." : "Full Export"}
          </button>
          <button
            onClick={loadBackups}
            disabled={loading}
            style={{
              padding: "10px 16px",
              background: "rgba(255,255,255,0.05)",
              color: "#C4AA8A",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 10,
              fontSize: 13,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            Refresh
          </button>
        </div>

        {/* Create form modal overlay */}
        {showCreateForm && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.6)",
              zIndex: 1000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
            }}
            onClick={() => setShowCreateForm(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "#2A2318",
                borderRadius: 14,
                padding: 28,
                width: "100%",
                maxWidth: 480,
                border: "1px solid rgba(245,215,160,0.25)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 20,
                }}
              >
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
                  Create Backup
                </h2>
                <button
                  onClick={() => setShowCreateForm(false)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#C4AA8A",
                    cursor: "pointer",
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  color: "#C4AA8A",
                  marginBottom: 6,
                  fontWeight: 600,
                }}
              >
                BACKUP NAME
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Before major update"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8,
                  color: "#FAF5EF",
                  fontSize: 14,
                  marginBottom: 16,
                  boxSizing: "border-box",
                }}
              />

              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  color: "#C4AA8A",
                  marginBottom: 6,
                  fontWeight: 600,
                }}
              >
                DESCRIPTION (optional)
              </label>
              <textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="What is this backup for?"
                rows={3}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8,
                  color: "#FAF5EF",
                  fontSize: 14,
                  marginBottom: 20,
                  resize: "vertical",
                  boxSizing: "border-box",
                }}
              />

              <button
                onClick={createBackup}
                disabled={creating}
                style={{
                  width: "100%",
                  padding: "12px 20px",
                  background: "var(--color-primary, #F59E0B)",
                  color: "#1C1814",
                  border: "none",
                  borderRadius: 10,
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: creating ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                {creating ? (
                  <>
                    <Loader2 size={16} className="spin" /> Creating backup...
                  </>
                ) : (
                  <>
                    <Database size={16} /> Create Snapshot
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Restore confirmation modal */}
        {restoreTarget && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.6)",
              zIndex: 1000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
            }}
            onClick={() => {
              setRestoreTarget(null);
              setRestoreResult(null);
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "#2A2318",
                borderRadius: 14,
                padding: 28,
                width: "100%",
                maxWidth: 520,
                border: "1px solid rgba(239,68,68,0.4)",
              }}
            >
              {!restoreResult ? (
                <>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 16,
                    }}
                  >
                    <AlertTriangle size={24} color="#EF4444" />
                    <h2
                      style={{
                        margin: 0,
                        fontSize: 18,
                        fontWeight: 700,
                        color: "#FCA5A5",
                      }}
                    >
                      Confirm Restore
                    </h2>
                  </div>
                  <p style={{ fontSize: 14, color: "#C4AA8A", lineHeight: 1.6 }}>
                    Are you sure you want to restore from{" "}
                    <strong style={{ color: "#FAF5EF" }}>
                      {restoreTarget.name}
                    </strong>
                    ?
                  </p>
                  <p
                    style={{
                      fontSize: 13,
                      color: "#EF4444",
                      lineHeight: 1.6,
                      marginTop: 8,
                    }}
                  >
                    This will overwrite current data in{" "}
                    {restoreTarget.tables_included.length} tables with data from{" "}
                    {formatDate(restoreTarget.created_at)}. This action cannot be
                    undone.
                  </p>
                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      marginTop: 24,
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      onClick={() => {
                        setRestoreTarget(null);
                        setRestoreResult(null);
                      }}
                      style={{
                        flex: 1,
                        padding: "12px 20px",
                        background: "rgba(255,255,255,0.05)",
                        color: "#C4AA8A",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 10,
                        fontSize: 14,
                        cursor: "pointer",
                        minWidth: 120,
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => restoreBackup(restoreTarget.id)}
                      disabled={restoring}
                      style={{
                        flex: 1,
                        padding: "12px 20px",
                        background: "#EF4444",
                        color: "#FFF",
                        border: "none",
                        borderRadius: 10,
                        fontSize: 14,
                        fontWeight: 700,
                        cursor: restoring ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        minWidth: 120,
                      }}
                    >
                      {restoring ? (
                        <>
                          <Loader2 size={16} className="spin" /> Restoring...
                        </>
                      ) : (
                        <>
                          <RotateCcw size={16} /> Yes, Restore
                        </>
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 16,
                    }}
                  >
                    <CheckCircle2 size={24} color="#10B981" />
                    <h2
                      style={{
                        margin: 0,
                        fontSize: 18,
                        fontWeight: 700,
                        color: "#10B981",
                      }}
                    >
                      Restore Complete
                    </h2>
                  </div>
                  <div
                    style={{
                      maxHeight: 300,
                      overflowY: "auto",
                      background: "rgba(0,0,0,0.3)",
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 12,
                      fontFamily: "monospace",
                      color: "#C4AA8A",
                    }}
                  >
                    {Object.entries(
                      restoreResult as Record<
                        string,
                        { deleted: number; restored: number; error?: string }
                      >,
                    ).map(([table, info]) => (
                      <div key={table} style={{ marginBottom: 6 }}>
                        <span
                          style={{
                            color: info.error ? "#FCA5A5" : "#86EFAC",
                          }}
                        >
                          {info.error ? "!" : "+"}{" "}
                        </span>
                        <strong>{table}</strong>: {info.restored} rows restored
                        {info.error && (
                          <span style={{ color: "#FCA5A5" }}>
                            {" "}
                            ({info.error})
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      setRestoreTarget(null);
                      setRestoreResult(null);
                    }}
                    style={{
                      marginTop: 16,
                      width: "100%",
                      padding: "12px 20px",
                      background: "rgba(16,185,129,0.15)",
                      color: "#10B981",
                      border: "1px solid rgba(16,185,129,0.3)",
                      borderRadius: 10,
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Close
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Delete confirmation modal */}
        {deleteTarget && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.6)",
              zIndex: 1000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
            }}
            onClick={() => setDeleteTarget(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "#2A2318",
                borderRadius: 14,
                padding: 28,
                width: "100%",
                maxWidth: 420,
                border: "1px solid rgba(239,68,68,0.3)",
              }}
            >
              <h2
                style={{
                  margin: "0 0 12px",
                  fontSize: 18,
                  fontWeight: 700,
                  color: "#FCA5A5",
                }}
              >
                Delete Backup?
              </h2>
              <p style={{ fontSize: 14, color: "#C4AA8A" }}>
                Delete <strong style={{ color: "#FAF5EF" }}>{deleteTarget.name}</strong>? This
                cannot be undone.
              </p>
              <div
                style={{ display: "flex", gap: 10, marginTop: 20, flexWrap: "wrap" }}
              >
                <button
                  onClick={() => setDeleteTarget(null)}
                  style={{
                    flex: 1,
                    padding: "10px 16px",
                    background: "rgba(255,255,255,0.05)",
                    color: "#C4AA8A",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 8,
                    fontSize: 13,
                    cursor: "pointer",
                    minWidth: 100,
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteBackup(deleteTarget.id)}
                  style={{
                    flex: 1,
                    padding: "10px 16px",
                    background: "#EF4444",
                    color: "#FFF",
                    border: "none",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    minWidth: 100,
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error states */}
        {error === "SESSION_EXPIRED" && (
          <div
            style={{
              padding: 24,
              background: "rgba(245,158,11,0.12)",
              border: "1px solid rgba(245,158,11,0.35)",
              borderRadius: 10,
              color: "#FCD34D",
              marginBottom: 24,
              textAlign: "center",
            }}
          >
            <AlertTriangle
              size={20}
              style={{ display: "inline", marginRight: 8, verticalAlign: "middle" }}
            />
            <strong>Admin session expired.</strong>
            <div style={{ marginTop: 8, fontSize: 13, color: "#C4AA8A" }}>
              Re-authenticate through the admin tunnel URL, then come back here.
            </div>
          </div>
        )}
        {error && error !== "SESSION_EXPIRED" && (
          <div
            style={{
              padding: 16,
              background: "rgba(239,68,68,0.12)",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: 10,
              color: "#FCA5A5",
              marginBottom: 24,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <AlertTriangle size={14} />
            Error: {error}
            <button
              onClick={() => setError(null)}
              style={{
                marginLeft: "auto",
                background: "none",
                border: "none",
                color: "#FCA5A5",
                cursor: "pointer",
              }}
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && !backups.length && (
          <div style={{ color: "#C4AA8A", textAlign: "center", padding: 40 }}>
            <Loader2 size={24} className="spin" style={{ marginBottom: 8 }} />
            <div>Loading backups...</div>
          </div>
        )}

        {/* Empty state */}
        {!loading && backups.length === 0 && !error && (
          <div
            style={{
              padding: 48,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(245,215,160,0.25)",
              borderRadius: 14,
              textAlign: "center",
            }}
          >
            <Database size={40} color="#C4AA8A" style={{ marginBottom: 12 }} />
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
              No backups yet
            </div>
            <div style={{ fontSize: 13, color: "#C4AA8A" }}>
              Create your first backup to snapshot the entire platform state.
            </div>
          </div>
        )}

        {/* Backup list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {backups.map((b) => (
            <div
              key={b.id}
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(245,215,160,0.25)",
                borderRadius: 14,
                padding: "20px 20px 16px",
              }}
            >
              {/* Top row: name + date */}
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 12,
                  marginBottom: 12,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: "#FAF5EF",
                      marginBottom: 4,
                    }}
                  >
                    {b.name}
                  </div>
                  {b.description && (
                    <div style={{ fontSize: 13, color: "#C4AA8A" }}>
                      {b.description}
                    </div>
                  )}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#C4AA8A",
                    whiteSpace: "nowrap",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <Clock size={12} /> {formatDate(b.created_at)}
                </div>
              </div>

              {/* Stats row */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: 8,
                  marginBottom: 14,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 12,
                    color: "#C4AA8A",
                  }}
                >
                  <GitBranch size={12} />
                  <span>
                    {b.git_commit.slice(0, 7)} ({b.git_tag})
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 12,
                    color: "#C4AA8A",
                  }}
                >
                  <Database size={12} />
                  <span>
                    {b.tables_included.length} tables, {totalRows(b).toLocaleString()} rows
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 12,
                    color: "#C4AA8A",
                    gridColumn: "1 / -1",
                  }}
                >
                  <HardDrive size={12} />
                  <span>{formatBytes(b.total_size_bytes)}</span>
                </div>
              </div>

              {/* Action buttons */}
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  borderTop: "1px solid rgba(255,255,255,0.06)",
                  paddingTop: 12,
                }}
              >
                <button
                  onClick={() => downloadBackup(b)}
                  style={{
                    padding: "8px 14px",
                    background: "rgba(245,158,11,0.12)",
                    color: "var(--color-primary, #F59E0B)",
                    border: "1px solid rgba(245,158,11,0.25)",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Download size={13} /> Download
                </button>
                <button
                  onClick={() => setRestoreTarget(b)}
                  style={{
                    padding: "8px 14px",
                    background: "rgba(59,130,246,0.12)",
                    color: "#60A5FA",
                    border: "1px solid rgba(59,130,246,0.25)",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <RotateCcw size={13} /> Restore
                </button>
                <button
                  onClick={() => setDeleteTarget(b)}
                  style={{
                    padding: "8px 14px",
                    background: "rgba(239,68,68,0.08)",
                    color: "#F87171",
                    border: "1px solid rgba(239,68,68,0.2)",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginLeft: "auto",
                  }}
                >
                  <Trash2 size={13} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        :global(.spin) {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}
