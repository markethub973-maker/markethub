-- Add timezone support to scheduled_posts and profiles
-- Posts store date+time in user's LOCAL timezone. The timezone column
-- tells the auto-post cron when to actually publish in UTC.

-- Per-post timezone (overrides user default if set)
ALTER TABLE scheduled_posts ADD COLUMN IF NOT EXISTS timezone TEXT;

-- User default timezone (used when creating posts without explicit tz)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Europe/Bucharest';

-- Comment: Valid values are IANA timezone names like 'Europe/Bucharest',
-- 'Europe/Amsterdam', 'America/New_York', 'UTC', etc.
