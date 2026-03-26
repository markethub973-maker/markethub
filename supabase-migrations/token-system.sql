-- ============================================================================
-- TOKEN-BASED PRICING SYSTEM MIGRATION
-- Adds tables for tracking token usage and purchases
-- ============================================================================

-- 1. Token usage tracking per month (aggregated)
CREATE TABLE IF NOT EXISTS token_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month_year VARCHAR(7) NOT NULL,  -- "2026-03"
  tokens_used INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(user_id, month_year)
);

-- 2. Detailed token usage log (for analytics/debugging)
CREATE TABLE IF NOT EXISTS token_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tokens_consumed INTEGER NOT NULL,
  action VARCHAR(100),  -- "caption", "analysis", "pdf_report", etc.
  metadata JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- 3. Token purchases/recharges
CREATE TABLE IF NOT EXISTS token_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pack_id VARCHAR(100) NOT NULL,  -- "starter_tokens_25k", etc.
  tokens_purchased INTEGER NOT NULL,
  bonus_tokens INTEGER DEFAULT 0,
  price_usd DECIMAL(10, 2) NOT NULL,
  month_year VARCHAR(7) NOT NULL,  -- "2026-03"
  stripe_payment_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending',  -- "pending", "completed", "failed"
  purchased_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,

  FOREIGN KEY(user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 4. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_token_usage_user_month ON token_usage(user_id, month_year);
CREATE INDEX IF NOT EXISTS idx_token_usage_log_user ON token_usage_log(user_id);
CREATE INDEX IF NOT EXISTS idx_token_purchases_user ON token_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_token_purchases_stripe ON token_purchases(stripe_payment_id);

-- 5. RLS Policies
ALTER TABLE token_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_usage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_purchases ENABLE ROW LEVEL SECURITY;

-- Users can only see their own token usage
CREATE POLICY "Users can view own token usage"
  ON token_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own token usage log"
  ON token_usage_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own token purchases"
  ON token_purchases FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can insert token usage
CREATE POLICY "Service role can insert token usage"
  ON token_usage FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update token usage"
  ON token_usage FOR UPDATE
  USING (true);

CREATE POLICY "Service role can insert token logs"
  ON token_usage_log FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can insert token purchases"
  ON token_purchases FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================
GRANT SELECT, INSERT, UPDATE ON token_usage TO authenticated;
GRANT SELECT, INSERT ON token_usage_log TO authenticated;
GRANT SELECT, INSERT ON token_purchases TO authenticated;

GRANT ALL ON token_usage TO service_role;
GRANT ALL ON token_usage_log TO service_role;
GRANT ALL ON token_purchases TO service_role;

-- ============================================================================
-- SAMPLE DATA (for testing)
-- ============================================================================
-- Insert sample token usage for testing (optional)
-- These will show how the system tracks usage

-- Example: User has used 5000 tokens in March 2026
-- INSERT INTO token_usage (user_id, month_year, tokens_used)
-- VALUES (
--   'YOUR_USER_ID_HERE',
--   '2026-03',
--   5000
-- );
