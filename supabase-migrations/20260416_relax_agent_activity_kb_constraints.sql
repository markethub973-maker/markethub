-- 2026-04-16 — Relax CHECK constraints on brain_agent_activity + brain_knowledge_base
--
-- Context: throughout today's session we added two new classes of rows to
-- these tables that the original CHECK constraints block:
--   - activity="ping_claude" in brain_agent_activity (reverse-channel pings
--     from Alex / operators to the Claude CLI inbox)
--   - category="auto_learned" in brain_knowledge_base (rules auto-extracted
--     from ops_incidents by /api/brain/learn-from-incident)
--
-- Current workaround (see code): we piggyback on activity="completed" +
-- description prefix "[PING_CLAUDE]" / "[KICKOFF]" / "[AUTO_SCORE]" and
-- on category="case_study" + tag "auto_learned". Works but ugly — every
-- query has to know the prefix/tag convention instead of a clean filter.
--
-- This migration widens both constraints. After it lands:
--   - the ping-claude route can set activity="ping_claude" directly
--   - learn-from-incident can set category="auto_learned" directly
--   - future agent activity types (kickoff, auto_score, learning) get
--     first-class support too
--
-- Safe to run: constraint replacement is a metadata-only change. Existing
-- rows keep their current values (all already pass the widened set).
-- Rollback: re-apply the prior constraint with the narrower allowed list.

BEGIN;

-- 1. brain_agent_activity.activity

ALTER TABLE brain_agent_activity
  DROP CONSTRAINT IF EXISTS brain_agent_activity_activity_check;

ALTER TABLE brain_agent_activity
  ADD CONSTRAINT brain_agent_activity_activity_check
  CHECK (activity IN (
    'started',
    'completed',
    'failed',
    'ping_claude',
    'kickoff',
    'auto_score',
    'learning'
  ));

-- 2. brain_knowledge_base.category

ALTER TABLE brain_knowledge_base
  DROP CONSTRAINT IF EXISTS brain_knowledge_base_category_check;

ALTER TABLE brain_knowledge_base
  ADD CONSTRAINT brain_knowledge_base_category_check
  CHECK (category IN (
    'framework',
    'case_study',
    'intermediary_type',
    'auto_learned',
    'client_need',
    'delegation'
  ));

COMMIT;

-- Post-migration follow-up (separate commits, one per concern):
--   1. /api/brain/ping-claude : set activity="ping_claude" directly,
--      drop the [PING_CLAUDE] prefix + tag
--   2. /api/brain/learn-from-incident : set category="auto_learned" directly,
--      drop the category=case_study + tag=auto_learned workaround
--   3. /api/brain/alex-morning-kickoff : set activity="kickoff"
--   4. /api/brain/auto-pattern-update : set activity="auto_score"
--   5. ALEX_KNOWLEDGE_BRIEF rule 14 : update the reference URL / query
--      to use category eq instead of tag contains
