-- Fix cron_logs schema — was PRIMARY KEY (job) which silently broke
-- all INSERTs after the first row per job. Multiple endpoints use INSERT
-- (not upsert) and were failing with UNIQUE violation, swallowed by
-- try/catch silently. This is why cockpit-watchdog heartbeats stopped
-- on 2026-04-11 17:02 — the moment the constraint was applied or first
-- conflict happened.
--
-- Fix: append-only log semantics. UUID PK + index on (job, ran_at DESC).

BEGIN;

-- Drop the bad PK
ALTER TABLE cron_logs DROP CONSTRAINT IF EXISTS cron_logs_pkey;

-- Add proper auto-PK
ALTER TABLE cron_logs ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
UPDATE cron_logs SET id = gen_random_uuid() WHERE id IS NULL;
ALTER TABLE cron_logs ALTER COLUMN id SET NOT NULL;
ALTER TABLE cron_logs ADD PRIMARY KEY (id);

-- Make ran_at NOT NULL with default
ALTER TABLE cron_logs ALTER COLUMN ran_at SET DEFAULT now();
UPDATE cron_logs SET ran_at = now() WHERE ran_at IS NULL;
ALTER TABLE cron_logs ALTER COLUMN ran_at SET NOT NULL;

-- Index for "latest per job" queries (used by watchdog, health-check, etc.)
CREATE INDEX IF NOT EXISTS cron_logs_job_ran_at_idx ON cron_logs (job, ran_at DESC);

COMMIT;
