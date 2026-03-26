# 🚀 3-Tier Pricing System - Implementation Roadmap

## ✅ COMPLETED

### Documentation & Design
- [x] PRICING_SYSTEM.md - Complete pricing architecture
- [x] pricing-schema.sql - Database schema with all tables
- [x] Implementation roadmap

### Backend API Routes
- [x] GET /api/subscription/check - Check current subscription status
- [x] POST /api/usage/track - Track API usage and enforce limits

### Frontend Pages
- [x] /pricing - Beautiful 3-plan pricing page

---

## 🔄 IN PROGRESS / TODO

### Phase 1: Database Setup (PRIORITY)
- [ ] Execute pricing-schema.sql in Supabase
  ```bash
  # Login to Supabase console
  # Go to SQL Editor
  # Copy-paste pricing-schema.sql
  # Execute
  ```
- [ ] Verify all tables created:
  - [ ] subscriptions
  - [ ] usage_tracking
  - [ ] plan_limits (pre-populated)
- [ ] Test database functions
- [ ] Create indexes

### Phase 2: Trial Logic (PRIORITY)
Files to create:
- [ ] `/api/subscription/init-trial` - Initialize free trial on signup
  ```typescript
  // When user signs up:
  // 1. Set subscription_plan = 'free_test'
  // 2. Set trial_expires_at = NOW() + 7 days
  // 3. Create subscription record
  ```

- [ ] `/api/subscription/check-trial` - Auto-expire trials (cron job)
  ```typescript
  // Run daily: Check if trial expired
  // If expired: update subscription_plan = 'expired'
  // Send email notification
  ```

### Phase 3: Plan Enforcement
Files to create:
- [ ] `lib/checkPlanLimits.ts` - Middleware function
  ```typescript
  // Before API calls:
  // 1. Check AI calls today limit
  // 2. Check social media accounts limit
  // 3. Check API cost this month
  // If exceeded: return 429 Too Many Requests
  ```

