-- Platform Backups table for storing backup metadata and data
CREATE TABLE IF NOT EXISTS platform_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  git_tag TEXT NOT NULL,
  git_commit TEXT NOT NULL,
  tables_included TEXT[] NOT NULL,
  row_counts JSONB NOT NULL DEFAULT '{}',
  total_size_bytes BIGINT DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  backup_data JSONB  -- stores all table data (for small backups)
);

-- Index for listing backups by date
CREATE INDEX IF NOT EXISTS idx_platform_backups_created_at ON platform_backups(created_at DESC);

-- RLS: deny all public access, only service role can touch this table
ALTER TABLE platform_backups ENABLE ROW LEVEL SECURITY;
-- No RLS policies = only service role (bypasses RLS) can read/write
