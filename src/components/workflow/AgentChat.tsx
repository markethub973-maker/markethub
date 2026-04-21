"use client";

import { useState, useRef, useEffect } from "react";
import {
  CheckCircle2,
  SkipForward,
  RefreshCw,
  Send,
  XCircle,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import type { WorkflowSession, WorkflowMode } from "@/lib/workflow-engine";
import { AGENT_DEFINITIONS } from "@/lib/workflow-engine";

// ── Types ──────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: "agent" | "user";
  text: string;
  timestamp: Date;
  options?: string[];
}

interface AgentChatProps {
  session: WorkflowSession;
  onApprove: (stepIndex: number) => Promise<void>;
  onSkip: (stepIndex: number) => void;
  onRetry: (stepIndex: number) => Promise<void>;
  onAbandon: () => void;
  onSendMessage: (message: string) => void;
}

// ── Step Progress Bar ──────────────────────────────────────────────────────

function StepProgressBar({ session }: { session: WorkflowSession }) {
  const def = AGENT_DEFINITIONS[session.agent_type];
  const steps = session.steps;

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-2 px-1">
      {steps.map((step, i) => {
        const bgColor =
          step.status === "completed"
            ? "#10B981"
            : step.status === "active"
              ? def.color
              : step.status === "skipped"
                ? "#9CA3AF"
                : "rgba(245,215,160,0.3)";
        const textColor =
          step.status === "completed" || step.status === "active"
            ? "#fff"
            : step.status === "skipped"
              ? "#fff"
              : "#78614E";

        return (
          <div
            key={step.id}
            className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap"
            style={{ backgroundColor: bgColor, color: textColor, fontSize: 10 }}
            title={step.description}
          >
            <span>{i + 1}</span>
            <span className="hidden sm:inline">{step.name}</span>
            {step.status === "completed" && <CheckCircle2 size={10} />}
            {step.status === "active" && <Loader2 size={10} className="animate-spin" />}
          </div>
        );
      })}
    </div>
  );
}

// ── Typing Animation ───────────────────────────────────────────────────────

