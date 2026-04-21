"use client";

import { useState, useEffect, useCallback } from "react";
import Header from "@/components/layout/Header";
import {
  Plus, X, Check, Archive, Star, Clock, Instagram, Loader2,
  ChevronDown,
} from "lucide-react";
import {
  type Project,
  type ProjectStatus,
  getProjects,
  createProject,
  completeProject,
  archiveProject,
  updateProject,
} from "@/lib/projects";

const cardStyle = {
  backgroundColor: "var(--color-bg-secondary)",
  border: "1px solid rgba(245,215,160,0.25)",
  boxShadow: "0 1px 3px rgba(120,97,78,0.08)",
};

const TABS: { id: ProjectStatus; label: string }[] = [
  { id: "active", label: "Active" },
  { id: "completed", label: "Completed" },
  { id: "archived", label: "Archived" },
];

const PLATFORMS = [
  { id: "instagram", label: "Instagram", color: "#E1306C" },
  { id: "facebook", label: "Facebook", color: "#1877F2" },
  { id: "tiktok", label: "TikTok", color: "#FF0050" },
  { id: "youtube", label: "YouTube", color: "#FF0000" },
  { id: "linkedin", label: "LinkedIn", color: "#0A66C2" },
];

const COLOR_PRESETS = [
  "#F59E0B", "#3B82F6", "#10B981", "#EF4444", "#8B5CF6", "#EC4899",
];

function daysUntil(deadline?: string): number | null {
  if (!deadline) return null;
  const d = new Date(deadline);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function DeadlineBadge({ deadline }: { deadline?: string }) {
  const days = daysUntil(deadline);
  if (days === null) return null;
  const isOverdue = days < 0;
  const isUrgent = days >= 0 && days < 7;
  const color = isOverdue ? "#EF4444" : isUrgent ? "#F59E0B" : "#78614E";
  const label = isOverdue
    ? `${Math.abs(days)}d overdue`
    : days === 0
    ? "Due today"
    : `${days}d left`;
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
      style={{ color, backgroundColor: isOverdue ? "rgba(239,68,68,0.1)" : isUrgent ? "rgba(245,158,11,0.1)" : "rgba(120,97,78,0.08)" }}
    >
      <Clock size={10} />
      {label}
    </span>
  );
}

function StatusBadge({ status }: { status: ProjectStatus }) {
  const cfg: Record<ProjectStatus, { bg: string; color: string; label: string }> = {
    active: { bg: "rgba(16,185,129,0.1)", color: "#10B981", label: "Active" },
    completed: { bg: "rgba(59,130,246,0.1)", color: "#3B82F6", label: "Completed" },
    archived: { bg: "rgba(120,97,78,0.08)", color: "#78614E", label: "Archived" },
  };
  const c = cfg[status];
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: c.bg, color: c.color }}>
      {c.label}
    </span>
  );
}

function PlatformDots({ platforms }: { platforms: string[] }) {
  return (
    <div className="flex items-center gap-1">
      {platforms.map((pid) => {
        const p = PLATFORMS.find((x) => x.id === pid);
        if (!p) return null;
        return (
          <span
            key={pid}
            title={p.label}
            className="w-2.5 h-2.5 rounded-full inline-block"
            style={{ backgroundColor: p.color }}
          />
        );
      })}
    </div>
  );
}

const EMPTY_FORM = {
  name: "",
  objective: "",
  start_date: new Date().toISOString().slice(0, 10),
  deadline: "",
  platforms: [] as string[],
  color: COLOR_PRESETS[0],
};

