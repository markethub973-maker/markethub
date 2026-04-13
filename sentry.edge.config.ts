// Sentry initialization for Edge runtime (middleware, edge routes).
// Loaded by `instrumentation.ts` when NEXT_RUNTIME === "edge".
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  enableLogs: true,

  sendDefaultPii: true,

  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
});
