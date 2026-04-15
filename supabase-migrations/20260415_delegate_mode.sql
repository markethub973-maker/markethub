-- 2026-04-15 — Delegate Mode
-- When Eduard is away, the AI proxy takes over answering Alex's boardroom
-- questions according to pre-set rules. Everything is logged so Eduard
-- can review on return.

CREATE TABLE IF NOT EXISTS public.delegate_sessions (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  rules JSONB NOT NULL DEFAULT '{}',        -- { no_spending, max_outreach, approve_content, ... }
  approvals JSONB NOT NULL DEFAULT '[]',    -- [{ ts, question, proxy_response, decision }]
  critical_escalations JSONB NOT NULL DEFAULT '[]',
  final_report TEXT
);

CREATE INDEX IF NOT EXISTS delegate_sessions_active_idx ON public.delegate_sessions (active, ends_at DESC);