export default function ProjectsPage() {
  const [tab, setTab] = useState<ProjectStatus>("active");
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [activeId, setActiveId] = useState<string | null>(null);

  // Load active project ID from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("mhp-active-project");
    if (saved) setActiveId(saved);
  }, []);

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getProjects(tab);
      setProjects(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await createProject({
        name: form.name.trim(),
        objective: form.objective.trim() || undefined,
        start_date: form.start_date,
        deadline: form.deadline || undefined,
        platforms: form.platforms,
        color: form.color,
        status: "active",
      });
      setShowModal(false);
      setForm({ ...EMPTY_FORM });
      setTab("active");
      await fetchProjects();
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const handleSetActive = (p: Project) => {
    localStorage.setItem("mhp-active-project", p.id);
    setActiveId(p.id);
  };

  const handleComplete = async (id: string) => {
    await completeProject(id);
    if (activeId === id) {
      localStorage.removeItem("mhp-active-project");
      setActiveId(null);
    }
    fetchProjects();
  };

  const handleArchive = async (id: string) => {
    await archiveProject(id);
    if (activeId === id) {
      localStorage.removeItem("mhp-active-project");
      setActiveId(null);
    }
    fetchProjects();
  };

  const togglePlatform = (pid: string) => {
    setForm((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(pid)
        ? prev.platforms.filter((x) => x !== pid)
        : [...prev.platforms, pid],
    }));
  };

  return (
    <>
      <Header title="Projects" subtitle="Manage campaigns & client projects" />

      <div className="p-4 md:p-6 lg:p-8 space-y-6" style={{ color: "var(--color-text)" }}>
        {/* Top bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: "rgba(245,215,160,0.12)" }}>
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
                style={
                  tab === t.id
                    ? { backgroundColor: "var(--color-bg-secondary)", color: "var(--color-text)", boxShadow: "0 1px 2px rgba(120,97,78,0.1)" }
                    : { color: "#A8967E" }
                }
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* New Project */}
          <button
            onClick={() => setShowModal(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
            style={{ backgroundColor: "#F59E0B" }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#D97706")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#F59E0B")}
          >
            <Plus size={16} />
            New Project
          </button>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#F59E0B" }} />
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20" style={{ color: "#A8967E" }}>
            <p className="text-lg font-medium mb-1">No {tab} projects</p>
            <p className="text-sm">
              {tab === "active"
                ? 'Click "New Project" to get started.'
                : `Projects you ${tab === "completed" ? "complete" : "archive"} will appear here.`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => {
              const isActive = activeId === p.id;
              return (
                <div
                  key={p.id}
                  className="relative rounded-xl overflow-hidden transition-shadow hover:shadow-md"
                  style={{
                    ...cardStyle,
                    borderLeft: `3px solid ${p.color || "#F59E0B"}`,
                    outline: isActive ? `2px solid ${p.color || "#F59E0B"}` : "none",
                  }}
                >
                  <div className="p-4 space-y-3">
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-bold truncate" style={{ color: "var(--color-text)" }}>
                          {p.name}
                        </h3>
                        {p.client_id && (
                          <p className="text-xs mt-0.5" style={{ color: "#A8967E" }}>
                            Client project
                          </p>
                        )}
                      </div>
                      <StatusBadge status={p.status} />
                    </div>

                    {/* Objective */}
                    {p.objective && (
                      <p className="text-xs leading-relaxed" style={{ color: "#78614E" }}>
                        {p.objective.length > 60
                          ? p.objective.slice(0, 60) + "..."
                          : p.objective}
                      </p>
                    )}

                    {/* Meta row */}
                    <div className="flex items-center gap-3 flex-wrap">
                      {p.platforms && p.platforms.length > 0 && <PlatformDots platforms={p.platforms} />}
                      <DeadlineBadge deadline={p.deadline} />
                    </div>

                    {/* Actions */}
                    {p.status === "active" && (
                      <div className="flex items-center gap-2 pt-1 flex-wrap">
                        <button
                          onClick={() => handleSetActive(p)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                          style={
                            isActive
                              ? { backgroundColor: "rgba(245,158,11,0.15)", color: "#D97706", border: "1px solid rgba(245,158,11,0.3)" }
                              : { backgroundColor: "rgba(245,215,160,0.12)", color: "#78614E", border: "1px solid rgba(245,215,160,0.25)" }
                          }
                        >
                          <Star size={12} fill={isActive ? "#D97706" : "none"} />
                          {isActive ? "Active" : "Set as Active"}
                        </button>

                        <button
                          onClick={() => handleComplete(p.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                          style={{ backgroundColor: "rgba(16,185,129,0.08)", color: "#10B981", border: "1px solid rgba(16,185,129,0.2)" }}
                        >
                          <Check size={12} />
                          Complete
                        </button>

                        <button
                          onClick={() => handleArchive(p.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                          style={{ backgroundColor: "rgba(120,97,78,0.06)", color: "#A8967E", border: "1px solid rgba(120,97,78,0.15)" }}
                        >
                          <Archive size={12} />
                          Archive
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New Project Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div
            className="w-full max-w-md rounded-2xl overflow-hidden"
            style={{ backgroundColor: "var(--color-bg-secondary)", border: "1px solid rgba(245,215,160,0.35)", boxShadow: "0 16px 48px rgba(120,97,78,0.2)" }}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid rgba(245,215,160,0.2)" }}>
              <h2 className="text-lg font-bold" style={{ color: "var(--color-text)" }}>New Project</h2>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg" style={{ color: "#A8967E" }}>
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "#78614E" }}>
                  Project Name <span style={{ color: "#EF4444" }}>*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Summer Campaign 2026"
                  className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                  style={{ backgroundColor: "#F5EFE6", border: "1px solid rgba(245,215,160,0.3)", color: "var(--color-text)" }}
                  onFocus={(e) => (e.currentTarget.style.border = "1px solid #F59E0B")}
                  onBlur={(e) => (e.currentTarget.style.border = "1px solid rgba(245,215,160,0.3)")}
                />
              </div>

              {/* Objective */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "#78614E" }}>
                  Objective
                </label>
                <textarea
                  value={form.objective}
                  onChange={(e) => setForm((f) => ({ ...f, objective: e.target.value }))}
                  placeholder="What's the goal of this project?"
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none resize-none"
                  style={{ backgroundColor: "#F5EFE6", border: "1px solid rgba(245,215,160,0.3)", color: "var(--color-text)" }}
                  onFocus={(e) => (e.currentTarget.style.border = "1px solid #F59E0B")}
                  onBlur={(e) => (e.currentTarget.style.border = "1px solid rgba(245,215,160,0.3)")}
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "#78614E" }}>
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                    style={{ backgroundColor: "#F5EFE6", border: "1px solid rgba(245,215,160,0.3)", color: "var(--color-text)" }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "#78614E" }}>
                    Deadline
                  </label>
                  <input
                    type="date"
                    value={form.deadline}
                    onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                    style={{ backgroundColor: "#F5EFE6", border: "1px solid rgba(245,215,160,0.3)", color: "var(--color-text)" }}
                  />
                </div>
              </div>

              {/* Platforms */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "#78614E" }}>
                  Platforms
                </label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map((pl) => {
                    const selected = form.platforms.includes(pl.id);
                    return (
                      <button
                        key={pl.id}
                        type="button"
                        onClick={() => togglePlatform(pl.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                        style={
                          selected
                            ? { backgroundColor: pl.color + "18", color: pl.color, border: `1px solid ${pl.color}40` }
                            : { backgroundColor: "rgba(245,215,160,0.08)", color: "#A8967E", border: "1px solid rgba(245,215,160,0.2)" }
                        }
                      >
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: pl.color }} />
                        {pl.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "#78614E" }}>
                  Color
                </label>
                <div className="flex gap-2">
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, color: c }))}
                      className="w-8 h-8 rounded-full transition-transform"
                      style={{
                        backgroundColor: c,
                        border: form.color === c ? "3px solid var(--color-text)" : "2px solid transparent",
                        transform: form.color === c ? "scale(1.15)" : "scale(1)",
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-6 py-4" style={{ borderTop: "1px solid rgba(245,215,160,0.2)" }}>
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{ color: "#78614E" }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !form.name.trim()}
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-50"
                style={{ backgroundColor: "#F59E0B" }}
                onMouseEnter={(e) => { if (!saving) e.currentTarget.style.backgroundColor = "#D97706"; }}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#F59E0B")}
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                Create Project
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
