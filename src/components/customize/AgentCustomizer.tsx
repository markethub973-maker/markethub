"use client";

/**
 * Agent Customizer — Tab "Agents" (Pro+ plan only).
 * Customize agent names, icons, colors, enable/disable, and reorder.
 * Saves to user_brain_profiles.custom_prefs.agents via /api/theme.
 */

import { useState, useCallback, useEffect } from "react";
import { Save, GripVertical, ChevronDown, ChevronRight } from "lucide-react";

interface AgentConfig {
  id: string;
  label: string;
  name: string;
  icon: string;
  color: string;
  enabled: boolean;
}

const EMOJI_OPTIONS = [
  "🤖", "🧠", "📊", "📈", "🎯", "🔍", "✍️", "📣", "💡", "🚀",
  "⚡", "🎨", "📝", "🔔", "🛡️", "🌟", "💬", "📅", "🏆", "🔥",
];

const DEFAULT_AGENTS: AgentConfig[] = [
  { id: "campaign", label: "Campaign Manager", name: "Campaign Manager", icon: "🎯", color: "#F59E0B", enabled: true },
  { id: "research", label: "Research Analyst", name: "Research Analyst", icon: "🔍", color: "#3B82F6", enabled: true },
  { id: "content", label: "Content Creator", name: "Content Creator", icon: "✍️", color: "#10B981", enabled: true },
  { id: "analytics", label: "Analytics Expert", name: "Analytics Expert", icon: "📊", color: "#8B5CF6", enabled: true },
  { id: "client", label: "Client Manager", name: "Client Manager", icon: "💬", color: "#EC4899", enabled: true },
];

export default function AgentCustomizer() {
  const [agents, setAgents] = useState<AgentConfig[]>(DEFAULT_AGENTS);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [emojiPickerOpen, setEmojiPickerOpen] = useState<string | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  // Load saved agents
  useEffect(() => {
    fetch("/api/theme")
      .then((r) => r.json())
      .then((d) => {
        const saved = d.theme?.config?.agents;
        if (Array.isArray(saved) && saved.length > 0) {
          setAgents(saved);
        }
      })
      .catch(() => {});
  }, []);

  const updateAgent = useCallback((id: string, partial: Partial<AgentConfig>) => {
    setAgents((prev) => prev.map((a) => (a.id === id ? { ...a, ...partial } : a)));
  }, []);

  const moveAgent = useCallback((from: number, to: number) => {
    if (to < 0 || to >= agents.length) return;
    setAgents((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }, [agents.length]);

  const handleDragStart = (idx: number) => setDragIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx !== null && dragIdx !== idx) {
      moveAgent(dragIdx, idx);
      setDragIdx(idx);
    }
  };
  const handleDragEnd = () => setDragIdx(null);

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
          config: { agents },
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
  }, [agents]);

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto" style={{ background: "#FFFCF7" }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h2 className="text-lg font-bold" style={{ color: "#2D2620" }}>
            Agent Customization
          </h2>
          <p className="text-xs mt-1" style={{ color: "#A8967E" }}>
            Personalize your AI agents — names, icons, colors, and order.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {msg && (
            <span className="text-xs font-medium" style={{ color: msg === "Saved!" ? "#16A34A" : "#DC2626" }}>
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

      {/* Agent list */}
      <div className="space-y-3">
        {agents.map((agent, idx) => (
          <div
            key={agent.id}
            draggable
            onDragStart={() => handleDragStart(idx)}
            onDragOver={(e) => handleDragOver(e, idx)}
            onDragEnd={handleDragEnd}
            className="rounded-xl border p-3 md:p-4 transition-all"
            style={{
              borderColor: agent.enabled ? "rgba(200,180,150,0.3)" : "rgba(200,180,150,0.15)",
              background: agent.enabled ? "#FFFFFF" : "#FAFAF8",
              opacity: agent.enabled ? 1 : 0.6,
              boxShadow: dragIdx === idx ? "0 4px 12px rgba(120,97,78,0.15)" : "none",
            }}
          >
            <div className="flex items-start gap-3">
              {/* Drag handle */}
              <div className="pt-2 cursor-grab active:cursor-grabbing shrink-0">
                <GripVertical className="w-4 h-4" style={{ color: "#C4AA8A" }} />
              </div>

              {/* Icon selector */}
              <div className="relative shrink-0">
                <button
                  onClick={() => setEmojiPickerOpen(emojiPickerOpen === agent.id ? null : agent.id)}
                  className="w-10 h-10 rounded-xl border flex items-center justify-center text-lg hover:scale-105 transition-transform"
                  style={{ borderColor: agent.color + "40", background: agent.color + "15" }}
                >
                  {agent.icon}
                </button>
                {emojiPickerOpen === agent.id && (
                  <div
                    className="absolute top-12 left-0 z-50 p-2 rounded-xl border shadow-lg grid grid-cols-5 gap-1"
                    style={{ background: "#FFFFFF", borderColor: "rgba(200,180,150,0.3)" }}
                  >
                    {EMOJI_OPTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => {
                          updateAgent(agent.id, { icon: emoji });
                          setEmojiPickerOpen(null);
                        }}
                        className="w-8 h-8 rounded-lg hover:bg-amber-50 flex items-center justify-center text-base"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Name + controls */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                  <input
                    type="text"
                    value={agent.name}
                    onChange={(e) => updateAgent(agent.id, { name: e.target.value })}
                    className="flex-1 px-3 py-1.5 text-sm font-medium rounded-lg border"
                    style={{ borderColor: "rgba(200,180,150,0.3)", color: "#2D2620", background: "#FFFCF7" }}
                    placeholder="Agent name"
                  />
                  <div className="flex items-center gap-2">
                    {/* Color picker */}
                    <input
                      type="color"
                      value={agent.color}
                      onChange={(e) => updateAgent(agent.id, { color: e.target.value })}
                      className="w-8 h-8 rounded-lg border cursor-pointer shrink-0"
                      style={{ borderColor: "rgba(200,180,150,0.3)" }}
                      title="Agent color"
                    />
                    {/* Toggle */}
                    <button
                      onClick={() => updateAgent(agent.id, { enabled: !agent.enabled })}
                      className="relative w-10 h-5 rounded-full transition-colors shrink-0"
                      style={{ background: agent.enabled ? "#F59E0B" : "#D1C8BE" }}
                    >
                      <div
                        className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform"
                        style={{ left: agent.enabled ? "calc(100% - 18px)" : "2px" }}
                      />
                    </button>
                  </div>
                </div>
                <span className="text-xs" style={{ color: "#A8967E" }}>
                  Default: {agent.label}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Hint */}
      <p className="text-xs mt-4 text-center" style={{ color: "#C4AA8A" }}>
        Drag agents to reorder. Changes apply after saving.
      </p>
    </div>
  );
}
