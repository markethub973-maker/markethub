"use client";

/**
 * Admin → Platform Backups — 8 numbered slots with incremental/total backup + restore
 */

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft, Download, RotateCcw, Database, Clock, AlertTriangle,
  CheckCircle2, X, Loader2, HardDrive, Save, Info, Layers, Zap,
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
  backup_type?: string; // "total" | "incremental"
}

interface SlotData {
  slot: number;
  backup: Backup | null;
}

function formatBytes(bytes: number): string {
  if (!bytes) return "—";
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function totalRows(rc: Record<string, number>): number {
  return Object.values(rc).reduce((s, n) => s + n, 0);
}

const SLOT_LABELS = [
  "Golden Snapshot",
  "Pre-Deploy",
  "Daily Auto",
  "Weekly Full",
  "Before Refactor",
  "Client Demo",
  "Emergency",
  "Custom",
];

const cardBg = "#1C1814";
const cardBorder = "rgba(245,215,160,0.15)";
const amber = "#F59E0B";
const textMain = "#FFF8F0";
const textMuted = "rgba(255,248,240,0.5)";

export default function BackupsPage() {
  const [slots, setSlots] = useState<SlotData[]>(
    Array.from({ length: 8 }, (_, i) => ({ slot: i + 1, backup: null }))
  );
  const [loading, setLoading] = useState(true);
  const [actionSlot, setActionSlot] = useState<number | null>(null);
  const [actionType, setActionType] = useState<"backup-total" | "backup-incremental" | "restore" | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [confirmRestore, setConfirmRestore] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);

  const loadBackups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/backups");
      if (!res.ok) return;
      const data = await res.json();
      const backups: Backup[] = data.backups || [];

      // Map backups to slots by name pattern "Slot X" or by order
      const newSlots: SlotData[] = Array.from({ length: 8 }, (_, i) => ({ slot: i + 1, backup: null }));
      backups.forEach((b, idx) => {
        const match = b.name.match(/^Slot (\d)$/);
        if (match) {
          const si = parseInt(match[1]) - 1;
          if (si >= 0 && si < 8) newSlots[si].backup = b;
        } else if (idx < 8 && !newSlots[idx].backup) {
          newSlots[idx].backup = b;
        }
      });
      setSlots(newSlots);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadBackups(); }, [loadBackups]);

  const runBackup = async (slot: number, type: "total" | "incremental") => {
    setProcessing(true);
    setResult(null);
    setActionSlot(slot);
    setActionType(type === "total" ? "backup-total" : "backup-incremental");
    try {
      const res = await fetch("/api/admin/backups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `Slot ${slot}`,
          description: `${type === "total" ? "Total" : "Incremental"} backup — ${SLOT_LABELS[slot - 1]}`,
          backup_type: type,
        }),
      });
      const d = await res.json();
      if (res.ok) {
        setResult({ ok: true, msg: `Slot ${slot} — ${type} backup saved!` });
        loadBackups();
      } else {
        setResult({ ok: false, msg: d.error || "Backup failed" });
      }
    } catch {
      setResult({ ok: false, msg: "Network error" });
    }
    setProcessing(false);
    setTimeout(() => setResult(null), 4000);
  };

  const runRestore = async (slot: number) => {
    const b = slots[slot - 1]?.backup;
    if (!b) return;
    setProcessing(true);
    setResult(null);
    setActionSlot(slot);
    setActionType("restore");
    setConfirmRestore(null);
    try {
      const res = await fetch(`/api/admin/backups/${b.id}`, { method: "PATCH" });
      const d = await res.json();
      if (res.ok) {
        const tables = Object.keys(d.results || {}).length;
        const rows = Object.values(d.results || {}).reduce((s: number, r: unknown) => s + ((r as { restored: number }).restored || 0), 0);
        setResult({ ok: true, msg: `Restored ${tables} tables, ${rows} rows from Slot ${slot}` });
      } else {
        setResult({ ok: false, msg: d.error || "Restore failed" });
      }
    } catch {
      setResult({ ok: false, msg: "Network error" });
    }
    setProcessing(false);
    setTimeout(() => setResult(null), 6000);
  };

  const downloadBackup = async (backupId: string, slotNum: number) => {
    try {
      const res = await fetch(`/api/admin/backups/${backupId}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `markethub-slot${slotNum}-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
  };

  const downloadFullExport = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/admin/backups/export");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `markethub-FULL-${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
    setExporting(false);
  };

  return (
    <div className="min-h-screen" style={{ background: "#141210", color: textMain }}>
      {/* Header */}
      <div className="px-6 py-5 flex items-center justify-between flex-wrap gap-4" style={{ borderBottom: `1px solid ${cardBorder}` }}>
        <div className="flex items-center gap-4">
          <Link href="/dashboard/admin" className="p-2 rounded-lg" style={{ color: textMuted }}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <HardDrive className="w-5 h-5" style={{ color: amber }} />
              Platform Backups
            </h1>
            <p className="text-xs mt-0.5" style={{ color: textMuted }}>
              8 slots — incremental or total — full restore with one click
            </p>
          </div>
        </div>
        <button onClick={downloadFullExport} disabled={exporting}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold"
          style={{ background: "rgba(245,158,11,0.15)", color: amber, border: `1px solid rgba(245,158,11,0.3)` }}>
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {exporting ? "Exporting..." : "Export Full ZIP"}
        </button>
      </div>

      {/* Result message */}
      {result && (
        <div className="mx-6 mt-4 flex items-center gap-2 px-4 py-3 rounded-lg"
          style={{
            background: result.ok ? "rgba(22,163,74,0.1)" : "rgba(239,68,68,0.1)",
            border: `1px solid ${result.ok ? "rgba(22,163,74,0.3)" : "rgba(239,68,68,0.3)"}`,
          }}>
          {result.ok ? <CheckCircle2 className="w-4 h-4" style={{ color: "#16A34A" }} /> : <AlertTriangle className="w-4 h-4" style={{ color: "#EF4444" }} />}
          <span className="text-sm font-medium" style={{ color: result.ok ? "#16A34A" : "#EF4444" }}>{result.msg}</span>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: amber }} />
        </div>
      )}

      {/* 8 Backup Slots */}
      {!loading && (
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {slots.map(({ slot, backup }) => {
            const isProcessing = processing && actionSlot === slot;
            const hasData = !!backup;
            return (
              <div key={slot} className="rounded-xl overflow-hidden"
                style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>

                {/* Slot Header */}
                <div className="px-4 py-3 flex items-center justify-between"
                  style={{ borderBottom: `1px solid ${cardBorder}`, background: hasData ? "rgba(245,158,11,0.05)" : "transparent" }}>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold"
                      style={{ background: hasData ? amber : "rgba(255,248,240,0.08)", color: hasData ? "#1C1814" : textMuted }}>
                      {slot}
                    </div>
                    <div>
                      <p className="text-xs font-bold" style={{ color: textMain }}>{SLOT_LABELS[slot - 1]}</p>
                      <p className="text-xs" style={{ color: textMuted }}>
                        {hasData ? formatDate(backup.created_at) : "Empty slot"}
                      </p>
                    </div>
                  </div>
                  {hasData && (
                    <button onClick={() => downloadBackup(backup.id, slot)} title="Download"
                      className="p-1.5 rounded-lg transition-colors hover:bg-white/5">
                      <Download className="w-3.5 h-3.5" style={{ color: textMuted }} />
                    </button>
                  )}
                </div>

                {/* Slot Info */}
                <div className="px-4 py-3 min-h-[80px]">
                  {hasData ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <Database className="w-3 h-3" style={{ color: amber }} />
                        <span className="text-xs" style={{ color: textMuted }}>
                          {backup.tables_included.length} tables · {totalRows(backup.row_counts).toLocaleString()} rows
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Layers className="w-3 h-3" style={{ color: amber }} />
                        <span className="text-xs" style={{ color: textMuted }}>
                          {formatBytes(backup.total_size_bytes)}
                          {backup.backup_type && ` · ${backup.backup_type}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Info className="w-3 h-3" style={{ color: amber }} />
                        <span className="text-xs" style={{ color: textMuted }}>
                          {backup.git_commit?.slice(0, 8) || "—"}
                        </span>
                      </div>
                      {backup.description && (
                        <p className="text-xs mt-1" style={{ color: "rgba(255,248,240,0.35)" }}>
                          {backup.description}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-xs" style={{ color: "rgba(255,248,240,0.2)" }}>
                        No backup saved
                      </p>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="px-4 py-3 space-y-2" style={{ borderTop: `1px solid ${cardBorder}` }}>
                  {/* Restore button */}
                  {hasData && (
                    confirmRestore === slot ? (
                      <div className="flex gap-2">
                        <button onClick={() => runRestore(slot)} disabled={isProcessing}
                          className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-bold"
                          style={{ background: "rgba(239,68,68,0.15)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.3)" }}>
                          {isProcessing && actionType === "restore" ? <Loader2 className="w-3 h-3 animate-spin" /> : <AlertTriangle className="w-3 h-3" />}
                          Confirm
                        </button>
                        <button onClick={() => setConfirmRestore(null)}
                          className="px-3 py-2 rounded-lg text-xs" style={{ color: textMuted }}>
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmRestore(slot)} disabled={processing}
                        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors"
                        style={{ background: "rgba(99,102,241,0.1)", color: "#818CF8", border: "1px solid rgba(99,102,241,0.2)" }}>
                        <RotateCcw className="w-3 h-3" />
                        Restore
                      </button>
                    )
                  )}

                  {/* Backup buttons — 2 modes */}
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => runBackup(slot, "incremental")} disabled={processing}
                      className="flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-semibold transition-colors"
                      style={{ background: "rgba(245,158,11,0.1)", color: amber, border: `1px solid rgba(245,158,11,0.2)` }}>
                      {isProcessing && actionType === "backup-incremental"
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <Zap className="w-3 h-3" />}
                      Incremental
                    </button>
                    <button onClick={() => runBackup(slot, "total")} disabled={processing}
                      className="flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-semibold transition-colors"
                      style={{ background: "rgba(22,163,74,0.1)", color: "#16A34A", border: "1px solid rgba(22,163,74,0.2)" }}>
                      {isProcessing && actionType === "backup-total"
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <Save className="w-3 h-3" />}
                      Total
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div className="px-6 pb-6">
        <div className="rounded-xl p-4" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
          <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: textMuted }}>Backup Modes</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-start gap-2">
              <Zap className="w-4 h-4 shrink-0 mt-0.5" style={{ color: amber }} />
              <div>
                <p className="text-xs font-semibold" style={{ color: textMain }}>Incremental</p>
                <p className="text-xs" style={{ color: textMuted }}>
                  Saves only rows changed since last backup. Faster, smaller.
                  Uses created_at/updated_at timestamps to detect changes.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Save className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#16A34A" }} />
              <div>
                <p className="text-xs font-semibold" style={{ color: textMain }}>Total</p>
                <p className="text-xs" style={{ color: textMuted }}>
                  Full snapshot of all 23 tables + git commit + env config.
                  Complete restore point — zero data loss guaranteed.
                </p>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-3 flex items-start gap-2" style={{ borderTop: `1px solid ${cardBorder}` }}>
            <Download className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#818CF8" }} />
            <div>
              <p className="text-xs font-semibold" style={{ color: textMain }}>Export Full ZIP</p>
              <p className="text-xs" style={{ color: textMuted }}>
                Downloads complete platform as ZIP: source code + all DB tables + dependencies +
                env var names + git info + restore instructions. For offline archiving.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
