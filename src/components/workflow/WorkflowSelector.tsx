"use client";

import { useState } from "react";
import { Play, Loader2 } from "lucide-react";
import {
  AGENT_DEFINITIONS,
  MODE_DEFINITIONS,
  type AgentType,
  type WorkflowMode,
} from "@/lib/workflow-engine";

interface WorkflowSelectorProps {
  onStart: (agentType: AgentType, mode: WorkflowMode) => Promise<void>;
  loading?: boolean;
}

const AGENT_KEYS: AgentType[] = ["campaign", "research", "content", "analytics", "client"];
const MODE_KEYS: WorkflowMode[] = ["auto", "semi", "guided"];

export default function WorkflowSelector({ onStart, loading }: WorkflowSelectorProps) {
  const [selectedAgent, setSelectedAgent] = useState<AgentType | null>(null);
  const [selectedMode, setSelectedMode] = useState<WorkflowMode | null>(null);

  const canStart = selectedAgent && selectedMode && !loading;

  return (
    <div className="space-y-6">
      {/* Agent Selection */}
      <div>
        <h3
          className="text-xs font-bold uppercase tracking-widest mb-3"
          style={{ color: "#A8967E", letterSpacing: 2 }}
        >
          Choose an Agent
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {AGENT_KEYS.map((key) => {
            const def = AGENT_DEFINITIONS[key];
            const isSelected = selectedAgent === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedAgent(key)}
                className="text-left p-4 rounded-xl transition-all"
                style={{
                  backgroundColor: isSelected ? "rgba(245,158,11,0.08)" : "white",
                  border: `2px solid ${isSelected ? def.color : "rgba(245,215,160,0.3)"}`,
                  boxShadow: isSelected ? `0 0 0 1px ${def.color}40` : "none",
                }}
              >
                <div className="text-2xl mb-2">{def.icon}</div>
                <div className="text-sm font-bold mb-1" style={{ color: "var(--color-text)" }}>
                  {def.name}
                </div>
                <p className="text-xs leading-relaxed" style={{ color: "#78614E" }}>
                  {def.description}
                </p>
                <div className="mt-2">
                  <span
                    className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold"
                    style={{ backgroundColor: `${def.color}15`, color: def.color, fontSize: 10 }}
                  >
                    {def.steps.length} steps
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mode Selection */}
      <div>
        <h3
          className="text-xs font-bold uppercase tracking-widest mb-3"
          style={{ color: "#A8967E", letterSpacing: 2 }}
        >
          Choose a Mode
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {MODE_KEYS.map((key) => {
            const def = MODE_DEFINITIONS[key];
            const isSelected = selectedMode === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedMode(key)}
                className="text-left p-4 rounded-xl transition-all"
                style={{
                  backgroundColor: isSelected ? "rgba(245,158,11,0.08)" : "white",
                  border: `2px solid ${isSelected ? "#F59E0B" : "rgba(245,215,160,0.3)"}`,
                  boxShadow: isSelected ? "0 0 0 1px rgba(245,158,11,0.4)" : "none",
                }}
              >
                <div className="text-2xl mb-2">{def.icon}</div>
                <div className="text-sm font-bold mb-1" style={{ color: "var(--color-text)" }}>
                  {def.name}
                </div>
                <p className="text-xs leading-relaxed" style={{ color: "#78614E" }}>
                  {def.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Summary + Start Button */}
      {selectedAgent && selectedMode && (
        <div
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl"
          style={{ backgroundColor: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)" }}
        >
          <div>
            <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
              {AGENT_DEFINITIONS[selectedAgent].icon}{" "}
              {AGENT_DEFINITIONS[selectedAgent].name}{" "}
              <span style={{ color: "#A8967E", fontWeight: 400 }}>in</span>{" "}
              {MODE_DEFINITIONS[selectedMode].icon}{" "}
              {MODE_DEFINITIONS[selectedMode].name} mode
            </p>
            <p className="text-xs mt-0.5" style={{ color: "#78614E" }}>
              {AGENT_DEFINITIONS[selectedAgent].steps.length} steps will be executed{" "}
              {selectedMode === "auto"
                ? "automatically"
                : selectedMode === "semi"
                  ? "with your approval at each step"
                  : "with your guidance at each step"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => canStart && onStart(selectedAgent, selectedMode)}
            disabled={!canStart}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-colors"
            style={{
              backgroundColor: canStart ? "#F59E0B" : "#C4AA8A",
              color: "#1C1814",
              cursor: canStart ? "pointer" : "not-allowed",
            }}
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Play size={16} />
            )}
            {loading ? "Starting..." : "Start Workflow"}
          </button>
        </div>
      )}
    </div>
  );
}
