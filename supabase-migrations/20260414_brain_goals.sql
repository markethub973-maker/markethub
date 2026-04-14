-- 2026-04-14 — Brain Goals
--
-- Adds a JSONB column for CEO Brain's business goals context, stored
-- alongside the user's brand voice + content strategy. All three live
-- on the same row so loading is a single query.

ALTER TABLE public.user_brand_voice
  ADD COLUMN IF NOT EXISTS goals JSONB;

COMMENT ON COLUMN public.user_brand_voice.goals IS
  'CEO Brain goals: { target_mrr_usd, target_deadline, primary_audience, revenue_sources[], constraints, notes }. Nullable. Used as extra context in /api/brain/advisor.';
