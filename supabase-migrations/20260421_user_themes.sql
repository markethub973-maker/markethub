-- User theme customization table
-- Stores per-user CSS variable overrides loaded at login by ThemeProvider

CREATE TABLE IF NOT EXISTS user_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  theme_name TEXT NOT NULL DEFAULT 'Custom',
  config JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Each user has at most one active theme
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_themes_active
  ON user_themes (user_id) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_user_themes_user
  ON user_themes (user_id);

-- RLS
ALTER TABLE user_themes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own themes"
  ON user_themes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own themes"
  ON user_themes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own themes"
  ON user_themes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own themes"
  ON user_themes FOR DELETE
  USING (auth.uid() = user_id);
