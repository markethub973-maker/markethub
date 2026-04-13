// Sentry initialization for Node.js server runtime.
// Loaded by `instrumentation.ts` when NEXT_RUNTIME === "nodejs".
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Sample 100% of traces in dev, 10% in prod
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Send logs to Sentry
  enableLogs: true,

  // Send PII (user email, IP) — needed to correlate errors with users
  sendDefaultPii: true,

  // Environment tag (so we can filter prod vs preview vs dev)
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",

  // Release = git SHA of deployed commit. Sentry groups errors per release
  // so we can pinpoint "this bug appeared in deploy abc123" + roll back.
  release: process.env.VERCEL_GIT_COMMIT_SHA ?? undefined,
});
