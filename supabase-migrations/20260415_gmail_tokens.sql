-- Gmail OAuth refresh tokens
CREATE TABLE IF NOT EXISTS public.gmail_tokens (
  id BIGSERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  refresh_token TEXT NOT NULL,
  access_token TEXT,
  expires_at TIMESTAMPTZ,
  scopes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS gmail_tokens_email_idx ON public.gmail_tokens (email);
