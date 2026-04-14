"use client";

import { useEffect, useState } from "react";
import * as Sentry from "@sentry/nextjs";

/**
 * Global error boundary — last resort.
 *
 * Renders when an error escapes the root layout itself (i.e. layout.tsx
 * threw). Replaces the entire page including <html>/<body>, so we
 * cannot use any layout components or Tailwind classes that depend on
 * provider context. Inline styles only.
 *
 * Per Next.js docs, this component MUST render its own <html> and <body>.
 * Sentry MUST be the only side-effect — no fetch, no router push.
 */
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  const [eventId, setEventId] = useState<string | null>(null);

  useEffect(() => {
    setEventId(Sentry.captureException(error));
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: 0,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          backgroundColor: "var(--color-bg-secondary)",
          color: "var(--color-text)",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ maxWidth: 480, width: "100%", padding: 24, textAlign: "center" }}>
          <div
            style={{
              width: 80,
              height: 80,
              margin: "0 auto 24px",
              borderRadius: "50%",
              background:
                "linear-gradient(135deg, rgba(239,68,68,0.15), rgba(220,38,38,0.1))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 36,
            }}
          >
            ⚠️
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 8px" }}>
            Something went seriously wrong
          </h1>
          <p style={{ fontSize: 14, color: "#78614E", margin: "0 0 24px" }}>
            The page failed to load. Our team has been notified automatically
            and we&apos;re looking into it.
          </p>

          {eventId && (
            <div
              style={{
                backgroundColor: "rgba(239,68,68,0.06)",
                border: "1px solid rgba(239,68,68,0.2)",
                borderRadius: 8,
                padding: 12,
                margin: "0 0 24px",
                textAlign: "left",
              }}
            >
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "#DC2626",
                  margin: "0 0 4px",
                }}
              >
                Reference ID (share with support)
              </p>
              <code style={{ fontSize: 12, fontFamily: "monospace" }}>{eventId}</code>
            </div>
          )}

          <a
            href="/"
            style={{
              display: "inline-block",
              padding: "12px 24px",
              borderRadius: 12,
              background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))",
              color: "#1C1814",
              fontSize: 14,
              fontWeight: 700,
              textDecoration: "none",
              boxShadow: "0 4px 12px rgba(245,158,11,0.3)",
            }}
          >
            Reload from start
          </a>

          <p style={{ fontSize: 11, color: "#A8967E", marginTop: 32 }}>
            MarketHub Pro · Social Video Intelligence
          </p>
        </div>
      </body>
    </html>
  );
}
