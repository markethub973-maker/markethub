-- ============================================================
-- VUL-3: Fix mutable search_path on add_ai_credits_atomic
--
-- Supabase Security Advisor warning: "Function Search Path Mutable"
-- Without an explicit search_path, the function resolves table references
-- using the caller's search_path, which an attacker with CREATE privilege
-- on a schema earlier in the path could exploit to shadow `ai_credits`.
--
-- Fix: pin search_path to public + pg_temp. The other public functions
-- (consume_premium_action, handle_new_user) already have this set.
--
-- Idempotent: ALTER FUNCTION SET is safe to re-run.
-- ============================================================

ALTER FUNCTION public.add_ai_credits_atomic(uuid, text, numeric)
  SET search_path = public, pg_temp;

-- ============================================================
-- VERIFICATION:
--   SELECT proname, proconfig FROM pg_proc
--   WHERE proname = 'add_ai_credits_atomic'
--     AND pronamespace = 'public'::regnamespace;
--   -- expect proconfig = {search_path=public, pg_temp}
-- ============================================================
