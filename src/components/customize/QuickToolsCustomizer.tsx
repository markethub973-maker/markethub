"use client";

/**
 * Quick Tools Customizer — Tab "Quick Tools" (all plans).
 * Show/hide tools and categories, reorder categories.
 * Saves to user_brain_profiles.custom_prefs.quick_tools via /api/theme.
 */

import { useState, useCallback, useEffect } from "react";
import {
  Save,
  ChevronDown,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
} from "lucide-react";

interface Tool {
  id: string;
  label: string;
  visible: boolean;
}

interface Category {
  id: string;
  label: string;
  icon: string;
  visible: boolean;
  tools: Tool[];
}

const DEFAULT_CATEGORIES: Category[] = [
  {
    id: "content",
    label: "Content Creation",
    icon: "✍️",
    visible: true,
    tools: [
      { id: "ai-caption", label: "AI Caption Generator", visible: true },
      { id: "ai-hashtag", label: "Hashtag Suggester", visible: true },
      { id: "ai-hooks", label: "Hook Generator", visible: true },
      { id: "content-repurpose", label: "Content Repurpose", visible: true },
    ],
  },
  {
    id: "media",
    label: "Media Studio",
    icon: "🎨",
    visible: true,
    tools: [
      { id: "ai-image", label: "AI Image Generator", visible: true },
      { id: "ai-video", label: "AI Video Studio", visible: true },
      { id: "ai-audio", label: "AI Audio Studio", visible: true },
      { id: "thumbnail", label: "Thumbnail Creator", visible: true },
    ],
  },
  {
    id: "analytics",
    label: "Analytics & Insights",
    icon: "📊",
    visible: true,
    tools: [
      { id: "engagement-predict", label: "Engagement Predictor", visible: true },
      { id: "best-time", label: "Best Time to Post", visible: true },
      { id: "competitor-scan", label: "Competitor Analysis", visible: true },
    ],
  },
  {
    id: "scheduling",
    label: "Scheduling & Publishing",
    icon: "📅",
    visible: true,
    tools: [
      { id: "calendar", label: "Content Calendar", visible: true },
      { id: "auto-pilot", label: "Campaign Auto-Pilot", visible: true },
      { id: "publish-queue", label: "Publish Queue", visible: true },
    ],
  },
  {
    id: "clients",
    label: "Client Management",
    icon: "👥",
    visible: true,
    tools: [
      { id: "leads", label: "Lead Manager", visible: true },
      { id: "client-portal", label: "Client Portal", visible: true },
      { id: "reports", label: "Report Generator", visible: true },
    ],
  },
  {
    id: "automation",
    label: "Automations",
    icon: "⚡",
    visible: true,
    tools: [
      { id: "webhooks", label: "Webhooks", visible: true },
      { id: "auto-reply", label: "Auto Reply", visible: true },
      { id: "recycling", label: "Content Recycling", visible: true },
    ],
  },
];

