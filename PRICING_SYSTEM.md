# 💰 Pricing & Subscription System

## 3-Tier Pricing Model

### Plan Free Test (7 Days)
- **Duration**: 7-day trial after registration
- **Cost**: FREE
- **AI Features**: LIMITED
  - Max 5 API calls/day to AI agents
  - No advanced analysis
  - Basic reports only
- **Social Media Accounts**: MAX 2
- **Features**:
  - Dashboard access
  - Basic analytics
  - Limited competitor analysis
  - No bulk operations
- **Auto-Expire**: After 7 days, requires upgrade

### Plan Lite ($20/month MAX)
- **Cost**: Variable (based on API usage, capped at $20)
- **AI Features**: MODERATE
  - Max 50 API calls/day to AI agents
  - Standard analysis available
  - Custom reports
- **Social Media Accounts**: UNLIMITED
- **Features**:
  - All Free features +
  - Advanced analytics
  - Full competitor analysis
  - Email reports
  - Historical data (30 days)
  - API access (limited rate)
- **API Cost Cap**: $20/month (throttled if exceeded)

### Plan Pro ($40/month MAX)
- **Cost**: Variable (based on API usage, capped at $40)
- **AI Features**: FULL
  - Unlimited API calls to AI agents
  - Advanced analysis & ML models
  - Custom AI training
  - Priority processing
- **Social Media Accounts**: UNLIMITED
- **Features**:
  - All Lite features +
  - Advanced AI features
  - Real-time alerts
  - Custom dashboards
  - Webhook integrations
  - Team collaboration (up to 5 users)
  - Historical data (unlimited)
  - Priority API rate limits
- **API Cost Cap**: $40/month (unlimited access if under cap)

---

## Database Schema

### users table (Update)
```sql
ALTER TABLE users ADD COLUMN (
  subscription_plan VARCHAR(20) DEFAULT 'free_test', -- free_test, lite, pro
  subscription_started_at TIMESTAMP,
  trial_expires_at TIMESTAMP,
  paid_subscription_id VARCHAR(255),
  stripe_customer_id VARCHAR(255),
  total_api_cost_month FLOAT DEFAULT 0,
  reset_date TIMESTAMP DEFAULT NOW()
);
```

### subscriptions table (NEW)
```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  plan VARCHAR(20), -- free_test, lite, pro
  status VARCHAR(20), -- active, expired, cancelled
  started_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  payment_method VARCHAR(20), -- card, crypto (future)
  stripe_subscription_id VARCHAR(255),
  renewal_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### usage_tracking table (NEW)
```sql
CREATE TABLE usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  feature VARCHAR(100), -- ai_call, api_request, social_account_added
  api_name VARCHAR(100), -- openai, anthropic, youtube, instagram
  cost_usd FLOAT DEFAULT 0,
  timestamp TIMESTAMP DEFAULT NOW(),
  month_year VARCHAR(7), -- 2026-03
  created_at TIMESTAMP DEFAULT NOW()
);
```

### plan_limits table (NEW)
```sql
CREATE TABLE plan_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan VARCHAR(20),
  feature VARCHAR(100),
  limit_value INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert plan limits
INSERT INTO plan_limits (plan, feature, limit_value) VALUES
-- Free Test
('free_test', 'ai_calls_per_day', 5),
('free_test', 'social_media_accounts', 2),
('free_test', 'api_cost_max', 0),
('free_test', 'storage_gb', 1),

-- Lite
('lite', 'ai_calls_per_day', 50),
('lite', 'social_media_accounts', 999),
('lite', 'api_cost_max', 20),
('lite', 'storage_gb', 50),