- [ ] Update all AI/API calls to use checkPlanLimits
  - [ ] /api/instagram/* routes
  - [ ] /api/youtube/* routes
  - [ ] /api/agent routes
  - [ ] Any other API integrations

### Phase 4: Payment Integration (Stripe)
Files to create:
- [ ] `lib/stripe.ts` - Stripe client setup
  ```typescript
  import Stripe from 'stripe';
  export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  ```

- [ ] `/api/stripe/checkout` - Create Stripe checkout session
  ```typescript
  // Create checkout for Lite or Pro
  // Set recurring billing
  // Return checkout URL
  ```

- [ ] `/api/stripe/webhook` - Handle Stripe events
  ```typescript
  // payment_intent.succeeded
  // customer.subscription.created
  // customer.subscription.updated
  // customer.subscription.deleted
  ```

- [ ] Update register flow
  ```typescript
  // After user signs up:
  // Call /api/subscription/init-trial
  // Redirect to /pricing after 7 days
  ```

### Phase 5: Frontend Pages
Files to create/update:
- [ ] `/upgrade-required` page
  ```
  "Your free trial has ended. Upgrade to continue."
  Buttons: "Upgrade to Lite" | "Upgrade to Pro"
  ```

- [ ] `/dashboard/subscription` page
  ```
  Show:
  - Active plan
  - Days remaining (if trial)
  - API cost this month
  - Usage breakdown
  - Upgrade/Downgrade buttons
  ```

- [ ] `/dashboard/billing` page
  ```
  Show:
  - Payment method
  - Billing history
  - Usage limits
  - Upgrade options
  ```

- [ ] Update `/pricing` to handle redirects
  ```
  - Free Test users: "Upgrade to Lite/Pro"
  - Lite/Pro users: "Manage Subscription"
  ```

### Phase 6: Middleware & Routing
Files to create:
- [ ] Update `middleware.ts`
  ```typescript
  // Check if trial expired
  // Redirect to /upgrade-required if needed
  // Add usage limits check to request headers
  ```

- [ ] `components/PlanGate.tsx` - Component to block features
  ```typescript
  // Wrap feature components
  // Show "Upgrade to Pro" if not available
  ```

### Phase 7: Email Notifications
Files to create:
- [ ] `lib/emails.ts` - Email templates
  - [ ] Trial expiring soon (day 6)
  - [ ] Trial expired (day 7)
  - [ ] Subscription confirmed
  - [ ] Payment failed

### Phase 8: Testing & QA
- [ ] Test free trial flow end-to-end
- [ ] Test upgrade to Lite
- [ ] Test upgrade to Pro
- [ ] Test API cost limits enforcement
- [ ] Test trial expiration
- [ ] Test payment webhook handling
- [ ] Test downgrade flow
- [ ] Test cancellation flow

---

## 📋 STRIPE SETUP REQUIRED

### 1. Create Stripe Account
```bash
# Go to https://stripe.com
# Create account
# Get API keys from Dashboard
```

### 2. Create Products
```
Product 1: MarketHub Lite Plan
- Price: $20/month (recurring)
- Billing: Monthly
- Get Price ID: price_xxx

Product 2: MarketHub Pro Plan
- Price: $40/month (recurring)
- Billing: Monthly
- Get Price ID: price_yyy
```

### 3. Setup Webhooks
```
Endpoint URL: https://yourdomain.com/api/stripe/webhook
Events to listen for:
- payment_intent.succeeded
- customer.subscription.created
- customer.subscription.updated
- customer.subscription.deleted

Get Webhook Secret: whsec_xxx
```

### 4. Environment Variables
```bash
STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
LITE_PLAN_PRICE_ID=price_xxx
PRO_PLAN_PRICE_ID=price_yyy
```

---

## 🗓️ ESTIMATED TIMELINE

| Phase | Task | Effort | Duration |
|-------|------|--------|----------|
| 1 | Database Setup | Low | 1 day |
| 2 | Trial Logic | Medium | 2 days |
| 3 | Plan Enforcement | Medium | 2 days |
| 4 | Stripe Integration | High | 3 days |
| 5 | Frontend Pages | High | 3 days |
| 6 | Middleware & Routing | Medium | 2 days |
| 7 | Email Notifications | Low | 1 day |
| 8 | Testing & QA | High | 3 days |
| **TOTAL** | | | **17 days** |

---

## 🎯 IMPLEMENTATION ORDER (Recommended)

### Week 1:
1. ✅ Setup database (Phase 1)
2. ✅ Implement trial logic (Phase 2)
3. ✅ Create plan enforcement (Phase 3)

### Week 2:
4. ✅ Stripe integration (Phase 4)
5. ✅ Frontend pages (Phase 5)

### Week 3:
6. ✅ Middleware setup (Phase 6)
7. ✅ Email system (Phase 7)
8. ✅ Testing (Phase 8)

---

## 🧪 Testing Checklist

### Free Trial Flow
- [ ] User registers
- [ ] Gets 7-day trial
- [ ] Can access all features
- [ ] Trial countdown works
- [ ] After 7 days: limited features
- [ ] Can upgrade to Lite/Pro

### Lite Plan
- [ ] User upgrades to Lite
- [ ] Stripe charges $20
- [ ] Gets Lite features
- [ ] API cost tracked
- [ ] Throttled at $20 limit
- [ ] Can't exceed limit

### Pro Plan
- [ ] User upgrades to Pro
- [ ] Stripe charges $40
- [ ] Gets Pro features
- [ ] API cost tracked
- [ ] Throttled at $40 limit
- [ ] Can't exceed limit

### Billing
- [ ] Monthly reset works
- [ ] Subscription renewal works
- [ ] Can downgrade/upgrade
- [ ] Can cancel subscription
- [ ] Webhook processing works

---

## 📞 Support & Documentation

### For Users
- [ ] Pricing page with all info
- [ ] FAQ section
- [ ] Upgrade/downgrade guide
- [ ] Billing FAQ
- [ ] Contact support link

### For Developers
- [ ] PRICING_SYSTEM.md
- [ ] Database schema comments
- [ ] API documentation
- [ ] Code comments in critical areas
- [ ] Troubleshooting guide

---

## 🚀 GO LIVE CHECKLIST

Before launching:
- [ ] All phases completed
- [ ] All tests passing
- [ ] Stripe live keys configured
- [ ] Email system tested
- [ ] Error handling robust
- [ ] Rate limiting in place
- [ ] Monitoring set up
- [ ] Support process documented
- [ ] Terms of service updated
- [ ] Privacy policy covers billing

---

## 📊 Success Metrics

Track after launch:
- [ ] Free trial conversion rate (target: 30% upgrade)
- [ ] Lite plan adoption (target: 20% of paid)
- [ ] Pro plan adoption (target: 80% of paid)
- [ ] Churn rate (target: <5% monthly)
- [ ] API cost overruns (target: 0)
- [ ] Support tickets related to billing (target: <5%)

---

## 💡 Next Steps

1. **Today**: Review this roadmap and PRICING_SYSTEM.md
2. **Tomorrow**: Setup Stripe account
3. **Next day**: Execute pricing-schema.sql in Supabase
4. **Then**: Start Phase 1 implementation
5. **Follow**: Implementation order above

**Questions?** Check PRICING_SYSTEM.md or ask Claude!
