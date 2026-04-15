-- Operational incidents — triaged from Gmail alerts
CREATE TABLE IF NOT EXISTS public.ops_incidents (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source TEXT NOT NULL,                -- sentry, vercel, stripe, supabase, cloudflare, resend, github, apify, internal
  severity TEXT NOT NULL,              -- critical, warning, info
  subject TEXT,
  body_excerpt TEXT,
  gmail_message_id TEXT UNIQUE,
  notified_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  auto_action TEXT                     -- what Alex did automatically, if anything
);

CREATE INDEX IF NOT EXISTS ops_incidents_severity_idx ON public.ops_incidents (severity, created_at DESC);
CREATE INDEX IF NOT EXISTS ops_incidents_source_idx ON public.ops_incidents (source);
