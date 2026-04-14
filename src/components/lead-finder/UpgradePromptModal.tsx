"use client";

import { ArrowRight, Clock, X, Zap } from "lucide-react";
import Link from "next/link";

/**
 * Surfaces the 402 LIMIT_REACHED response from any premium-action endpoint.
 * Three escape paths the user can choose between:
 *   1. Upgrade to a higher plan (linked to /pricing)
 *   2. Wait for the monthly reset (counter resets on the 1st UTC)
 *   3. Dismiss and come back later
 *
 * The "Add 10 extra actions / $5" pack is intentionally NOT wired here yet —
 * Stripe one-off SKU lives in the deferred Faza 5 backlog.
 */

export interface LimitReachedPayload {
  current: number;
  limit: number;
  resetDate: string; // ISO timestamp
}

interface Props {
  payload: LimitReachedPayload | null;
  onClose: () => void;
}

function formatResetDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function UpgradePromptModal({ payload, onClose }: Props) {
  if (!payload) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(28,24,20,0.6)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl p-6 sm:p-8"
        style={{
          backgroundColor: "var(--color-bg-secondary)",
          border: "1px solid rgba(245,215,160,0.4)",
          boxShadow: "0 20px 60px rgba(28,24,20,0.4)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 p-1.5 rounded-lg opacity-60 hover:opacity-100"
          style={{ color: "#78614E" }}
        >
          <X className="w-4 h-4" />
        </button>

        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
          style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))" }}
        >
          <Zap className="w-6 h-6 text-white" />
        </div>

        <h2 className="text-xl font-bold mb-2" style={{ color: "#1C1814" }}>
          Premium AI Actions limit reached
        </h2>
        <p className="text-sm mb-5" style={{ color: "#78614E" }}>
          You&apos;ve used all <strong>{payload.limit}</strong> Premium AI Actions for this
          month. Captions, drafts, and quick AI helpers stay unlimited — only the four heavy
          workflows (Lead Scoring, Outreach, Full Campaign, APEX Advisor) are paused.
        </p>

        <div
          className="rounded-xl p-3 mb-5 flex items-center gap-2 text-xs"
          style={{ backgroundColor: "rgba(245,158,11,0.08)", color: "#78614E" }}
        >
          <Clock className="w-4 h-4 flex-shrink-0" style={{ color: "var(--color-primary)" }} />
          <span>
            Resets on <strong>{formatResetDate(payload.resetDate)}</strong>
          </span>
        </div>

        <div className="space-y-2">
          <Link
            href="/pricing"
            className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
            style={{ backgroundColor: "var(--color-primary)", color: "#1C1814" }}
          >
            Upgrade to a higher plan <ArrowRight className="w-4 h-4" />
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 rounded-xl text-sm font-bold"
            style={{
              backgroundColor: "rgba(120,97,78,0.08)",
              color: "#78614E",
            }}
          >
            Wait for the monthly reset
          </button>
        </div>
      </div>
    </div>
  );
}