-- Pro
('pro', 'ai_calls_per_day', 999),
('pro', 'social_media_accounts', 999),
('pro', 'api_cost_max', 40),
('pro', 'storage_gb', 500);
```

---

## API Routes to Create

### 1. GET /api/subscription/check
```typescript
// Returns current subscription status & limits
{
  plan: "free_test",
  status: "active",
  days_remaining: 5,
  next_billing_date: "2026-04-01",
  api_cost_this_month: 0.50,
  api_cost_limit: 20,
  social_accounts: { used: 1, limit: 2 },
  ai_calls_today: { used: 3, limit: 5 }
}
```

### 2. POST /api/subscription/upgrade
```typescript
// Upgrade from free_test to lite/pro
Request: { plan: "lite" }
Response: { stripe_checkout_url: "..." }
```

### 3. POST /api/subscription/check-trial
```typescript
// Runs daily to check if trial expired
// Auto-downgrades to expired state if 7 days passed
```

### 4. POST /api/usage/track
```typescript
// Internal: Called whenever API is used
Request: {
  feature: "ai_call",
  api_name: "openai",
  cost_usd: 0.02
}
```

### 5. GET /api/usage/monthly
```typescript
// Returns monthly usage breakdown
{
  total_cost: 5.50,
  breakdown: {
    openai: 3.20,
    youtube_api: 1.50,
    instagram_api: 0.80
  }
}
```

---

## Implementation Workflow

### Step 1: Middleware (Plan Enforcement)
```typescript
// middleware.ts
export async function middleware(request: Request) {
  const user = await getUser();
  const subscription = await getSubscription(user.id);

  // Check if trial expired
  if (subscription.plan === 'free_test' &&
      subscription.expires_at < new Date()) {
    // Downgrade to expired
    await updateSubscription(user.id, { status: 'expired' });
    return redirect('/upgrade-required');
  }

  // Check feature limits
  const limits = await getPlanLimits(subscription.plan);
  const usage = await getUsage(user.id, 'today');

  if (usage.ai_calls >= limits.ai_calls_per_day) {
    request.headers.set('X-RATE-LIMITED', 'true');
  }
}
```

### Step 2: Usage Tracking Hook
```typescript
// lib/trackUsage.ts
export async function trackApiUsage(
  userId: string,
  apiName: string,
  costUSD: number
) {
  // Log the usage
  await db.insert('usage_tracking', {
    user_id: userId,
    api_name: apiName,
    cost_usd: costUSD,
    month_year: getCurrentMonth()
  });

  // Check if over limit
  const user = await getUser(userId);
  const limits = await getPlanLimits(user.subscription_plan);
  const monthlyCost = await getMonthlyApiCost(userId);

  if (monthlyCost > limits.api_cost_max) {
    // Throttle or block
    if (user.subscription_plan === 'free_test') {
      throw new Error('Plan limit exceeded. Upgrade to continue.');
    }
  }
}
```

### Step 3: Payment Integration (Stripe)
```typescript
// api/stripe/checkout
export async function POST(req: Request) {
  const { plan } = await req.json();
  const user = await getUser();

  const session = await stripe.checkout.sessions.create({
    customer_email: user.email,
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: {
          name: `MarketHub ${plan.toUpperCase()} Plan`,
          description: getPlanDescription(plan)
        },
        unit_amount: getPlanPrice(plan) * 100 // in cents
      },
      quantity: 1
    }],
    mode: 'subscription',
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`
  });

  return { url: session.url };
}
```

---

## Frontend Pages to Create

### 1. /pricing
```
Display 3 plans side-by-side:
- Free Test (7 days)
- Lite ($20/mo)
- Pro ($40/mo)

CTA buttons: "Start Free Test", "Upgrade to Lite", etc.
```

### 2. /dashboard/subscription
```
Show current subscription:
- Active plan
- Days remaining (if trial)
- Usage breakdown
- Upgrade/Downgrade buttons
```

### 3. /dashboard/billing
```
Show:
- Monthly API costs breakdown
- Usage limits per plan
- Payment method
- Billing history
```

### 4. /upgrade-required
```
Show when trial expires:
"Your free trial has ended. Upgrade to Lite or Pro to continue."
Buttons: "Upgrade to Lite" or "Upgrade to Pro"
```

---

## Trial Expiration Logic

### Cron Job (runs daily at 00:00 UTC)
```typescript
export async function checkExpiredTrials() {
  const expiredUsers = await db.query(`
    SELECT id FROM users
    WHERE subscription_plan = 'free_test'
    AND trial_expires_at < NOW()
  `);

  for (const user of expiredUsers) {
    await db.update('users', { user.id }, {
      subscription_plan: 'expired',
      subscription_status: 'expired'
    });

    // Send email notification
    await sendEmail(user.email, 'Your free trial has ended', {
      upgrade_link: `${APP_URL}/pricing`
    });
  }
}
```

---

## Stripe Setup Checklist

- [ ] Create Stripe account
- [ ] Create 2 products: "Lite Plan" and "Pro Plan"
- [ ] Create recurring prices for both (monthly billing)
- [ ] Add Stripe webhooks:
  - `payment_intent.succeeded`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
- [ ] Set webhook secret in `.env.local`
- [ ] Test with Stripe test mode

---

## Configuration

### Environment Variables
```bash
STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
LITE_PLAN_PRICE_ID=price_...
PRO_PLAN_PRICE_ID=price_...
```

---

## Testing

### Test Free Trial Flow
1. Register new account
2. Verify trial_expires_at = NOW() + 7 days
3. Try to exceed AI call limits
4. Wait 7 days (or mock date)
5. Verify auto-downgrade to expired

### Test Upgrade Flow
1. Start free trial
2. Click "Upgrade to Lite"
3. Complete Stripe checkout
4. Verify subscription updated
5. Verify new limits applied

---

## Pricing Structure

| Feature | Free Test | Lite | Pro |
|---------|-----------|------|-----|
| Duration | 7 days | Monthly | Monthly |
| AI Calls/Day | 5 | 50 | Unlimited |
| Social Accounts | 2 | Unlimited | Unlimited |
| API Cost Cap | $0 | $20 | $40 |
| Storage | 1 GB | 50 GB | 500 GB |
| Cost | FREE | Variable | Variable |

---

## Next Steps

1. **Week 1**: Setup database & Stripe account
2. **Week 2**: Implement subscription middleware
3. **Week 3**: Build payment integration
4. **Week 4**: Create frontend pages
5. **Week 5**: Testing & go live

---

## Support

For questions:
- Stripe Docs: stripe.com/docs
- Database: Supabase PostgreSQL docs
- Payment: Look at /api/stripe folder
