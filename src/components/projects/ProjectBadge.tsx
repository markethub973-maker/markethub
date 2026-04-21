"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ChevronDown, FolderOpen } from "lucide-react";
import { type Project, getProjects } from "@/lib/projects";

function daysUntil(deadline?: string): number | null {
  if (!deadline) return null;
  const d = new Date(deadline);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export default function ProjectBadge() {
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      try {
        const all = await getProjects("active");
        setProjects(all);
        const savedId = localStorage.getItem("mhp-active-project");
        if (savedId) {
          const found = all.find((p) => p.id === savedId);
          setActiveProject(found ?? null);
        }
      } catch {
        // ignore
      }
    }
    load();

    // Listen for storage changes from other tabs/components
    const onStorage = (e: StorageEvent) => {
      if (e.key === "mhp-active-project") load();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const switchTo = (p: Project) => {
    localStorage.setItem("mhp-active-project", p.id);
    setActiveProject(p);
    setOpen(false);
    // Dispatch storage event for same-tab listeners
    window.dispatchEvent(new StorageEvent("storage", { key: "mhp-active-project", newValue: p.id }));
  };

  // No active project
  if (!activeProject) {
    return (
      <Link
        href="/dashboard/projects"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
        style={{ color: "#A8967E", backgroundColor: "rgba(245,215,160,0.08)", border: "1px solid rgba(245,215,160,0.2)" }}
      >
        <FolderOpen size={12} />
        <span className="hidden sm:inline">No active project</span>
        <span className="sm:hidden">No project</span>
      </Link>
    );
  }

  const days = daysUntil(activeProject.deadline);
  const deadlineLabel =
    days === null
      ? null
      : days < 0
      ? `${Math.abs(days)}d overdue`
      : days === 0
      ? "Due today"
      : `${days}d`;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
        style={{ backgroundColor: "rgba(245,215,160,0.08)", border: "1px solid rgba(245,215,160,0.2)", color: "var(--color-text)" }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(245,215,160,0.15)")}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "rgba(245,215,160,0.08)")}
      >
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: activeProject.color || "#F59E0B" }}
        />
        <span className="truncate max-w-[120px] sm:max-w-[180px]">{activeProject.name}</span>
        {deadlineLabel && (
          <span
            className="text-[10px] font-semibold flex-shrink-0"
            style={{ color: days !== null && days < 7 ? "#F59E0B" : "#A8967E" }}
          >
            {deadlineLabel}
          </span>
        )}
        <ChevronDown size={12} style={{ color: "#A8967E" }} />
      </button>

      {open && (
        <div
          className="absolute left-0 top-full mt-1 w-64 rounded-xl py-1 z-50"
          style={{
            backgroundColor: "var(--color-bg-secondary)",
            border: "1px solid rgba(245,215,160,0.35)",
            boxShadow: "0 8px 24px rgba(120,97,78,0.15)",
          }}
        >
          <div className="px-3 py-2" style={{ borderBottom: "1px solid rgba(245,215,160,0.15)" }}>
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#A8967E" }}>
              Switch project
            </p>
          </div>

          <div className="max-h-48 overflow-y-auto">
            {projects.map((p) => {
              const isCurrent = p.id === activeProject.id;
              return (
                <button
                  key={p.id}
                  onClick={() => switchTo(p)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors"
                  style={{
                    backgroundColor: isCurrent ? "rgba(245,158,11,0.08)" : "transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (!isCurrent) e.currentTarget.style.backgroundColor = "rgba(245,215,160,0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = isCurrent ? "rgba(245,158,11,0.08)" : "transparent";
                  }}
                >
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color || "#F59E0B" }} />
                  <span className="text-xs font-medium truncate flex-1" style={{ color: "var(--color-text)" }}>
                    {p.name}
                  </span>
                  {isCurrent && (
                    <span className="text-[10px] font-semibold" style={{ color: "#F59E0B" }}>
                      Current
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="px-3 py-2" style={{ borderTop: "1px solid rgba(245,215,160,0.15)" }}>
            <Link
              href="/dashboard/projects"
              onClick={() => setOpen(false)}
              className="text-xs font-semibold"
              style={{ color: "#F59E0B" }}
            >
              Manage projects →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
