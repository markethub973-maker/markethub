"use client";

import { ArrowUpRight } from "lucide-react";

interface Rec {
  action: string;
  why: string;
  priority: "high" | "medium" | "low";
  tool: string;
  app_path: string;
  estimated_hours?: number;
}

export default function BrainActionList({
  recs,
  advisorError,
}: {
  recs: Rec[];
  advisorError?: string;
}) {
  if (advisorError) {
    return (
      <div
        className="p-4 rounded-xl text-sm"
        style={{
          backgroundColor: "#1A1A24",
          border: "1px solid rgba(248,113,113,0.3)",
          color: "#F87171",
        }}
      >
        Brain advisor error: {advisorError}
      </div>
    );
  }
  if (!recs.length) {
    return (
      <div
        className="p-4 rounded-xl text-sm"
        style={{ backgroundColor: "#1A1A24", border: "1px solid rgba(255,255,255,0.08)", color: "#888" }}
      >
        No recommendations yet — Brain needs state data first.
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {recs.map((r, i) => {
        const col =
          r.priority === "high" ? "#EF4444" : r.priority === "medium" ? "#F59E0B" : "#10B981";
        return (
          <div
            key={i}
            className="p-4 rounded-xl flex items-start gap-4"
            style={{
              backgroundColor: "#1A1A24",
              borderLeft: `3px solid ${col}`,
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div className="flex-1">
              <p className="font-semibold text-sm mb-1">{r.action}</p>
              <p className="text-xs mb-2" style={{ color: "#aaa" }}>
                <span style={{ color: col, fontWeight: 600 }}>{r.priority.toUpperCase()}</span>
                {r.estimated_hours ? ` · ${r.estimated_hours}h` : ""} · {r.tool}
              </p>
              <p className="text-xs" style={{ color: "#bbb", lineHeight: 1.55 }}>
                {r.why}
              </p>
            </div>
            {r.app_path && (
              <a
                href={`https://markethubpromo.com${r.app_path}`}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md"
                style={{
                  backgroundColor: "rgba(245,158,11,0.15)",
                  color: "#F59E0B",
                  border: "1px solid rgba(245,158,11,0.3)",
                }}
              >
                Execute <ArrowUpRight className="w-3 h-3" />
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
}
