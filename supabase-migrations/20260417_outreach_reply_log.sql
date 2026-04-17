-- Outreach reply log: tracks full conversation between Alex and prospects
-- Each row = one message (inbound from prospect OR outbound from Alex)
CREATE TABLE IF NOT EXISTS public.outreach_reply_log (
  id          BIGSERIAL PRIMARY KEY,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  domain      TEXT NOT NULL,
  email       TEXT NOT NULL,
  direction   TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message     TEXT,
  intent      TEXT,  -- general_question, demo_interest, pricing_question, objection, not_interested, demo_booked
  resend_id   TEXT,  -- Resend email ID for outbound messages
  metadata    JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_outreach_reply_log_domain ON public.outreach_reply_log (domain);
CREATE INDEX IF NOT EXISTS idx_outreach_reply_log_created ON public.outreach_reply_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_outreach_reply_log_intent ON public.outreach_reply_log (intent) WHERE intent IN ('demo_interest', 'demo_booked', 'pricing_question');

-- Allow status 'replied' and 'closed_cold' on outreach_log
-- (existing check may only allow 'sent', 'send_failed', 'no_email', 'compose_failed')
-- If there's no CHECK constraint, this is a no-op
DO $$
BEGIN
  -- Try to drop existing constraint and recreate with new values
  ALTER TABLE public.outreach_log DROP CONSTRAINT IF EXISTS outreach_log_status_check;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
