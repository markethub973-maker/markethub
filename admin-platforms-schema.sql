-- ============================================================
-- Admin Platform Config Table
-- Run in: Supabase Dashboard > SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.admin_platform_config (
  id          uuid primary key default gen_random_uuid(),
  platform    text not null unique,   -- 'youtube' | 'instagram' | 'tiktok' | 'facebook'
  token       text,                   -- primary token / channel_id
  extra_data  jsonb default '{}'::jsonb,  -- additional fields (ids, usernames, etc.)
  updated_at  timestamptz default now()
);

-- Only service role can access (admin API uses service role key)
ALTER TABLE public.admin_platform_config ENABLE ROW LEVEL SECURITY;

-- No public access — only accessible via service role key (bypasses RLS)
-- The admin API routes use createServiceClient() with SUPABASE_SERVICE_ROLE_KEY
