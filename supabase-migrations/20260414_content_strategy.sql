-- 2026-04-14 — Content Strategy Profile
--
-- Adds a single JSONB column to user_brand_voice to store the user's
-- long-form content strategy (ICP, values, topic clusters, north star
-- goal). Every AI feature that already reads brand voice will also pull
-- this in via buildBrandVoicePrompt, so strategy compounds with tone.
--
-- Safe to run multiple times (IF NOT EXISTS). RLS already restricts
-- user_brand_voice per user, so no new policies needed.

ALTER TABLE public.user_brand_voice
  ADD COLUMN IF NOT EXISTS strategy JSONB;

COMMENT ON COLUMN public.user_brand_voice.strategy IS
  'Content strategy profile: { icp: string, values: string[], topic_clusters: string[], north_star: string }. Nullable.';
