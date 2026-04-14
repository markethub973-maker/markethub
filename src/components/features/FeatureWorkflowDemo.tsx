"use client";

/**
 * FeatureWorkflowDemo — animated CSS-only visual explainer of a feature's
 * input → AI → output workflow. Replaces the static screenshot fallback.
 *
 * 6 reusable animation patterns:
 *   prompt-to-image      — text prompt typing → AI sparkles → image card
 *   text-to-many         — single caption → 5 platform cards fan out
 *   text-vs-text         — two drafts duel → winner glows
 *   list-to-buckets      — list of items → sorted into colored buckets
 *   voice-clone          — 1 sample waveform → repeating new waveforms in same voice
 *   video-to-text        — video frame → transcript lines + caption cards
 *
 * Each demo loops infinitely (~6-10s cycles), keeping the page alive
 * without external assets.
 */

import {
  Sparkles, Image as ImageIcon, Instagram, Linkedin, Twitter, Youtube,
  Mic, Trophy, Hash, TrendingUp, AlertTriangle, Repeat, ShieldCheck,
  Music2, FileText, Shuffle,
} from "lucide-react";

export type DemoKind =
  | "prompt-to-image"
  | "text-to-many"
  | "text-vs-text"
  | "list-to-buckets"
  | "voice-clone"
  | "video-to-text";

interface Props {
  kind: DemoKind;
  accent?: string;        // hex color for accent (defaults to amber)
}

const DEFAULT_ACCENT = "#F59E0B";

export default function FeatureWorkflowDemo({ kind, accent = DEFAULT_ACCENT }: Props) {
  return (
    <div
      className="rounded-2xl overflow-hidden aspect-square relative flex items-center justify-center"
      style={{
        background: "linear-gradient(135deg, rgba(245,158,11,0.06), rgba(139,92,246,0.06))",
        border: "1px solid rgba(245,158,11,0.2)",
      }}
    >
      <style jsx>{`
        @keyframes mhTypeIn {
          0%, 5% { width: 0%; }
          25%, 95% { width: 100%; }
          100% { width: 100%; }
        }
        @keyframes mhFadeUp {
          0%, 30% { opacity: 0; transform: translateY(20px) scale(0.95); }
          50%, 90% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(-10px) scale(0.95); }
        }
        @keyframes mhPulse {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.15); opacity: 1; }
        }
        @keyframes mhSparkleSpin {
          0% { transform: rotate(0deg) scale(0.8); opacity: 0; }
          15% { opacity: 1; }
          50% { transform: rotate(180deg) scale(1.2); opacity: 1; }
          85% { opacity: 1; }
          100% { transform: rotate(360deg) scale(0.8); opacity: 0; }
        }
        @keyframes mhFanOut {
          0%, 25% { opacity: 0; transform: translate(0, 0) rotate(0deg); }
          50% { opacity: 1; transform: var(--fan-target); }
          85% { opacity: 1; transform: var(--fan-target); }
          100% { opacity: 0; transform: translate(0, 0) rotate(0deg); }
        }
        @keyframes mhWaveScale {
          0%, 100% { transform: scaleY(0.3); }
          50% { transform: scaleY(1); }
        }
        @keyframes mhFlow {
          0% { stroke-dashoffset: 100; opacity: 0; }
          25% { opacity: 1; }
          75% { opacity: 1; }
          100% { stroke-dashoffset: 0; opacity: 0; }
        }
        @keyframes mhGlow {
          0%, 30% { box-shadow: 0 0 0 0 rgba(245,158,11,0); }
          50%, 80% { box-shadow: 0 0 30px 4px rgba(245,158,11,0.5); }
          100% { box-shadow: 0 0 0 0 rgba(245,158,11,0); }
        }
        @keyframes mhSlideRight {
          0%, 30% { opacity: 0; transform: translateX(-30px); }
          50%, 90% { opacity: 1; transform: translateX(0); }
          100% { opacity: 0; transform: translateX(20px); }
        }
      `}</style>

      {kind === "prompt-to-image" && <PromptToImage accent={accent} />}
      {kind === "text-to-many" && <TextToMany accent={accent} />}
      {kind === "text-vs-text" && <TextVsText accent={accent} />}
      {kind === "list-to-buckets" && <ListToBuckets accent={accent} />}
      {kind === "voice-clone" && <VoiceClone accent={accent} />}
      {kind === "video-to-text" && <VideoToText accent={accent} />}
    </div>
  );
}

