-- ============================================================
-- VUL-4: Explicit deny-all policies on system-only tables
--
-- Supabase Security Advisor "Info: RLS Enabled No Policy" on 5 tables:
--   admin_platform_config, audit_logs, cron_logs,
--   discount_codes, stripe_webhook_events
--
-- These tables are intentionally deny-all for JWT users —
-- all writes/reads go through service_role which bypasses RLS.
-- Adding an explicit RESTRICTIVE USING (false) policy makes
-- the intent visible in the schema and silences the linter.
--
-- Idempotent: DROP POLICY IF EXISTS before each CREATE POLICY.
-- ============================================================

-- admin_platform_config
DROP POLICY IF EXISTS "system_only" ON public.admin_platform_config;
CREATE POLICY "system_only" ON public.admin_platform_config
  AS RESTRICTIVE FOR ALL TO authenticated, anon USING (false);

-- audit_logs
DROP POLICY IF EXISTS "system_only" ON public.audit_logs;
CREATE POLICY "system_only" ON public.audit_logs
  AS RESTRICTIVE FOR ALL TO authenticated, anon USING (false);

-- cron_logs
DROP POLICY IF EXISTS "system_only" ON public.cron_logs;
CREATE POLICY "system_only" ON public.cron_logs
  AS RESTRICTIVE FOR ALL TO authenticated, anon USING (false);

-- discount_codes
DROP POLICY IF EXISTS "system_only" ON public.discount_codes;
CREATE POLICY "system_only" ON public.discount_codes
  AS RESTRICTIVE FOR ALL TO authenticated, anon USING (false);

-- stripe_webhook_events
DROP POLICY IF EXISTS "system_only" ON public.stripe_webhook_events;
CREATE POLICY "system_only" ON public.stripe_webhook_events
  AS RESTRICTIVE FOR ALL TO authenticated, anon USING (false);

-- ============================================================
-- VERIFICATION:
--   SELECT schemaname, tablename, policyname, cmd, qual
--   FROM pg_policies
--   WHERE tablename IN (
--     'admin_platform_config','audit_logs','cron_logs',
--     'discount_codes','stripe_webhook_events'
--   );
--   -- expect 5 rows, policyname='system_only', qual='false'
-- ============================================================
