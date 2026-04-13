// Next.js instrumentation hook — runs once when the server starts.
// Used here to wire Sentry into both Node.js and Edge runtimes.
// https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation

import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Forwards errors from React Server Components to Sentry.
export const onRequestError = Sentry.captureRequestError;
