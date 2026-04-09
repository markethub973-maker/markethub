-- Premium AI Actions — test account reset
-- Purpose: bring test accounts to a fresh state mid-month so they can re-test
-- the consume_premium_action() flow without waiting for the calendar reset.
--
-- The DDL in premium-actions-system.sql already initialized every profile with
-- premium_actions_used = 0 and premium_actions_reset_at = next month boundary,
-- so this script is only needed AFTER tests have already debited the counter.
--
-- Idempotent: safe to re-run. Adjust the WHERE clause to target your test set.
-- Run via: npx supabase db query --linked --file <this> --yes
--
-- ⚠️  DEFAULT WHERE clause is intentionally restrictive — replace with the
--    actual filter for your test accounts before running.

UPDATE profiles
   SET premium_actions_used    = 0,
       premium_actions_reset_at = date_trunc('month', now() AT TIME ZONE 'UTC') + interval '1 month'
 WHERE
   -- ▼▼ EDIT THIS WHERE CLAUSE ▼▼
   email IN (
     -- list test account emails here, e.g.:
     -- 'test@markethubpro.local',
     -- 'qa-lite@markethubpro.local'
   )
   -- or filter by plan:
   -- OR plan = 'free_test'
   -- ▲▲ EDIT THIS WHERE CLAUSE ▲▲
;

-- Verification: list test accounts and their current quota state
-- (uncomment to inspect — does not consume actions, just reads)
-- SELECT
--   id,
--   email,
--   plan,
--   premium_actions_used,
--   premium_actions_reset_at
-- FROM profiles
-- WHERE plan IN ('free_test','lite','pro','business','enterprise')
-- ORDER BY premium_actions_used DESC
-- LIMIT 50;
