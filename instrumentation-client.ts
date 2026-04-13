// Sentry initialization for the client (browser).
// Loaded automatically by Next.js on every page load.
// Includes Session Replay (M8 from Sprint 1) — captures user sessions
// to debug production issues with full context.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Session Replay: triggered only on errors (saves quota)
  integrations: [
    Sentry.replayIntegration({
      // Mask all text + inputs by default (privacy-first)
      maskAllText: true,
      blockAllMedia: false,
    }),
  ],

  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  enableLogs: true,

  // Sample 10% of normal sessions for replay (so we have baseline data)
  replaysSessionSampleRate: 0.1,
  // 100% of error sessions — crucial for debugging real bugs
  replaysOnErrorSampleRate: 1.0,

  sendDefaultPii: true,

  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",

  // NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA is auto-injected by Vercel for the
  // client bundle (must be NEXT_PUBLIC to ship to the browser).
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ?? undefined,
});

// Tracks Next.js App Router navigations as Sentry transactions.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
