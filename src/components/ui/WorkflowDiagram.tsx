"use client";

import { useRef } from "react";
import { Download, GitBranch } from "lucide-react";

interface FlowNode {
  id: string;
  label: string;
  sublabel?: string;
  type: "start" | "end" | "process" | "phase" | "decision";
}

function parseFlowNodes(text: string): FlowNode[] {
  const nodes: FlowNode[] = [];
  const lines = text.split("\n");

  for (const line of lines) {
    const t = line.trim();
    if (!t || t.length > 120) continue;

    // Numbered step: "1. Title" or "**1.** Title" or "1) Title"
    const numMatch = t.match(/^(?:\*{0,2})(\d+)[.)]\s+\*{0,2}([^*\n]+?)\*{0,2}$/);
    if (numMatch) {
      const label = numMatch[2].replace(/\*+/g, "").trim();
      if (label.length > 2 && label.length < 90) {
        nodes.push({ id: `step-${numMatch[1]}`, label, type: "process" });
        continue;
      }
    }

    // Phase header: "**Phase 1: Title**" or "## Phase 1: Title"
    const phaseMatch = t.match(
      /^(?:##+\s*|\*{1,2}\s*)(?:Phase|Faza|Etapa|Pasul|Step|Stage)\s*(\d+)[:\s-]+([^*#\n]+?)(?:\*{1,2})?$/i
    );
    if (phaseMatch) {
      const label = phaseMatch[2].replace(/\*+|#+/g, "").trim();
      if (label) {
        nodes.push({
          id: `phase-${phaseMatch[1]}`,
          label: `Phase ${phaseMatch[1]}: ${label}`,
          type: "phase",
        });
        continue;
      }
    }

    // ## Heading (max 10 headings)
    const headingMatch = t.match(/^##\s+(.+)$/);
    if (headingMatch) {
      const label = headingMatch[1].replace(/\*+/g, "").trim();
      if (label.length > 2 && label.length < 70) {
        nodes.push({ id: `h-${nodes.length}`, label, type: "phase" });
        continue;
      }
    }

    // Bold standalone line: "**Title**" or "**Title:**"
    const boldMatch = t.match(/^\*\*([^*]{4,60}?)\*\*[:\s]*$/);
    if (boldMatch && nodes.length < 12) {
      const label = boldMatch[1].trim();
      if (!label.includes("http") && !label.match(/^\d+$/)) {
        nodes.push({ id: `bold-${nodes.length}`, label, type: "phase" });
      }
    }
  }

  // Remove duplicates by label similarity, limit to 12
  const seen = new Set<string>();
  return nodes.filter((n) => {
    const key = n.label.slice(0, 20).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 12);
}

// Diagram constants
const NODE_W = 290;
const NODE_H = 62;
const PAD_X = 55;
const PAD_Y = 44;
const ARROW_H = 42;
const STEP_H = NODE_H + ARROW_H;

export default function WorkflowDiagram({
  text,
  agentName,
}: {
  text: string;
  agentName: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const rawNodes = parseFlowNodes(text);

  const nodes: FlowNode[] = [
    { id: "start", label: "START", type: "start" },
    ...rawNodes,
    { id: "end", label: "COMPLETE", type: "end" },
  ];

  const svgW = NODE_W + PAD_X * 2;
  const svgH = PAD_Y * 2 + nodes.length * NODE_H + (nodes.length - 1) * ARROW_H;
  const cx = PAD_X + NODE_W / 2;
  const nodeY = (i: number) => PAD_Y + i * STEP_H;

  const exportPNG = () => {
    const svg = svgRef.current;
    if (!svg) return;
    const serialized = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const scale = 3;
    canvas.width = svgW * scale;
    canvas.height = svgH * scale;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const a = document.createElement("a");
      a.download = `workflow-${agentName.toLowerCase().replace(/\s+/g, "-")}.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
    };
    img.src =
      "data:image/svg+xml;base64," +
      btoa(unescape(encodeURIComponent(serialized)));
  };

  if (rawNodes.length === 0) {
    return (
      <div className="text-center py-12">
        <GitBranch className="w-10 h-10 mx-auto mb-3" style={{ color: "#C4AA8A" }} />
        <p className="text-sm font-medium text-[#78614E] mb-1">
          No workflow structure detected
        </p>
        <p className="text-xs text-[#C4AA8A] max-w-xs mx-auto">
          Ask the agent for a step-by-step strategy, action plan, or numbered process to generate a diagram.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-[#292524]">Workflow Diagram</h3>
          <p className="text-xs text-[#A8967E]">
            {agentName} · {rawNodes.length} steps detected
          </p>
        </div>
        <button
          onClick={exportPNG}
          className="btn-3d-active flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-lg transition-all hover:opacity-90 active:scale-95"
        >
          <Download className="w-3.5 h-3.5" />
          Export PNG
        </button>
      </div>

      {/* SVG Diagram */}
      <div
        className="overflow-auto rounded-xl border"
        style={{ borderColor: "rgba(245,215,160,0.35)", backgroundColor: "#FAFAF7" }}
      >
        <svg
          ref={svgRef}
          width={svgW}
          height={svgH}
          viewBox={`0 0 ${svgW} ${svgH}`}
          xmlns="http://www.w3.org/2000/svg"
          style={{ display: "block" }}
        >
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L9,3 z" fill="var(--color-primary)" />
            </marker>
            <filter id="shadow" x="-10%" y="-10%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="5" floodColor="#78614E" floodOpacity="0.1" />
            </filter>
            <linearGradient id="startGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--color-primary)" />
              <stop offset="100%" stopColor="var(--color-primary-hover)" />
            </linearGradient>
            <linearGradient id="endGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6B5240" />
              <stop offset="100%" stopColor="#4A3728" />
            </linearGradient>
            <linearGradient id="phaseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFBF0" />
              <stop offset="100%" stopColor="#FFF3D6" />
            </linearGradient>
          </defs>

          {/* Background */}
          <rect width={svgW} height={svgH} fill="#FAFAF7" />

          {/* Center guide line (dashed) */}
          <line
            x1={cx}
            y1={PAD_Y + NODE_H}
            x2={cx}
            y2={svgH - PAD_Y - NODE_H}
            stroke="#F5D7A0"
            strokeWidth={1.5}
            strokeDasharray="5 8"
          />

          {/* Arrows */}
          {nodes.slice(0, -1).map((_, i) => {
            const y1 = nodeY(i) + NODE_H;
            const y2 = nodeY(i + 1);
            const midY = (y1 + y2) / 2;
            return (
              <g key={`arrow-${i}`}>
                <line
                  x1={cx}
                  y1={y1 + 5}
                  x2={cx}
                  y2={y2 - 6}
                  stroke="var(--color-primary)"
                  strokeWidth={2}
                  markerEnd="url(#arrowhead)"
                />
                <circle cx={cx} cy={midY} r={3.5} fill="#F5D7A0" />
              </g>
            );
          })}

          {/* Nodes */}
          {nodes.map((node, i) => {
            const y = nodeY(i);
            const isStart = node.type === "start";
            const isEnd = node.type === "end";
            const isPhase = node.type === "phase";
            const isProcess = node.type === "process";

            const fill = isStart
              ? "url(#startGrad)"
              : isEnd
              ? "url(#endGrad)"
              : isPhase
              ? "url(#phaseGrad)"
              : "#FFFFFF";

            const stroke =
              isStart || isEnd
                ? "none"
                : isPhase
                ? "var(--color-primary)"
                : "#F0E0C0";

            const strokeW = isPhase ? 2 : 1;
            const rx = isStart || isEnd ? 31 : 12;
            const textFill =
              isStart || isEnd
                ? "#FFFFFF"
                : isPhase
                ? "#C07A00"
                : "var(--color-text)";
            const fontSize = isStart || isEnd ? 13 : 12;
            const fontWeight = isStart || isEnd || isPhase ? "bold" : "500";

            const maxChars = isProcess ? 30 : 34;
            const label =
              node.label.length > maxChars
                ? node.label.slice(0, maxChars - 1) + "…"
                : node.label;

            const textX = isProcess
              ? PAD_X + 50
              : isPhase
              ? PAD_X + 36
              : cx;

            return (
              <g key={node.id} filter="url(#shadow)">
                <rect
                  x={PAD_X}
                  y={y}
                  width={NODE_W}
                  height={NODE_H}
                  rx={rx}
                  ry={rx}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={strokeW}
                />

                {/* Left accent bar for process nodes */}
                {isProcess && (
                  <rect
                    x={PAD_X}
                    y={y + 12}
                    width={4}
                    height={NODE_H - 24}
                    rx={2}
                    fill="var(--color-primary)"
                  />
                )}

                {/* Step number badge */}
                {isProcess && (
                  <g>
                    <circle cx={PAD_X + 28} cy={y + NODE_H / 2} r={15} fill="#FFF0CC" />
                    <text
                      x={PAD_X + 28}
                      y={y + NODE_H / 2 + 5}
                      textAnchor="middle"
                      fontSize={11}
                      fontWeight="bold"
                      fill="var(--color-primary-hover)"
                      fontFamily="system-ui, sans-serif"
                    >
                      {i}
                    </text>
                  </g>
                )}

                {/* Diamond icon for phase */}
                {isPhase && (
                  <text
                    x={PAD_X + 18}
                    y={y + NODE_H / 2 + 5}
                    textAnchor="middle"
                    fontSize={13}
                    fill="var(--color-primary)"
                    fontFamily="system-ui, sans-serif"
                  >
                    ◆
                  </text>
                )}

                {/* Label */}
                <text
                  x={textX}
                  y={y + NODE_H / 2 + 5}
                  textAnchor={isProcess || isPhase ? "start" : "middle"}
                  fontSize={fontSize}
                  fontWeight={fontWeight}
                  fill={textFill}
                  fontFamily="system-ui, -apple-system, sans-serif"
                >
                  {label}
                </text>
              </g>
            );
          })}

          {/* Watermark */}
          <text
            x={svgW - 12}
            y={svgH - 10}
            textAnchor="end"
            fontSize={8}
            fill="#C4AA8A"
            fontFamily="system-ui, sans-serif"
          >
            MarketHub Pro
          </text>
        </svg>
      </div>
    </div>
  );
}
