-- 2026-04-14 — Brain ops hardening: webhook log, outreach indexes, spam prevention

-- 1. Webhook log (visibility into Stripe + Resend deliveries)
CREATE TABLE IF NOT EXISTS public.webhook_log (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source TEXT NOT NULL,          -- stripe | resend_inbound | resend_delivery
  event_type TEXT,
  payload_summary TEXT,          -- short human-readable summary
  status INTEGER,                -- 200 | 400 | 500 etc.
  raw JSONB
);
CREATE INDEX IF NOT EXISTS webhook_log_created_idx ON public.webhook_log (created_at DESC);
CREATE INDEX IF NOT EXISTS webhook_log_source_idx ON public.webhook_log (source);

-- 2. Extra indexes on outreach_log for the new follow-up queries
CREATE INDEX IF NOT EXISTS outreach_log_followup1_idx
  ON public.outreach_log (created_at)
  WHERE status = 'sent' AND replied_at IS NULL AND follow_up_1_sent_at IS NULL;

CREATE INDEX IF NOT EXISTS outreach_log_followup2_idx
  ON public.outreach_log (follow_up_1_sent_at)
  WHERE status = 'sent' AND replied_at IS NULL AND follow_up_2_sent_at IS NULL
    AND follow_up_1_sent_at IS NOT NULL;

-- 3. Outreach cadence table (anti-spam: max N emails per domain per week)
CREATE TABLE IF NOT EXISTS public.outreach_cadence (
  domain TEXT PRIMARY KEY,
  last_sent_at TIMESTAMPTZ NOT NULL,
  total_sent_30d INTEGER NOT NULL DEFAULT 1,
  blocked BOOLEAN NOT NULL DEFAULT FALSE,
  blocked_reason TEXT
);

COMMENT ON TABLE public.outreach_cadence IS
  'Per-domain cadence guard. Outreach engine checks this before sending; if total_sent_30d >= 3 or blocked=true, it skips the domain to avoid spam-scoring our sender reputation.';
