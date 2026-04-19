"use client";

/**
 * What's New Modal — C UX polish (post Sprint 1)
 *
 * Pops up automatically once per user on first visit after a deploy
 * that introduces user-visible features. Versioned by a date key so
 * the next launch (e.g. Sprint 2) can re-trigger the popup with new
 * cards by simply bumping the constant below.
 *
 * Storage: localStorage `mkh_whatsnew_seen` — stores the highest
 * version the user has dismissed.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, Zap, Brain, MessageCircle, X, ArrowRight } from "lucide-react";

// Bump this when adding new cards. Users who have dismissed an older
// version will see the popup once more with the new content.
const RELEASE_KEY = "2026-04-13";
const STORAGE_KEY = "mkh_whatsnew_seen";

interface Feature {
  icon: React.ElementType;
  color: string;
  title: string;
  description: string;
  cta: string;
  href: string;
  badge?: string;
}

const FEATURES: Feature[] = [
  {
    icon: MessageCircle,
    color: "#8B5CF6",
    title: "Ask Consultant — your in-app AI advisor",
    description:
      "Click the purple bubble bottom-left of any page. Ask anything in your language: \"How do I post to multiple platforms?\" or \"What's the best time to publish?\". It learns your context and gives strategic answers.",
    cta: "Try it now",
    href: "/",
    badge: "AI",
  },
  {
    icon: Zap,
    color: "var(--color-primary)",
    title: "Automations — 31 ready-to-run workflows",
    description:
      "Cross-post to all platforms in one click, auto-recycle your best content, send weekly reports — and 28 more. Browse the catalog grouped by category, hit Run, done.",
    cta: "Open catalog",
    href: "/dashboard/automations",
    badge: "NEW",
  },
  {
    icon: Brain,
    color: "#10B981",
    title: "Smart Support — AI replies in your language",
    description:
      "Hit the orange \"Need help?\" button bottom-right of any page. Our AI responds within seconds in 9+ languages. Complex tickets escalate to humans automatically.",
    cta: "Test it",
    href: "/",
  },
  {
    icon: Sparkles,
    color: "#EC4899",
    title: "Self-healing platform",
    description:
      "Sentry catches errors in real time, our cost monitor alerts before any plan limit, and 9 cron-driven security agents watch the platform 24/7. You'll know about issues before your customers do.",
    cta: "View admin",
    href: "/dashboard/admin",
  },
];

export default function WhatsNewModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const seen = window.localStorage.getItem(STORAGE_KEY);
      if (seen !== RELEASE_KEY) {
        // Slight delay so it doesn't compete with first paint
        const t = setTimeout(() => setOpen(true), 800);
        return () => clearTimeout(t);
      }
    } catch {
      /* localStorage might be blocked in private mode */
    }
  }, []);

  const dismiss = () => {
    setOpen(false);
    try {
      window.localStorage.setItem(STORAGE_KEY, RELEASE_KEY);
    } catch {
      /* ignore */
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) dismiss();
      }}
    >
      <div
        className="w-full max-w-2xl rounded-2xl overflow-hidden flex flex-col"
        style={{ backgroundColor: "var(--color-bg-secondary)", maxHeight: "90dvh" }}
      >
        <div
          className="flex items-center gap-3 px-6 py-4 border-b"
          style={{
            borderColor: "rgba(245,215,160,0.3)",
            background:
              "linear-gradient(135deg, rgba(139,92,246,0.08), rgba(245,158,11,0.08))",
          }}
        >
          <Sparkles className="w-6 h-6" style={{ color: "#8B5CF6" }} />
          <div className="flex-1">
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#8B5CF6" }}>
              What's new
            </p>
            <p className="text-lg font-bold" style={{ color: "var(--color-text)" }}>
              Sprint 1 just shipped — 4 new features for you
            </p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="p-2 rounded-lg transition-all hover:bg-black/5"
            style={{ color: "#78614E" }}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-4 flex-1">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-xl p-4 flex gap-4"
              style={{
                backgroundColor: "white",
                border: `1px solid ${f.color}22`,
              }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${f.color}14`, color: f.color }}
              >
                <f.icon className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2">
                  <h3 className="text-sm font-bold flex-1" style={{ color: "var(--color-text)" }}>
                    {f.title}
                  </h3>
                  {f.badge && (
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase"
                      style={{ backgroundColor: `${f.color}22`, color: f.color }}
                    >
                      {f.badge}
                    </span>
                  )}
                </div>
                <p className="text-xs mt-1 leading-relaxed" style={{ color: "#78614E" }}>
                  {f.description}
                </p>
                <Link
                  href={f.href}
                  onClick={dismiss}
                  className="mt-2 inline-flex items-center gap-1 text-sm font-bold rounded-md px-3.5 py-2 transition-all hover:gap-2"
                  style={{ backgroundColor: f.color, color: "white", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" }}
                >
                  {f.cta}
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>

        <div
          className="px-6 py-3 border-t flex items-center justify-between"
          style={{ borderColor: "rgba(245,215,160,0.3)", backgroundColor: "var(--color-bg)" }}
        >
          <p className="text-[11px]" style={{ color: "#A8967E" }}>
            You can revisit these anytime from the sidebar.
          </p>
          <button
            type="button"
            onClick={dismiss}
            className="px-4 py-2 rounded-lg text-sm font-bold"
            style={{ backgroundColor: "var(--color-text)", color: "white", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" }}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
