"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  X, CheckCircle2, Circle, Instagram, Search, Sparkles, ChevronRight, Zap,
  Mic, Image as ImageIcon, CalendarDays, Rocket,
} from "lucide-react";

// v2 = reset state when steps changed (old v1 steps no longer apply)
const STORAGE_KEY = "mkh_onboarding_v2";

interface Step {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  accentColor: string;
}

const STEPS: Step[] = [
  {
    id: "brand-voice",
    label: "Set your Brand Voice",
    description: "Every AI feature personalizes to your tone",
    href: "/brand/voice",
    icon: <Mic className="w-4 h-4" />,
    accentColor: "#8B5CF6",
  },
  {
    id: "instagram",
    label: "Connect a platform",
    description: "Instagram, LinkedIn or Facebook — for auto-publish",
    href: "/integrations",
    icon: <Instagram className="w-4 h-4" />,
    accentColor: "#E1306C",
  },
  {
    id: "ai-image",
    label: "Generate your first AI image",
    description: "Studio → Image. ~5 seconds, ~$0.003",
    href: "/studio/image",
    icon: <ImageIcon className="w-4 h-4" />,
    accentColor: "var(--color-primary)",
  },
  {
    id: "caption",
    label: "Generate an AI caption",
    description: "With your brand voice baked in",
    href: "/captions",
    icon: <Sparkles className="w-4 h-4" />,
    accentColor: "#16A34A",
  },
  {
    id: "schedule",
    label: "Schedule your first post",
    description: "Calendar → pick a day → '+ New post'",
    href: "/calendar",
    icon: <CalendarDays className="w-4 h-4" />,
    accentColor: "#0EA5E9",
  },
  {
    id: "campaign",
    label: "Launch a campaign (auto-pilot)",
    description: "One brief → 5 ready posts with images",
    href: "/studio/campaign",
    icon: <Rocket className="w-4 h-4" />,
    accentColor: "#EC4899",
  },
  {
    id: "leads",
    label: "Find your first clients",
    description: "Lead Finder wizard with your offer",
    href: "/lead-finder",
    icon: <Search className="w-4 h-4" />,
    accentColor: "var(--color-primary-hover)",
  },
];

function loadState(): { done: Record<string, boolean>; dismissed: boolean } {
  if (typeof window === "undefined") return { done: {}, dismissed: false };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { done: {}, dismissed: false };
    return JSON.parse(raw);
  } catch {
    return { done: {}, dismissed: false };
  }
}

function saveState(done: Record<string, boolean>, dismissed: boolean) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ done, dismissed }));
}

export default function OnboardingChecklist() {
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const s = loadState();
    setDone(s.done);
    setDismissed(s.dismissed);
    setMounted(true);
  }, []);

  if (!mounted || dismissed) return null;

  const completedCount = STEPS.filter(s => done[s.id]).length;
  const allDone = completedCount === STEPS.length;

  const toggleStep = (id: string) => {
    const next = { ...done, [id]: !done[id] };
    setDone(next);
    saveState(next, false);
  };

  const dismiss = () => {
    setDismissed(true);
    saveState(done, true);
  };

  const handleStepClick = (id: string) => {
    if (!done[id]) {
      const next = { ...done, [id]: true };
      setDone(next);
      const allComplete = STEPS.every(s => next[s.id]);
      saveState(next, allComplete);
      if (allComplete) setTimeout(() => setDismissed(true), 800);
    }
  };

  return (
    <div
      className="rounded-2xl p-5 mb-6"
      style={{
        background: "linear-gradient(135deg, #FFFCF7 0%, #FFF8EE 100%)",
        border: "1px solid rgba(245,215,160,0.4)",
        boxShadow: "0 2px 12px rgba(120,97,78,0.08)",
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))" }}
          >
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-sm" style={{ color: "var(--color-text)" }}>
              Welcome to MarketHub Pro! 🎉
            </h3>
            <p className="text-xs mt-0.5" style={{ color: "#A8967E" }}>
              {allDone
                ? "Setup complete — you're ready to grow!"
                : `${completedCount} of ${STEPS.length} steps completed`}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss getting started guide"
          className="p-1 rounded-lg transition-colors"
          style={{ color: "#C4AA8A" }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(245,215,160,0.2)")}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 rounded-full mb-4" style={{ backgroundColor: "rgba(245,215,160,0.3)" }}>
        <div
          className="h-1.5 rounded-full transition-all duration-500"
          style={{
            width: `${(completedCount / STEPS.length) * 100}%`,
            background: "linear-gradient(90deg, #F59E0B, #D97706)",
          }}
        />
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {STEPS.map(step => {
          const isDone = !!done[step.id];
          return (
            <div
              key={step.id}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all"
              style={{
                backgroundColor: isDone ? "rgba(245,215,160,0.15)" : "rgba(255,255,255,0.6)",
                border: `1px solid ${isDone ? "rgba(245,215,160,0.4)" : "rgba(245,215,160,0.2)"}`,
              }}
            >
              {/* Checkbox */}
              <button
                type="button"
                onClick={() => toggleStep(step.id)}
                aria-label={isDone ? `Uncheck ${step.label}` : `Check ${step.label}`}
                className="flex-shrink-0 transition-transform active:scale-90"
              >
                {isDone
                  ? <CheckCircle2 className="w-5 h-5" style={{ color: "#16A34A" }} />
                  : <Circle className="w-5 h-5" style={{ color: "#C4AA8A" }} />}
              </button>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p
                  className="text-xs font-medium leading-tight"
                  style={{ color: isDone ? "#A8967E" : "var(--color-text)", textDecoration: isDone ? "line-through" : "none" }}
                >
                  {step.label}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "#C4AA8A" }}>
                  {step.description}
                </p>
              </div>

              {/* Go button */}
              {!isDone && (
                <Link
                  href={step.href}
                  onClick={() => handleStepClick(step.id)}
                  className="flex items-center gap-1 px-3.5 py-2 rounded-lg text-sm font-medium flex-shrink-0 transition-colors"
                  style={{ backgroundColor: step.accentColor + "18", color: step.accentColor }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = step.accentColor + "28")}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = step.accentColor + "18")}
                >
                  Go
                  <ChevronRight className="w-3 h-3" />
                </Link>
              )}
            </div>
          );
        })}
      </div>

      {/* All done message */}
      {allDone && (
        <div
          className="mt-3 rounded-xl px-4 py-2.5 flex items-center gap-2 text-xs font-medium"
          style={{ backgroundColor: "rgba(22,163,74,0.08)", color: "#16A34A" }}
        >
          <CheckCircle2 className="w-4 h-4" />
          Congratulations! You've explored all key features. Good luck with your campaign!
        </div>
      )}
    </div>
  );
}
