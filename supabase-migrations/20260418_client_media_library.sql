-- Client Media Library — separate image storage per client
-- Each image belongs to ONE client only, preventing cross-contamination
CREATE TABLE IF NOT EXISTS public.client_media_library (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL,          -- agency owner
  client_id     UUID NOT NULL,          -- references client_accounts.id
  source        TEXT NOT NULL CHECK (source IN ('instagram_import', 'facebook_import', 'website_import', 'upload', 'ai_generated')),
  image_url     TEXT NOT NULL,           -- original URL or Supabase storage URL
  stored_url    TEXT,                    -- our copy in Supabase storage (persistent)
  thumbnail_url TEXT,
  caption       TEXT,                    -- original caption from source
  tags          TEXT[] DEFAULT '{}',     -- searchable tags
  metadata      JSONB DEFAULT '{}',     -- source-specific data (ig post id, likes, etc.)
  used_count    INTEGER DEFAULT 0,      -- how many times reused in scheduled posts
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_media_user ON client_media_library (user_id);
CREATE INDEX IF NOT EXISTS idx_client_media_client ON client_media_library (client_id);
CREATE INDEX IF NOT EXISTS idx_client_media_source ON client_media_library (source);