// ── Pattern 1: prompt-to-image ─────────────────────────────────────────────
function PromptToImage({ accent }: { accent: string }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center px-8 gap-4">
      {/* Prompt typing */}
      <div
        className="w-full max-w-xs rounded-lg px-3 py-2 text-xs font-mono overflow-hidden whitespace-nowrap"
        style={{ backgroundColor: "white", border: "1px solid rgba(0,0,0,0.08)", color: "#292524" }}
      >
        <span className="opacity-50">prompt:</span>{" "}
        <span
          className="inline-block overflow-hidden align-bottom"
          style={{ animation: "mhTypeIn 6s infinite ease-in-out" }}
        >
          coworking space at golden hour
        </span>
      </div>

      {/* Arrow with sparkles */}
      <div className="relative" style={{ animation: "mhPulse 6s infinite" }}>
        <Sparkles className="w-8 h-8" style={{ color: accent }} />
        <Sparkles
          className="w-3 h-3 absolute -top-1 -right-2"
          style={{ color: accent, animation: "mhSparkleSpin 6s infinite" }}
        />
      </div>

      {/* Generated image card */}
      <div
        className="w-32 h-32 rounded-xl flex items-center justify-center"
        style={{
          background: `linear-gradient(135deg, ${accent}66, ${accent}22)`,
          animation: "mhFadeUp 6s infinite ease-in-out",
          border: `2px solid ${accent}`,
        }}
      >
        <ImageIcon className="w-10 h-10" style={{ color: "white" }} />
      </div>
    </div>
  );
}

