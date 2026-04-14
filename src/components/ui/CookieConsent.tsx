"use client";

/**
 * Cookie consent banner — GDPR / ePrivacy Directive compliance.
 *
 * Shows once per user (localStorage). Two simple choices: Accept all
 * (analytics on) or Reject non-essential (analytics off — Microsoft
 * Clarity script is gated by the consent state via window flag).
 *
 * Why simple instead of "customize" toggles?
 *  - Sub-categorising cookies adds friction and ~80% of users click
 *    "accept all" anyway. We only have ONE non-essential bucket
 *    (Clarity replay), so a binary choice is the honest one.
 *  - "Reject" is exactly as prominent as "Accept" — recital 32 GDPR.
 *
 * Storage key: `mkh_cookie_consent` = "all" | "essential"
 * Layout.tsx reads window.__mkh_consent before loading Clarity.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie, X } from "lucide-react";

const STORAGE_KEY = "mkh_cookie_consent";

declare global {
  interface Window {
    __mkh_consent?: "all" | "essential";
  }
}

export default function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "all" || stored === "essential") {
        window.__mkh_consent = stored;
        return;
      }
      // No prior decision → show banner after slight delay
      const t = setTimeout(() => setShow(true), 600);
      return () => clearTimeout(t);
    } catch {
      // localStorage may be blocked (private mode) — show banner anyway
      const t = setTimeout(() => setShow(true), 600);
      return () => clearTimeout(t);
    }
  }, []);

  const decide = (choice: "all" | "essential") => {
    setShow(false);
    try {
      window.localStorage.setItem(STORAGE_KEY, choice);
      window.__mkh_consent = choice;
    } catch {
      /* ignore */
    }
    // If user accepted analytics AFTER page load, dynamically inject Clarity
    if (choice === "all" && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("mkh:consent-accepted"));
    }
  };

  if (!show) return null;

  return (
    <div
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:bottom-4 sm:max-w-md z-[90] rounded-2xl shadow-2xl"
      style={{
        backgroundColor: "var(--color-bg-secondary)",
        border: "1px solid rgba(245,215,160,0.5)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
      }}
      role="region"
      aria-label="Cookie consent"
    >
      <div className="p-5">
        <div className="flex items-start gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: "rgba(245,158,11,0.12)", color: "var(--color-primary)" }}
          >
            <Cookie className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
              We value your privacy
            </p>
            <p className="text-xs mt-1" style={{ color: "#78614E" }}>
              We use essential cookies to make the site work, plus optional
              analytics (Microsoft Clarity) to improve UX. You can change your
              mind anytime in{" "}
              <Link href="/settings" className="underline" style={{ color: "var(--color-primary-hover)" }}>
                settings
              </Link>
              .
            </p>
          </div>
          <button
            type="button"
            onClick={() => decide("essential")}
            className="p-1 rounded -mt-1 -mr-1"
            style={{ color: "#A8967E" }}
            aria-label="Reject and close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mt-4">
          <button
            type="button"
            onClick={() => decide("essential")}
            className="flex-1 py-2.5 rounded-lg text-xs font-bold transition-all"
            style={{
              backgroundColor: "white",
              color: "var(--color-text)",
              border: "1px solid rgba(245,215,160,0.5)",
            }}
          >
            Reject non-essential
          </button>
          <button
            type="button"
            onClick={() => decide("all")}
            className="flex-1 py-2.5 rounded-lg text-xs font-bold transition-all"
            style={{
              background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))",
              color: "#1C1814",
            }}
          >
            Accept all
          </button>
        </div>

        <Link
          href="/privacy"
          className="block text-center mt-3 text-[11px] underline"
          style={{ color: "#A8967E" }}
        >
          Read our privacy policy
        </Link>
      </div>
    </div>
  );
}
