-- Add client_id to user_brand_voice for per-client brand voice support
-- NULL client_id = global/default voice for the user
-- Non-NULL client_id = client-specific voice override

ALTER TABLE user_brand_voice ADD COLUMN IF NOT EXISTS client_id UUID;

-- Drop old primary key (user_id only) and create new unique constraint
-- This allows multiple rows per user (one global + one per client)
ALTER TABLE user_brand_voice DROP CONSTRAINT IF EXISTS user_brand_voice_pkey;
ALTER TABLE user_brand_voice ADD CONSTRAINT user_brand_voice_user_client_unique
  UNIQUE (user_id, client_id);

-- Index for fast lookup by user + client
CREATE INDEX IF NOT EXISTS idx_brand_voice_user_client
  ON user_brand_voice (user_id, client_id);
