-- Pricing System Database Schema

-- Update users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS (
  subscription_plan VARCHAR(20) DEFAULT 'free_test',
  subscription_status VARCHAR(20) DEFAULT 'active',
  trial_expires_at TIMESTAMP,
  paid_subscription_id VARCHAR(255),
  stripe_customer_id VARCHAR(255),
  total_api_cost_month FLOAT DEFAULT 0,
  reset_date TIMESTAMP DEFAULT NOW()
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan VARCHAR(20) NOT NULL CHECK (plan IN ('free_test', 'lite', 'pro')),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled', 'paused')),
  started_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  payment_method VARCHAR(20),
  stripe_subscription_id VARCHAR(255),
  renewal_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, plan)
);

-- Usage tracking table
CREATE TABLE IF NOT EXISTS usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feature VARCHAR(100) NOT NULL,
  api_name VARCHAR(100),
  cost_usd FLOAT DEFAULT 0,
  timestamp TIMESTAMP DEFAULT NOW(),
  month_year VARCHAR(7),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Plan limits table
CREATE TABLE IF NOT EXISTS plan_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan VARCHAR(20) NOT NULL UNIQUE,
  ai_calls_per_day INTEGER,
  social_media_accounts INTEGER,
  api_cost_max FLOAT,
  storage_gb INTEGER,
  team_members INTEGER,
  email_reports BOOLEAN DEFAULT FALSE,
  webhook_integration BOOLEAN DEFAULT FALSE,
  custom_dashboard BOOLEAN DEFAULT FALSE,
  priority_support BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert plan limits
DELETE FROM plan_limits;
INSERT INTO plan_limits (
  plan,
  ai_calls_per_day,
  social_media_accounts,
  api_cost_max,
  storage_gb,
  team_members,
  email_reports,
  webhook_integration,
  custom_dashboard,
  priority_support
) VALUES
-- Free Test (7 days)
('free_test', 5, 2, 0, 1, 1, FALSE, FALSE, FALSE, FALSE),
-- Lite Plan ($20/month)
('lite', 50, 999, 20, 50, 2, TRUE, FALSE, FALSE, FALSE),
-- Pro Plan ($40/month)
('pro', 999, 999, 40, 500, 5, TRUE, TRUE, TRUE, TRUE);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan ON subscriptions(plan);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_id ON usage_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_month ON usage_tracking(month_year);
CREATE INDEX IF NOT EXISTS idx_users_subscription_plan ON users(subscription_plan);
CREATE INDEX IF NOT EXISTS idx_users_trial_expires ON users(trial_expires_at);

-- Function to calculate monthly API cost
CREATE OR REPLACE FUNCTION calculate_monthly_api_cost(user_uuid UUID)
RETURNS FLOAT AS $$
  SELECT COALESCE(SUM(cost_usd), 0)
  FROM usage_tracking
  WHERE user_id = user_uuid
  AND month_year = TO_CHAR(NOW(), 'YYYY-MM');
$$ LANGUAGE SQL;

-- Function to check if user exceeded plan limit
CREATE OR REPLACE FUNCTION check_plan_limits(user_uuid UUID)
RETURNS TABLE(limit_exceeded BOOLEAN, api_cost FLOAT, api_limit FLOAT) AS $$
  SELECT
    (COALESCE(SUM(ut.cost_usd), 0) > pl.api_cost_max) as limit_exceeded,
    COALESCE(SUM(ut.cost_usd), 0) as api_cost,
    pl.api_cost_max as api_limit
  FROM users u
  LEFT JOIN usage_tracking ut ON u.id = ut.user_id
    AND ut.month_year = TO_CHAR(NOW(), 'YYYY-MM')
  LEFT JOIN plan_limits pl ON u.subscription_plan = pl.plan
  WHERE u.id = user_uuid
  GROUP BY pl.api_cost_max;
$$ LANGUAGE SQL;

-- Function to auto-expire free trials
CREATE OR REPLACE FUNCTION auto_expire_trials()
RETURNS void AS $$
BEGIN
  UPDATE users
  SET subscription_plan = 'expired',
      subscription_status = 'expired',
      updated_at = NOW()
  WHERE subscription_plan = 'free_test'
  AND trial_expires_at IS NOT NULL
  AND trial_expires_at < NOW()
  AND subscription_status = 'active';
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON subscriptions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plan_limits_updated_at
BEFORE UPDATE ON plan_limits
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON subscriptions TO authenticated;
GRANT SELECT, INSERT ON usage_tracking TO authenticated;
GRANT SELECT ON plan_limits TO authenticated;

COMMIT;