export default function QuickToolsCustomizer() {
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [expandedCat, setExpandedCat] = useState<string | null>(null);

  // Load saved config
  useEffect(() => {
    fetch("/api/theme")
      .then((r) => r.json())
      .then((d) => {
        const saved = d.theme?.config?.quick_tools;
        if (Array.isArray(saved) && saved.length > 0) {
          setCategories(saved);
        }
      })
      .catch(() => {});
  }, []);

  const toggleCategory = useCallback((catId: string) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === catId ? { ...c, visible: !c.visible } : c))
    );
  }, []);

  const toggleTool = useCallback((catId: string, toolId: string) => {
    setCategories((prev) =>
      prev.map((c) =>
        c.id === catId
          ? {
              ...c,
              tools: c.tools.map((t) =>
                t.id === toolId ? { ...t, visible: !t.visible } : t
              ),
            }
          : c
      )
    );
  }, []);

  const moveCategory = useCallback((idx: number, dir: -1 | 1) => {
    const to = idx + dir;
    setCategories((prev) => {
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[to]] = [next[to], next[idx]];
      return next;
    });
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch("/api/theme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slot: 1,
          theme_name: "Custom Theme",
          config: { quick_tools: categories },
          set_active: true,
        }),
      });
      if (res.ok) {
        setMsg("Saved!");
      } else {
        const d = await res.json();
        setMsg(d.error || "Error saving");
      }
    } catch {
      setMsg("Error saving");
    }
    setSaving(false);
    setTimeout(() => setMsg(""), 2000);
  }, [categories]);

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto" style={{ background: "#FFFCF7" }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h2 className="text-lg font-bold" style={{ color: "#2D2620" }}>
            Quick Tools
          </h2>
          <p className="text-xs mt-1" style={{ color: "#A8967E" }}>
            Choose which tools and categories appear in your dashboard.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {msg && (
            <span
              className="text-xs font-medium"
              style={{ color: msg === "Saved!" ? "#16A34A" : "#DC2626" }}
            >
              {msg}
            </span>
          )}
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white w-full sm:w-auto justify-center"
            style={{ background: "#F59E0B" }}
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {/* Categories */}
      <div className="space-y-2">
        {categories.map((cat, idx) => {
          const isExpanded = expandedCat === cat.id;
          const visibleCount = cat.tools.filter((t) => t.visible).length;

          return (
            <div
              key={cat.id}
              className="rounded-xl border overflow-hidden"
              style={{
                borderColor: cat.visible ? "rgba(200,180,150,0.3)" : "rgba(200,180,150,0.15)",
                background: cat.visible ? "#FFFFFF" : "#FAFAF8",
                opacity: cat.visible ? 1 : 0.6,
              }}
            >
              {/* Category header */}
              <div className="flex items-center gap-2 p-3 md:p-4">
                {/* Reorder buttons */}
                <div className="flex flex-col gap-0.5 shrink-0">
                  <button
                    onClick={() => moveCategory(idx, -1)}
                    disabled={idx === 0}
                    className="p-0.5 rounded hover:bg-amber-50 disabled:opacity-30"
                  >
                    <ArrowUp className="w-3 h-3" style={{ color: "#A8967E" }} />
                  </button>
                  <button
                    onClick={() => moveCategory(idx, 1)}
                    disabled={idx === categories.length - 1}
                    className="p-0.5 rounded hover:bg-amber-50 disabled:opacity-30"
                  >
                    <ArrowDown className="w-3 h-3" style={{ color: "#A8967E" }} />
                  </button>
                </div>

                {/* Icon */}
                <span className="text-lg shrink-0">{cat.icon}</span>

                {/* Label + expand */}
                <button
                  onClick={() => setExpandedCat(isExpanded ? null : cat.id)}
                  className="flex-1 flex items-center gap-2 text-left"
                >
                  <span className="text-sm font-semibold" style={{ color: "#2D2620" }}>
                    {cat.label}
                  </span>
                  <span className="text-xs" style={{ color: "#C4AA8A" }}>
                    {visibleCount}/{cat.tools.length}
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 ml-auto" style={{ color: "#A8967E" }} />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 ml-auto" style={{ color: "#A8967E" }} />
                  )}
                </button>

                {/* Category toggle */}
                <button
                  onClick={() => toggleCategory(cat.id)}
                  className="p-1.5 rounded-lg hover:bg-amber-50 shrink-0"
                  title={cat.visible ? "Hide category" : "Show category"}
                >
                  {cat.visible ? (
                    <Eye className="w-4 h-4" style={{ color: "#F59E0B" }} />
                  ) : (
                    <EyeOff className="w-4 h-4" style={{ color: "#C4AA8A" }} />
                  )}
                </button>
              </div>

              {/* Tools list */}
              {isExpanded && (
                <div
                  className="px-3 md:px-4 pb-3 md:pb-4 border-t space-y-1.5"
                  style={{ borderColor: "rgba(200,180,150,0.15)" }}
                >
                  <div className="pt-2" />
                  {cat.tools.map((tool) => (
                    <div
                      key={tool.id}
                      className="flex items-center justify-between py-1.5 px-2 rounded-lg"
                      style={{ background: tool.visible ? "transparent" : "#FAFAF8" }}
                    >
                      <span
                        className="text-xs"
                        style={{
                          color: tool.visible ? "#2D2620" : "#C4AA8A",
                        }}
                      >
                        {tool.label}
                      </span>
                      <button
                        onClick={() => toggleTool(cat.id, tool.id)}
                        className="relative w-9 h-4.5 rounded-full transition-colors"
                        style={{
                          background: tool.visible ? "#F59E0B" : "#D1C8BE",
                          width: 36,
                          height: 20,
                        }}
                      >
                        <div
                          className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform"
                          style={{ left: tool.visible ? "calc(100% - 18px)" : "2px" }}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