// ── Pattern 2: text-to-many (repurpose / video-caption) ────────────────────
function TextToMany({ accent }: { accent: string }) {
  const targets = [
    { Icon: Instagram, color: "#E1306C", target: "translate(-90px, 30px) rotate(-15deg)" },
    { Icon: Linkedin,  color: "#0A66C2", target: "translate(-30px, 60px) rotate(-5deg)" },
    { Icon: Twitter,   color: "#1DA1F2", target: "translate(30px, 60px) rotate(5deg)" },
    { Icon: Youtube,   color: "#FF0000", target: "translate(90px, 30px) rotate(15deg)" },
    { Icon: Music2,    color: "#000000", target: "translate(0, 80px)" },
  ];
  return (
    <div className="w-full h-full flex flex-col items-center justify-center px-4 gap-4 relative">
      {/* Source caption */}
      <div
        className="rounded-lg px-3 py-2 text-xs"
        style={{ backgroundColor: "white", border: `2px solid ${accent}`, color: "#292524" }}
      >
        Original caption
      </div>
      <Shuffle className="w-6 h-6" style={{ color: accent, animation: "mhPulse 5s infinite" }} />
      {/* Fan-out targets */}
      <div className="relative w-full h-32 flex items-center justify-center">
        {targets.map(({ Icon, color, target }, i) => (
          <div
            key={i}
            className="absolute w-12 h-12 rounded-lg flex items-center justify-center"
            style={{
              backgroundColor: color,
              animation: `mhFanOut 5s infinite ease-in-out`,
              animationDelay: `${i * 0.15}s`,
              ["--fan-target" as string]: target,
            }}
          >
            <Icon className="w-5 h-5" style={{ color: "white" }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Pattern 3: text-vs-text (A/B winner) ───────────────────────────────────
function TextVsText({ accent }: { accent: string }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center px-6 gap-3">
      <div className="flex gap-3 items-center">
        <div
          className="rounded-lg px-3 py-3 text-xs flex-1 text-center"
          style={{ backgroundColor: "white", border: "1px solid rgba(0,0,0,0.1)", color: "#78614E" }}
        >
          Draft A
          <div className="h-1 mt-1 rounded" style={{ backgroundColor: "rgba(0,0,0,0.1)" }}>
            <div className="h-1 rounded" style={{ width: "62%", backgroundColor: "#A8967E" }} />
          </div>
        </div>
        <span className="text-xs font-bold" style={{ color: accent }}>vs</span>
        <div
          className="rounded-lg px-3 py-3 text-xs flex-1 text-center font-bold"
          style={{ backgroundColor: "white", border: `2px solid ${accent}`, color: "#292524", animation: "mhGlow 4s infinite" }}
        >
          Draft B
          <div className="h-1 mt-1 rounded" style={{ backgroundColor: "rgba(0,0,0,0.1)" }}>
            <div className="h-1 rounded" style={{ width: "85%", background: `linear-gradient(90deg, ${accent}, #D97706)` }} />
          </div>
        </div>
      </div>
      <Trophy
        className="w-10 h-10"
        style={{ color: accent, animation: "mhFadeUp 4s infinite ease-in-out" }}
      />
      <p className="text-[10px] font-bold" style={{ color: accent }}>WINNER · 85% confidence</p>
    </div>
  );
}

// ── Pattern 4: list-to-buckets (hashtag scan) ──────────────────────────────
function ListToBuckets({ accent }: { accent: string }) {
  const buckets = [
    { Icon: TrendingUp,    label: "rising",    color: "#10B981" },
    { Icon: ShieldCheck,   label: "safe",      color: "#0EA5E9" },
    { Icon: AlertTriangle, label: "saturated", color: "#EF4444" },
  ];
  void accent;
  return (
    <div className="w-full h-full flex flex-col items-center justify-center px-4 gap-3">
      <div className="flex flex-wrap gap-1.5 justify-center max-w-xs">
        {["#aitools", "#growth", "#marketing", "#fyp", "#love"].map((h, i) => (
          <span
            key={h}
            className="text-[10px] px-2 py-0.5 rounded font-mono"
            style={{
              backgroundColor: "white",
              border: "1px solid rgba(0,0,0,0.1)",
              color: "#292524",
              animation: "mhSlideRight 5s infinite",
              animationDelay: `${i * 0.2}s`,
            }}
          >
            {h}
          </span>
        ))}
      </div>
      <Hash className="w-6 h-6" style={{ color: "#F59E0B", animation: "mhPulse 5s infinite" }} />
      <div className="grid grid-cols-3 gap-2 w-full max-w-xs">
        {buckets.map(({ Icon, label, color }, i) => (
          <div
            key={label}
            className="rounded-lg p-2 text-center"
            style={{
              backgroundColor: `${color}1A`,
              border: `1px solid ${color}66`,
              animation: "mhFadeUp 5s infinite ease-in-out",
              animationDelay: `${i * 0.25}s`,
            }}
          >
            <Icon className="w-4 h-4 mx-auto" style={{ color }} />
            <p className="text-[9px] font-bold mt-1" style={{ color }}>{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Pattern 5: voice-clone ─────────────────────────────────────────────────
function VoiceClone({ accent }: { accent: string }) {
  // Render two waveforms — sample (top) and clones (bottom, multiple)
  const bars = Array.from({ length: 18 });
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-3 px-6">
      <div className="text-center">
        <Mic className="w-7 h-7 mx-auto" style={{ color: accent, animation: "mhPulse 4s infinite" }} />
        <p className="text-[10px] mt-1" style={{ color: "#78614E" }}>Your sample</p>
      </div>

      {/* Source waveform */}
      <div className="flex items-center justify-center gap-0.5 h-12 w-full max-w-xs">
        {bars.map((_, i) => (
          <div
            key={`src-${i}`}
            className="w-1 rounded-full"
            style={{
              height: "100%",
              backgroundColor: accent,
              animation: "mhWaveScale 0.8s infinite ease-in-out",
              animationDelay: `${i * 0.05}s`,
            }}
          />
        ))}
      </div>

      <Sparkles className="w-5 h-5" style={{ color: accent, animation: "mhSparkleSpin 5s infinite" }} />

      {/* Generated clone waveforms — staggered */}
      <div className="flex flex-col gap-1.5 w-full max-w-xs">
        {[0, 1, 2].map((row) => (
          <div key={row} className="flex items-center justify-center gap-0.5 h-6">
            {bars.map((_, i) => (
              <div
                key={`clone-${row}-${i}`}
                className="w-1 rounded-full"
                style={{
                  height: "100%",
                  backgroundColor: `${accent}aa`,
                  animation: "mhWaveScale 1s infinite ease-in-out",
                  animationDelay: `${row * 0.4 + i * 0.04}s`,
                }}
              />
            ))}
          </div>
        ))}
      </div>
      <p className="text-[10px] font-bold" style={{ color: accent }}>= unlimited voiceovers in your voice</p>
    </div>
  );
}

// ── Pattern 6: video-to-text ───────────────────────────────────────────────
function VideoToText({ accent }: { accent: string }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-3 px-6">
      {/* Video frame mock */}
      <div
        className="w-40 h-24 rounded-lg relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #292524, #78614E)", border: "1px solid rgba(0,0,0,0.2)" }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="w-0 h-0"
            style={{
              borderLeft: "16px solid white",
              borderTop: "10px solid transparent",
              borderBottom: "10px solid transparent",
              opacity: 0.85,
              animation: "mhPulse 3s infinite",
            }}
          />
        </div>
      </div>

      <FileText className="w-5 h-5" style={{ color: accent }} />

      {/* Transcript lines */}
      <div className="flex flex-col gap-1 w-full max-w-xs">
        {[80, 95, 60].map((w, i) => (
          <div
            key={i}
            className="h-1.5 rounded"
            style={{
              width: `${w}%`,
              backgroundColor: "#78614E",
              animation: "mhSlideRight 5s infinite ease-in-out",
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>

      <div className="flex gap-1.5 mt-1">
        {[Instagram, Linkedin, Twitter].map((Icon, i) => (
          <div
            key={i}
            className="w-7 h-7 rounded flex items-center justify-center"
            style={{
              backgroundColor: accent,
              animation: "mhFadeUp 5s infinite ease-in-out",
              animationDelay: `${i * 0.3 + 1}s`,
            }}
          >
            <Icon className="w-3.5 h-3.5" style={{ color: "white" }} />
          </div>
        ))}
      </div>
    </div>
  );
}
