"use client";

import { useEffect, useState } from "react";
import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home, MessageCircle, Copy, Check } from "lucide-react";

/**
 * Custom route-level error page — Next.js App Router error boundary.
 *
 * Catches errors thrown during rendering of any page. Reports the error
 * to Sentry and shows the resulting event ID so the user can share it
 * with support for fast diagnosis.
 *
 * Renders within the root layout (header, sidebar, etc. still visible)
 * — for catastrophic errors that take out the layout itself, see
 * global-error.tsx.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [eventId, setEventId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Capture to Sentry; the returned event_id is what support uses to
    // pull the full stack trace from the Sentry dashboard.
    const id = Sentry.captureException(error);
    setEventId(id);
  }, [error]);

  const copyId = async () => {
    if (!eventId) return;
    try {
      await navigator.clipboard.writeText(eventId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* no-op */
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6 py-12"
      style={{ backgroundColor: "#FFFCF7" }}
    >
      <div className="max-w-md w-full text-center">
        <div
          className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6"
          style={{
            background:
              "linear-gradient(135deg, rgba(239,68,68,0.15), rgba(220,38,38,0.1))",
          }}
        >
          <AlertTriangle className="w-10 h-10" style={{ color: "#DC2626" }} />
        </div>

        <h1 className="text-2xl font-bold mb-2" style={{ color: "#292524" }}>
          Something went wrong
        </h1>
        <p className="text-sm mb-6" style={{ color: "#78614E" }}>
          We hit an unexpected error rendering this page. The team has been
          notified automatically — usually fixed within hours.
        </p>

        {eventId && (
          <div
            className="rounded-lg p-3 mb-6 text-left"
            style={{
              backgroundColor: "rgba(239,68,68,0.06)",
              border: "1px solid rgba(239,68,68,0.2)",
            }}
          >
            <p
              className="text-[10px] font-bold uppercase tracking-wider mb-1"
              style={{ color: "#DC2626" }}
            >
              Reference ID (share with support)
            </p>
            <div className="flex items-center gap-2">
              <code
                className="text-xs font-mono flex-1 truncate"
                style={{ color: "#292524" }}
              >
                {eventId}
              </code>
              <button
                type="button"
                onClick={copyId}
                className="p-1.5 rounded transition-all"
                style={{
                  backgroundColor: copied ? "rgba(16,185,129,0.15)" : "white",
                  color: copied ? "#10B981" : "#78614E",
                }}
                aria-label="Copy reference ID"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all hover:scale-[1.02]"
            style={{
              background: "linear-gradient(135deg, #F59E0B, #D97706)",
              color: "#1C1814",
              boxShadow: "0 4px 12px rgba(245,158,11,0.3)",
            }}
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all"
            style={{
              backgroundColor: "white",
              color: "#292524",
              border: "1px solid rgba(245,215,160,0.4)",
            }}
          >
            <Home className="w-4 h-4" />
            Dashboard
          </Link>
        </div>

        <Link
          href="/help"
          className="inline-flex items-center gap-1 text-xs mt-6 transition-all hover:underline"
          style={{ color: "#78614E" }}
        >
          <MessageCircle className="w-3 h-3" />
          Need help? Contact support
        </Link>

        {process.env.NODE_ENV === "development" && error.message && (
          <details
            className="mt-8 text-left rounded-lg p-3"
            style={{
              backgroundColor: "rgba(0,0,0,0.04)",
              border: "1px solid rgba(0,0,0,0.06)",
            }}
          >
            <summary
              className="text-[10px] font-bold uppercase cursor-pointer"
              style={{ color: "#78614E" }}
            >
              Dev: error message
            </summary>
            <pre
              className="text-[10px] mt-2 whitespace-pre-wrap break-all"
              style={{ color: "#292524" }}
            >
              {error.message}
              {error.digest && `\n\nDigest: ${error.digest}`}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
