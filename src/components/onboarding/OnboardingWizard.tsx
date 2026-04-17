"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import GlassCard from "@/components/ui/GlassCard";

interface StepOption {
  id: string;
  label: string;
  icon: string;
  color?: string;
  border?: string;
}

interface Step {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
  description?: string;
  cta: string;
  skip?: boolean;
  skipLabel?: string;
  options?: StepOption[];
}

const STEPS: Step[] = [
  {
    id: "welcome",
    emoji: "👋",
    title: "Welcome to MarketHub Pro",
    subtitle: "Let's get you set up in under 2 minutes",
    description:
      "We'll connect your platforms, set your goals, and show you your first insights.",
    cta: "Let's go",
  },
  {
    id: "platform",
    emoji: "🔗",
    title: "Connect your first platform",
    subtitle: "Where do you create content?",
    description:
      "Connect YouTube, TikTok, or Instagram to start seeing real analytics.",
    cta: "Continue",
    skip: true,
    skipLabel: "I'll do this later",
    options: [
      {
        id: "youtube",
        label: "YouTube",
        icon: "▶",
        color: "rgba(239,68,68,0.2)",
        border: "rgba(239,68,68,0.3)",
      },
      {
        id: "instagram",
        label: "Instagram",
        icon: "◈",
        color: "rgba(168,85,247,0.2)",
        border: "rgba(168,85,247,0.3)",
      },
      {
        id: "tiktok",
        label: "TikTok",
        icon: "♪",
        color: "rgba(0,0,0,0.3)",
        border: "rgba(255,255,255,0.15)",
      },
      {
        id: "facebook",
        label: "Facebook",
        icon: "f",
        color: "rgba(59,130,246,0.2)",
        border: "rgba(59,130,246,0.3)",
      },
    ],
  },
  {
    id: "goal",
    emoji: "🎯",
    title: "What's your main goal?",
    subtitle: "We'll personalize your dashboard",
    description: "Choose what matters most to you right now.",
    cta: "Set my goal",
    skip: true,
    skipLabel: "Skip for now",
    options: [
      { id: "grow", label: "Grow my audience", icon: "↗" },
      { id: "leads", label: "Find new clients", icon: "◎" },
      { id: "content", label: "Create better content", icon: "✦" },
      { id: "analytics", label: "Understand my analytics", icon: "◈" },
    ],
  },
  {
    id: "team",
    emoji: "👥",
    title: "Working alone or with a team?",
    subtitle: "We'll configure the right features",
    cta: "Continue",
    skip: true,
    skipLabel: "Skip",
    options: [
      { id: "solo", label: "Just me — solo creator", icon: "◉" },
      { id: "small", label: "Small team (2-5)", icon: "◉◉" },
      { id: "agency", label: "Agency (6+ people)", icon: "◉◉◉" },
    ],
  },
  {
    id: "done",
    emoji: "🚀",
    title: "You're all set!",
    subtitle: "MarketHub Pro is ready for you",
    description:
      "Your dashboard is personalized and ready. Let's see your first insights.",
    cta: "Go to Dashboard",
  },
];

interface OnboardingWizardProps {
  onComplete: () => void;
}

export default function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [direction, setDirection] = useState(1);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const next = () => {
    if (isLast) {
      localStorage.setItem("mhp-onboarding-complete", "true");
      onComplete();
      return;
    }
    setDirection(1);
    setStep((s) => s + 1);
  };

  const skip = () => {
    setDirection(1);
    setStep((s) => s + 1);
  };

  const back = () => {
    if (step === 0) return;
    setDirection(-1);
    setStep((s) => s - 1);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(8,8,18,0.92)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div style={{ width: "100%", maxWidth: 520 }}>
        {/* Progress dots */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 6,
            marginBottom: 32,
          }}
        >
          {STEPS.map((_, i) => (
            <div
              key={i}
              style={{
                width: i === step ? 24 : 8,
                height: 8,
                borderRadius: i === step ? 4 : "50%",
                background:
                  i === step
                    ? "var(--accent, #f59e0b)"
                    : i < step
                      ? "rgba(245,158,11,0.5)"
                      : "rgba(255,255,255,0.15)",
                boxShadow: i === step ? "0 0 8px rgba(245,158,11,0.5)" : "none",
                transition: "all 0.3s",
              }}
            />
          ))}
        </div>

        {/* Card */}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            initial={{ opacity: 0, x: direction * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -40 }}
            transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
          >
            <GlassCard padding="p-8">
              {/* Header */}
              <div style={{ textAlign: "center", marginBottom: 28 }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>{current.emoji}</div>
                <h2
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color: "rgba(255,255,255,0.95)",
                    letterSpacing: "-0.02em",
                    marginBottom: 6,
                  }}
                >
                  {current.title}
                </h2>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)" }}>
                  {current.subtitle}
                </p>
                {current.description && (
                  <p
                    style={{
                      fontSize: 13,
                      color: "rgba(255,255,255,0.3)",
                      marginTop: 8,
                      lineHeight: 1.6,
                    }}
                  >
                    {current.description}
                  </p>
                )}
              </div>

              {/* Options grid */}
              {current.options && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 10,
                    marginBottom: 24,
                  }}
                >
                  {current.options.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() =>
                        setSelected((s) => ({ ...s, [current.id]: opt.id }))
                      }
                      style={{
                        padding: "12px 14px",
                        borderRadius: 12,
                        cursor: "pointer",
                        background:
                          selected[current.id] === opt.id
                            ? "rgba(245,158,11,0.12)"
                            : opt.color ?? "rgba(255,255,255,0.04)",
                        border:
                          selected[current.id] === opt.id
                            ? "2px solid rgba(245,158,11,0.45)"
                            : `1px solid ${opt.border ?? "rgba(255,255,255,0.1)"}`,
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        transition: "all 0.15s",
                        textAlign: "left",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 18,
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "rgba(255,255,255,0.06)",
                          flexShrink: 0,
                        }}
                      >
                        {opt.icon}
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color:
                            selected[current.id] === opt.id
                              ? "var(--accent, #f59e0b)"
                              : "rgba(255,255,255,0.7)",
                        }}
                      >
                        {opt.label}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* CTA */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <button
                  onClick={next}
                  className="btn-liquid-primary"
                  style={{ padding: 12, fontSize: 14, borderRadius: 12 }}
                >
                  {current.cta} →
                </button>
                <div
                  style={{
                    display: "flex",
                    justifyContent: step > 0 ? "space-between" : "center",
                    alignItems: "center",
                  }}
                >
                  {step > 0 && (
                    <button
                      onClick={back}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontSize: 12,
                        color: "rgba(255,255,255,0.25)",
                        padding: "4px 0",
                      }}
                    >
                      ← Back
                    </button>
                  )}
                  {current.skip && (
                    <button
                      onClick={skip}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontSize: 12,
                        color: "rgba(255,255,255,0.25)",
                        padding: "4px 0",
                      }}
                    >
                      {current.skipLabel ?? "Skip"}
                    </button>
                  )}
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </AnimatePresence>

        <p
          style={{
            textAlign: "center",
            marginTop: 16,
            fontSize: 11,
            color: "rgba(255,255,255,0.2)",
          }}
        >
          Step {step + 1} of {STEPS.length}
        </p>
      </div>
    </div>
  );
}