function TypingDots() {
  return (
    <span className="inline-flex gap-0.5 items-center">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: "0ms" }} />
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: "150ms" }} />
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: "300ms" }} />
    </span>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function AgentChat({
  session,
  onApprove,
  onSkip,
  onRetry,
  onAbandon,
  onSendMessage,
}: AgentChatProps) {
  const def = AGENT_DEFINITIONS[session.agent_type];
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [loadingStep, setLoadingStep] = useState<number | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Generate initial message and step messages
  useEffect(() => {
    const initMessages: ChatMessage[] = [
      {
        id: "init",
        role: "agent",
        text: `Hello! I'm the ${def.name}. ${def.description}. I'll guide you through ${session.steps.length} steps. Let's get started!`,
        timestamp: new Date(session.created_at),
      },
    ];

    // Add messages for completed/active steps
    session.steps.forEach((step, i) => {
      if (step.status === "completed") {
        initMessages.push({
          id: `step-${i}-done`,
          role: "agent",
          text: `Step ${i + 1}: ${step.name} - Completed! ${step.result && typeof step.result === "object" && "error" in (step.result as Record<string, unknown>) ? "Warning: " + String((step.result as Record<string, unknown>).error) : ""}`,
          timestamp: new Date(),
        });
      } else if (step.status === "active") {
        initMessages.push({
          id: `step-${i}-active`,
          role: "agent",
          text: `Now working on Step ${i + 1}: ${step.name} - ${step.description}`,
          timestamp: new Date(),
          options: session.mode === "guided" ? ["Option A: Default approach", "Option B: Creative approach", "Option C: Data-driven approach"] : undefined,
        });
      }
    });

    setMessages(initMessages);
  }, [session, def]);

  const currentStepIndex = session.current_step;
  const currentStep = session.steps[currentStepIndex];
  const isSemi = session.mode === "semi";
  const isGuided = session.mode === "guided";

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: input.trim(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    onSendMessage(input.trim());
    setInput("");

    // Simulate agent thinking
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `agent-reply-${Date.now()}`,
          role: "agent",
          text: "Got it! I'll incorporate your instructions into the current step.",
          timestamp: new Date(),
        },
      ]);
    }, 1500);
  };

  const handleApprove = async () => {
    if (currentStepIndex >= session.steps.length) return;
    setLoadingStep(currentStepIndex);
    try {
      await onApprove(currentStepIndex);
      setMessages((prev) => [
        ...prev,
        { id: `approved-${Date.now()}`, role: "user", text: "Approved!", timestamp: new Date() },
      ]);
    } finally {
      setLoadingStep(null);
    }
  };

  const handleSkip = () => {
    if (currentStepIndex >= session.steps.length) return;
    onSkip(currentStepIndex);
    setMessages((prev) => [
      ...prev,
      { id: `skipped-${Date.now()}`, role: "user", text: "Skipped this step.", timestamp: new Date() },
    ]);
  };

  const handleRetry = async () => {
    if (currentStepIndex >= session.steps.length) return;
    setLoadingStep(currentStepIndex);
    try {
      await onRetry(currentStepIndex);
      setMessages((prev) => [
        ...prev,
        { id: `retry-${Date.now()}`, role: "user", text: "Generating another variant...", timestamp: new Date() },
      ]);
    } finally {
      setLoadingStep(null);
    }
  };

  return (
    <div
      className="flex flex-col h-full rounded-2xl overflow-hidden"
      style={{ backgroundColor: "var(--color-bg-secondary)", border: "1px solid rgba(245,215,160,0.3)" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 md:px-6"
        style={{ borderBottom: "1px solid rgba(245,215,160,0.25)" }}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{def.icon}</span>
          <div>
            <h3 className="text-sm font-bold" style={{ color: "var(--color-text)" }}>{def.name}</h3>
            <p className="text-xs" style={{ color: "#A8967E" }}>
              Step {Math.min(currentStepIndex + 1, session.steps.length)} of {session.steps.length}
              {" "}&middot;{" "}
              {session.mode === "auto" ? "Full Auto" : session.mode === "semi" ? "Semi-Auto" : "Guided"}
            </p>
          </div>
        </div>
        <button
          onClick={onAbandon}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
          style={{ color: "#EF4444", backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(239,68,68,0.15)")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "rgba(239,68,68,0.08)")}
        >
          <XCircle size={12} /> Abandon
        </button>
      </div>

      {/* Step Progress */}
      <div className="px-4 py-2 md:px-6" style={{ borderBottom: "1px solid rgba(245,215,160,0.15)" }}>
        <StepProgressBar session={session} />
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6 space-y-3" style={{ minHeight: 300 }}>
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className="max-w-xs sm:max-w-sm md:max-w-md rounded-2xl px-4 py-2.5"
              style={{
                backgroundColor: msg.role === "user" ? "var(--color-primary)" : "white",
                color: msg.role === "user" ? "#1C1814" : "var(--color-text)",
                border: msg.role === "agent" ? "1px solid rgba(245,215,160,0.3)" : "none",
              }}
            >
              <p className="text-xs leading-relaxed">{msg.text}</p>
              {msg.options && isGuided && (
                <div className="mt-2 space-y-1.5">
                  {msg.options.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setMessages((prev) => [
                          ...prev,
                          { id: `choice-${Date.now()}`, role: "user", text: opt, timestamp: new Date() },
                        ]);
                      }}
                      className="block w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                      style={{
                        backgroundColor: "rgba(245,158,11,0.08)",
                        border: "1px solid rgba(245,158,11,0.2)",
                        color: "#92400E",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "rgba(245,158,11,0.15)";
                        e.currentTarget.style.borderColor = "rgba(245,158,11,0.4)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "rgba(245,158,11,0.08)";
                        e.currentTarget.style.borderColor = "rgba(245,158,11,0.2)";
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
              <p className="text-xs mt-1 opacity-50" style={{ fontSize: 9 }}>
                {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div
              className="rounded-2xl px-4 py-3"
              style={{ backgroundColor: "white", border: "1px solid rgba(245,215,160,0.3)" }}
            >
              <TypingDots />
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Action Buttons (Semi/Guided) */}
      {(isSemi || isGuided) && currentStep && currentStep.status !== "completed" && (
        <div
          className="flex flex-wrap gap-2 px-4 py-3 md:px-6"
          style={{ borderTop: "1px solid rgba(245,215,160,0.2)" }}
        >
          {currentStep.status === "active" && (
            <>
              {isSemi && (
                <>
                  <button
                    onClick={handleApprove}
                    disabled={loadingStep !== null}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-colors"
                    style={{ backgroundColor: "#10B981", color: "white" }}
                  >
                    {loadingStep === currentStepIndex ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={12} />
                    )}
                    Approve
                  </button>
                  <button
                    onClick={handleRetry}
                    disabled={loadingStep !== null}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-colors"
                    style={{
                      backgroundColor: "rgba(245,158,11,0.1)",
                      color: "#D97706",
                      border: "1px solid rgba(245,158,11,0.3)",
                    }}
                  >
                    <RefreshCw size={12} /> Another variant
                  </button>
                </>
              )}
              <button
                onClick={handleSkip}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-colors"
                style={{
                  backgroundColor: "rgba(156,163,175,0.1)",
                  color: "#6B7280",
                  border: "1px solid rgba(156,163,175,0.3)",
                }}
              >
                <SkipForward size={12} /> Skip
              </button>
            </>
          )}

          {currentStep.status === "pending" && (
            <div className="flex items-center gap-2 text-xs" style={{ color: "#A8967E" }}>
              <AlertTriangle size={12} />
              Waiting for previous step to complete...
            </div>
          )}
        </div>
      )}

      {/* Input */}
      <div
        className="flex items-center gap-2 px-4 py-3 md:px-6"
        style={{ borderTop: "1px solid rgba(245,215,160,0.25)" }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Add custom instructions..."
          className="flex-1 px-4 py-2 rounded-lg text-xs focus:outline-none"
          style={{
            backgroundColor: "#F5EFE6",
            border: "1px solid rgba(245,215,160,0.3)",
            color: "var(--color-text)",
          }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          className="p-2 rounded-lg transition-colors"
          style={{
            backgroundColor: input.trim() ? "var(--color-primary)" : "rgba(245,215,160,0.3)",
            color: input.trim() ? "#1C1814" : "#A8967E",
          }}
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}
