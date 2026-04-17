"use client";

import { useToastStore } from "@/lib/toast";

const STYLES = {
  success: {
    border: "rgba(16,185,129,0.22)",
    icon: "✓",
    iconBg: "rgba(16,185,129,0.2)",
    iconColor: "#6ee7b7",
  },
  error: {
    border: "rgba(239,68,68,0.22)",
    icon: "✕",
    iconBg: "rgba(239,68,68,0.2)",
    iconColor: "#fca5a5",
  },
  warning: {
    border: "rgba(245,158,11,0.22)",
    icon: "!",
    iconBg: "rgba(245,158,11,0.2)",
    iconColor: "#fbbf24",
  },
  info: {
    border: "rgba(59,130,246,0.22)",
    icon: "i",
    iconBg: "rgba(59,130,246,0.2)",
    iconColor: "#93c5fd",
  },
};

export default function ToastContainer() {
  const { toasts, remove } = useToastStore();

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 9997,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        alignItems: "flex-end",
      }}
    >
      {toasts.map((t) => {
        const s = STYLES[t.type];
        return (
          <div
            key={t.id}
            onClick={() => remove(t.id)}
            style={{
              position: "relative",
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              padding: "12px 16px",
              borderRadius: 14,
              cursor: "pointer",
              background: "rgba(13,11,30,0.85)",
              backdropFilter: "blur(24px) saturate(180%)",
              WebkitBackdropFilter: "blur(24px) saturate(180%)",
              border: `1px solid ${s.border}`,
              boxShadow: "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)",
              minWidth: 280,
              maxWidth: 380,
              animation: "toastIn 0.3s cubic-bezier(0.34,1.56,0.64,1)",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: "40%",
                borderRadius: "14px 14px 60% 60%/14px 14px 24px 24px",
                background: "linear-gradient(180deg,rgba(255,255,255,0.08) 0%,transparent 100%)",
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                flexShrink: 0,
                background: s.iconBg,
                color: s.iconColor,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {s.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.9)" }}>{t.title}</div>
              {t.description && (
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{t.description}</div>
              )}
            </div>
            <div style={{ fontSize: 16, color: "rgba(255,255,255,0.2)", lineHeight: 1 }}>×</div>
          </div>
        );
      })}
    </div>
  );
}
