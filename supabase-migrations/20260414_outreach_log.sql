-- 2026-04-14 — Outreach Log
-- Tracks every outbound email Alex sends via /api/brain/outreach-batch.
-- Used by follow-up cron and for reporting in the Brain Command Center.

CREATE TABLE IF NOT EXISTS public.outreach_log (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  domain TEXT NOT NULL,
  email TEXT NOT NULL,
  language TEXT,
  subject TEXT,
  body TEXT,
  status TEXT NOT NULL,           -- sent | send_failed | no_email | compose_failed | replied
  replied_at TIMESTAMPTZ,
  follow_up_1_sent_at TIMESTAMPTZ,
  follow_up_2_sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS outreach_log_created_idx ON public.outreach_log (created_at DESC);
CREATE INDEX IF NOT EXISTS outreach_log_domain_idx ON public.outreach_log (domain);
CREATE INDEX IF NOT EXISTS outreach_log_status_idx ON public.outreach_log (status);
