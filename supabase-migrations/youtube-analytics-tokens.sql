-- YouTube Analytics OAuth token storage
-- Run this in Supabase Dashboard → SQL Editor

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS youtube_access_token  TEXT,
  ADD COLUMN IF NOT EXISTS youtube_refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS youtube_token_expires_at TIMESTAMPTZ;

-- These columns are sensitive — restrict access via RLS
-- Only the authenticated user can read/write their own tokens
