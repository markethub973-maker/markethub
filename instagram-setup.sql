-- Create Instagram connections table
CREATE TABLE IF NOT EXISTS instagram_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  instagram_id VARCHAR(255) NOT NULL,
  instagram_username VARCHAR(255) NOT NULL,
  instagram_name VARCHAR(255),
  access_token TEXT NOT NULL,
  token_type VARCHAR(50) DEFAULT 'bearer',
  connected_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_instagram_connections_user_id 
  ON instagram_connections(user_id);

-- Enable RLS
ALTER TABLE instagram_connections ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own Instagram connections
CREATE POLICY instagram_connections_user_access ON instagram_connections
  FOR ALL USING (auth.uid() = user_id);
