-- ============================================================================
-- SUBSCRIPTION SYSTEM MIGRATION
-- Adds trial + subscription tracking to profiles table
-- Creates usage_tracking and plan_limits tables
-- Run in: Supabase Dashboard > SQL Editor
-- ============================================================================

-- 1. Add subscription columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_plan  TEXT NOT NULL DEFAULT 'free_test'
    CHECK (subscription_plan IN ('free_test','starter','lite','pro','business','enterprise','expired')),
  ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'active'
    CHECK (subscription_status IN ('active','expired','cancelled','paused')),
  ADD COLUMN IF NOT EXISTS trial_expires_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS total_api_cost_month FLOAT NOT NULL DEFAULT 0;

-- 2. plan_limits — single source of truth for what each plan allows
CREATE TABLE IF NOT EXISTS public.plan_limits (
  plan                 TEXT PRIMARY KEY,
  ai_calls_per_day     INTEGER  NOT NULL DEFAULT 5,
  social_media_accounts INTEGER NOT NULL DEFAULT 2,
  api_cost_max         FLOAT    NOT NULL DEFAULT 0,
  storage_gb           INTEGER  NOT NULL DEFAULT 1,
  team_members         INTEGER  NOT NULL DEFAULT 1,
  email_reports        BOOLEAN  NOT NULL DEFAULT FALSE,
  webhook_integration  BOOLEAN  NOT NULL DEFAULT FALSE,
  custom_dashboard     BOOLEAN  NOT NULL DEFAULT FALSE,
  priority_support     BOOLEAN  NOT NULL DEFAULT FALSE,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed plan limits
INSERT INTO public.plan_limits
  (plan, ai_calls_per_day, social_media_accounts, api_cost_max, storage_gb,
   team_members, email_reports, webhook_integration, custom_dashboard, priority_support)
VALUES
  ('free_test', 5,   2,   0,  1,   1, FALSE, FALSE, FALSE, FALSE),
  ('starter',   10,  2,   2,  5,   1, FALSE, FALSE, FALSE, FALSE),
  ('lite',      50,  4,   5,  50,  2, TRUE,  FALSE, FALSE, FALSE),
  ('pro',       200, 8,   9,  200, 3, TRUE,  FALSE, TRUE,  TRUE),
  ('business',  500, 20,  24, 500, 5, TRUE,  TRUE,  TRUE,  TRUE),
  ('enterprise',9999,-1,  60, 9999,-1, TRUE,  TRUE,  TRUE,  TRUE),
  ('expired',   0,   0,   0,  0,   0, FALSE, FALSE, FALSE, FALSE)
ON CONFLICT (plan) DO UPDATE SET
  ai_calls_per_day     = EXCLUDED.ai_calls_per_day,
  social_media_accounts = EXCLUDED.social_media_accounts,
  api_cost_max         = EXCLUDED.api_cost_max,
  storage_gb           = EXCLUDED.storage_gb,
  team_members         = EXCLUDED.team_members,
  email_reports        = EXCLUDED.email_reports,
  webhook_integration  = EXCLUDED.webhook_integration,
  custom_dashboard     = EXCLUDED.custom_dashboard,
  priority_support     = EXCLUDED.priority_support,
  updated_at           = now();

-- 3. usage_tracking — per-feature cost tracking
CREATE TABLE IF NOT EXISTS public.usage_tracking (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature    TEXT        NOT NULL,
  api_name   TEXT,
  cost_usd   FLOAT       NOT NULL DEFAULT 0,
  month_year TEXT        NOT NULL,   -- "2026-03"
  timestamp  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_month
  ON public.usage_tracking(user_id, month_year);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_feature
  ON public.usage_tracking(feature);

-- 4. RLS
ALTER TABLE public.plan_limits    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read plan_limits"
  ON public.plan_limits FOR SELECT USING (true);

CREATE POLICY "Users view own usage"
  ON public.usage_tracking FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own usage"
  ON public.usage_tracking FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Service role bypass (for webhook + cron routes using service key)
-- Handled via SUPABASE_SERVICE_ROLE_KEY — no extra policy needed.

-- 5. Update handle_new_user trigger to set trial
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, plan, subscription_plan, subscription_status, trial_expires_at)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'name',
    'free',
    COALESCE(NEW.raw_user_meta_data->>'subscription_plan', 'free_test'),
    'active',
    NOW() + INTERVAL '7 days'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 6. Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_plan ON public.profiles(subscription_plan);
CREATE INDEX IF NOT EXISTS idx_profiles_trial_expires     ON public.profiles(trial_expires_at)
  WHERE subscription_plan = 'free_test';
