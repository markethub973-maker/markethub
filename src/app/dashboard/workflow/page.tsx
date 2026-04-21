"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import Header from "@/components/layout/Header";
import WorkflowSelector from "@/components/workflow/WorkflowSelector";
import AgentChat from "@/components/workflow/AgentChat";
import QuickToolsPanel from "@/components/workflow/QuickToolsPanel";
import {
  createWorkflowSession,
  getActiveSession,
  runStep,
  approveStep,
  completeSession,
  abandonSession,
  AGENT_DEFINITIONS,
  type AgentType,
  type WorkflowMode,
  type WorkflowSession,
} from "@/lib/workflow-engine";
import { createClient } from "@/lib/supabase/client";

// ── Auto-Progress View ─────────────────────────────────────────────────────

function AutoProgressView({
  session,
  onComplete,
  onAbandon,
}: {
  session: WorkflowSession;
  onComplete: () => void;
  onAbandon: () => void;
}) {
  const def = AGENT_DEFINITIONS[session.agent_type];
  const [currentStep, setCurrentStep] = useState(session.current_step);
  const [steps, setSteps] = useState(session.steps);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  const runAllSteps = useCallback(async () => {
    if (running) return;
    setRunning(true);

    let stepIdx = currentStep;
    const updatedSteps = [...steps];

    while (stepIdx < updatedSteps.length) {
      updatedSteps[stepIdx] = { ...updatedSteps[stepIdx], status: "active" };
      setSteps([...updatedSteps]);
      setCurrentStep(stepIdx);

      try {
        const result = await runStep(session.id, stepIdx);
        updatedSteps[stepIdx] = { ...result, status: "completed" };
      } catch {
        updatedSteps[stepIdx] = { ...updatedSteps[stepIdx], status: "completed", result: { error: "Step failed" } };
      }

      setSteps([...updatedSteps]);
      stepIdx++;
    }

    await completeSession(session.id, { completed_at: new Date().toISOString() });
    setDone(true);
    setRunning(false);
  }, [session.id, currentStep, steps, running]);

  useEffect(() => {
    if (!done && !running) {
      runAllSteps();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ backgroundColor: "var(--color-bg-secondary)", border: "1px solid rgba(245,215,160,0.3)" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-4 md:px-6"
        style={{ borderBottom: "1px solid rgba(245,215,160,0.25)" }}
      >
        <div className="flex items-center gap-3">
          <span className="text-3xl">{def.icon}</span>
          <div>
            <h2 className="text-base font-bold" style={{ color: "var(--color-text)" }}>
              {def.name} — Full Auto
            </h2>
            <p className="text-xs" style={{ color: "#A8967E" }}>
              {done ? "All steps completed!" : `Running step ${currentStep + 1} of ${steps.length}...`}
            </p>
          </div>
        </div>
        {!done && (
          <button
            onClick={async () => {
              await abandonSession(session.id);
              onAbandon();
            }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ color: "#EF4444", backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}
          >
            <XCircle size={12} /> Stop
          </button>
        )}
        {done && (
          <button
            onClick={onComplete}
            className="flex items-center gap-1 px-4 py-2 rounded-lg text-xs font-bold"
            style={{ backgroundColor: "#10B981", color: "white" }}
          >
            <CheckCircle2 size={12} /> Done
          </button>
        )}
      </div>

      {/* Steps */}
      <div className="px-4 py-4 md:px-6 space-y-2">
        {steps.map((step, i) => {
          const isActive = step.status === "active";
          const isCompleted = step.status === "completed";
          const hasError =
            isCompleted &&
            step.result &&
            typeof step.result === "object" &&
            "error" in (step.result as Record<string, unknown>);

          return (
            <div
              key={step.id}
              className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
              style={{
                backgroundColor: isActive
                  ? "rgba(245,158,11,0.08)"
                  : isCompleted
                    ? hasError
                      ? "rgba(239,68,68,0.04)"
                      : "rgba(16,185,129,0.04)"
                    : "transparent",
                border: `1px solid ${
                  isActive
                    ? "rgba(245,158,11,0.3)"
                    : isCompleted
                      ? hasError
                        ? "rgba(239,68,68,0.15)"
                        : "rgba(16,185,129,0.15)"
                      : "rgba(245,215,160,0.15)"
                }`,
              }}
            >
              {/* Number / Status icon */}
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                style={{
                  backgroundColor: isActive
                    ? "#F59E0B"
                    : isCompleted
                      ? hasError
                        ? "#EF4444"
                        : "#10B981"
                      : "rgba(245,215,160,0.2)",
                  color: isActive || isCompleted ? "white" : "#78614E",
                }}
              >
                {isActive ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : isCompleted ? (
                  hasError ? (
                    <XCircle size={14} />
                  ) : (
                    <CheckCircle2 size={14} />
                  )
                ) : (
                  i + 1
                )}
              </div>

              {/* Step info */}
              <div className="flex-1 min-w-0">
                <div
                  className="text-xs font-bold"
                  style={{
                    color: isActive
                      ? "#D97706"
                      : isCompleted
                        ? "var(--color-text)"
                        : "#A8967E",
                  }}
                >
                  {step.name}
                </div>
                <div className="text-xs truncate" style={{ color: "#A8967E", fontSize: 10 }}>
                  {step.description}
                </div>
              </div>

              {/* Status label */}
              <span
                className="flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold"
                style={{
                  fontSize: 9,
                  backgroundColor: isActive
                    ? "rgba(245,158,11,0.15)"
                    : isCompleted
                      ? hasError
                        ? "rgba(239,68,68,0.12)"
                        : "rgba(16,185,129,0.12)"
                      : "rgba(245,215,160,0.15)",
                  color: isActive
                    ? "#D97706"
                    : isCompleted
                      ? hasError
                        ? "#EF4444"
                        : "#10B981"
                      : "#A8967E",
                }}
              >
                {isActive
                  ? "Running..."
                  : isCompleted
                    ? hasError
                      ? "Warning"
                      : "Done"
                    : "Pending"}
              </span>
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="px-4 pb-4 md:px-6">
        <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(245,215,160,0.2)" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${(steps.filter((s) => s.status === "completed").length / steps.length) * 100}%`,
              backgroundColor: done ? "#10B981" : "#F59E0B",
            }}
          />
        </div>
        <p className="text-xs mt-1.5 text-right" style={{ color: "#A8967E" }}>
          {steps.filter((s) => s.status === "completed").length}/{steps.length} steps completed
        </p>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function WorkflowPage() {
  const [session, setSession] = useState<WorkflowSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Load user and active session
  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setUserId(user.id);

      try {
        const active = await getActiveSession(user.id);
        setSession(active);
      } catch {
        // No active session or table doesn't exist yet
      }
      setLoading(false);
    };
    init();
  }, []);

  const handleStart = async (agentType: AgentType, mode: WorkflowMode) => {
    if (!userId || starting) return;
    setStarting(true);
    try {
      const newSession = await createWorkflowSession(userId, "default", agentType, mode);
      setSession(newSession);
    } catch (err) {
      console.error("Failed to start workflow:", err);
    } finally {
      setStarting(false);
    }
  };

  const handleAbandon = async () => {
    if (!session) return;
    try {
      await abandonSession(session.id);
    } catch {
      // ignore
    }
    setSession(null);
  };

  const handleApprove = async (stepIndex: number) => {
    if (!session) return;
    await approveStep(session.id, stepIndex);
    // Run the next step
    if (stepIndex + 1 < session.steps.length) {
      await runStep(session.id, stepIndex + 1);
    }
    // Refresh session
    if (userId) {
      const active = await getActiveSession(userId);
      setSession(active);
    }
  };

  const handleSkip = async (stepIndex: number) => {
    if (!session) return;
    await approveStep(session.id, stepIndex);
    if (userId) {
      const active = await getActiveSession(userId);
      setSession(active);
    }
  };

  const handleRetry = async (stepIndex: number) => {
    if (!session) return;
    await runStep(session.id, stepIndex);
    if (userId) {
      const active = await getActiveSession(userId);
      setSession(active);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#FAFAF8" }}>
        <Header title="AI Workflow" subtitle="Agents and quick tools" />
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin" style={{ color: "#F59E0B" }} />
        </div>
      </div>
    );
  }

  // Active session — Auto mode
  if (session && session.mode === "auto") {
    return (
      <div style={{ minHeight: "100vh", background: "#FAFAF8" }}>
        <Header title="AI Workflow" subtitle="Full Auto in progress" />
        <div className="px-4 py-6 md:px-6 lg:px-8 max-w-4xl mx-auto">
          <AutoProgressView
            session={session}
            onComplete={() => setSession(null)}
            onAbandon={() => setSession(null)}
          />
        </div>
      </div>
    );
  }

  // Active session — Semi or Guided mode
  if (session && (session.mode === "semi" || session.mode === "guided")) {
    return (
      <div style={{ minHeight: "100vh", background: "#FAFAF8" }}>
        <Header title="AI Workflow" subtitle={`${AGENT_DEFINITIONS[session.agent_type].name} — ${session.mode === "semi" ? "Semi-Auto" : "Guided"}`} />
        <div className="px-4 py-6 md:px-6 lg:px-8 max-w-4xl mx-auto" style={{ height: "calc(100vh - 64px)" }}>
          <AgentChat
            session={session}
            onApprove={handleApprove}
            onSkip={handleSkip}
            onRetry={handleRetry}
            onAbandon={handleAbandon}
            onSendMessage={(msg) => console.log("User message:", msg)}
          />
        </div>
      </div>
    );
  }

  // No active session — show selector + quick tools
  return (
    <div style={{ minHeight: "100vh", background: "#FAFAF8" }}>
      <Header title="AI Workflow" subtitle="Choose an agent and mode, or use quick tools" />
      <div className="px-4 py-6 md:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
        <WorkflowSelector onStart={handleStart} loading={starting} />
        <QuickToolsPanel />
      </div>
    </div>
  );
}
