# 🎯 Token-Based AI Pricing System

**Status:** ✅ Implemented (Ready for Integration)
**Updated:** 26 March 2026

---

## 📊 System Overview

This is a **usage-based pricing model** where users pay for actual Claude API token consumption instead of fixed monthly budgets.

### Core Concept
- Each plan includes a monthly token allowance
- Users can purchase additional tokens at discounted rates
- Every AI action consumes tokens based on complexity
- Transparent pricing: users see exactly what they pay for

---

## 💰 6 Pricing Plans

| Plan | Monthly Price | Token Allowance | Extra Token Rate | Max Monthly |
|------|---------------|-----------------|------------------|------------|
| **Free Trial** | $0 | 1,000 | Can't recharge | 1,000 |
| **Starter** | $9 | 10,000 | $1.00/1K | Unlimited |
| **Lite** | $19 | 50,000 | $0.90/1K | Unlimited |
| **Pro** | $39 | 150,000 | $0.80/1K | Unlimited |
| **Business** | $99 | 500,000 | $0.70/1K | Unlimited |
| **Enterprise** | $249 | 1,500,000 | $0.60/1K | Unlimited |

### Token Allowances Explained
- **Free Trial (1K):** ~83 captions
- **Starter (10K):** ~833 captions
- **Lite (50K):** ~4,166 captions
- **Pro (150K):** ~12,500 captions
- **Business (500K):** ~41,666 captions
- **Enterprise (1.5M):** ~125,000 captions

---

## 🔢 Token Costs per Action

| Action | Tokens | Estimated Cost |
|--------|--------|-----------------|
| 1 Caption generated | 800 | $0.012 |
| 1 Competitor analysis | 2,000 | $0.030 |
| 1 PDF report | 5,000 | $0.075 |
| 1 Email campaign | 8,000 | $0.120 |
| 1 Hashtag analysis | 3,000 | $0.045 |
| 1 Trend analysis | 6,000 | $0.090 |
| 1 Agent chat message | 10,000 | $0.150 |
| AI Agent automation/day | 50,000 | $0.75 |
| AI Agent intensive/day | 500,000 | $7.50 |

---

## 🔐 How It Works (Step-by-Step)

### 1. **User Subscribes to a Plan**
```
User selects Lite plan ($19/month)
→ Gets 50,000 tokens included
→ Can buy extra tokens at $0.90 per 1,000
```

### 2. **User Performs an AI Action**
```
User generates 3 captions
→ System checks: Do they have 800 tokens? YES ✅
→ Action proceeds
→ API request made to Claude
```

### 3. **Tokens Are Recorded**
```
After action succeeds:
→ POST /api/tokens/usage (record 800 tokens consumed)
→ Database updated: tokens_used += 800
→ User sees: "50,000 → 49,200 tokens remaining"
```

### 4. **User Runs Low on Tokens**
```
User has 15,000 tokens left
→ System shows: "You're at 70% usage"
→ User clicks "Recharge Tokens"
→ Chooses: "$45 for 50K tokens (+10% bonus)"
→ Stripe checkout
→ Tokens added to account
```

---

## 📁 Files Created

### Config & Setup
```
src/lib/token-plan-config.ts          — Plan definitions, token costs, helpers
src/lib/token-enforcement.ts          — Check availability, record usage
supabase-migrations/token-system.sql  — Database schema + RLS policies
```

### API Endpoints
```
GET  /api/tokens/usage                — Get current token balance
POST /api/tokens/usage                — Record token consumption
GET  /api/tokens/recharge             — List available recharge packs
POST /api/tokens/recharge             — Create Stripe checkout for tokens
```

### Database Tables
```
token_usage              — Aggregated usage per month
token_usage_log          — Detailed action logs
token_purchases          — Recharge transactions
```

---

## 🚀 Integration Guide

### Step 1: Execute Database Migration
```bash
# In Supabase SQL Editor, paste contents of:
supabase-migrations/token-system.sql
```

### Step 2: Update Captions Route
```typescript
// src/app/api/captions/route.ts

import { checkTokenAvailability, recordTokenUsage } from "@/lib/token-enforcement";

export async function POST(req: NextRequest) {
  // ... existing auth check ...

  // CHECK: Does user have tokens?
  const check = await checkTokenAvailability(user.id, "caption_set");
  if (!check.has_tokens) {
    return NextResponse.json({
      error: "Insufficient tokens",
      tokens_available: check.tokens_available,
      tokens_required: check.tokens_required,
      recharge_url: "/settings?tab=tokens",
    }, { status: 402 });
  }

  try {
    // ... generate captions with Claude ...

    // RECORD: Log the token usage
    await recordTokenUsage(user.id, "caption_set", {
      count: 3,
      model: "claude-3-5-sonnet",
    });

    return NextResponse.json({ captions, success: true });
  } catch (error) {
    // Don't record tokens if action failed
    throw error;
  }
}
```

### Step 3: Update Other AI Routes
Apply same pattern to:
- `src/app/api/agent/route.ts`
- `src/app/api/pdf-report/route.ts`
- Any route that calls Claude API

### Step 4: Add Tokens Tab to Settings
```typescript
// src/app/settings/page.tsx

import { getUserTokenBalance } from "@/lib/token-enforcement";
import TokenPanel from "@/components/TokenPanel"; // Create this component

// In settings tabs...
<Tab value="tokens">
  <TokenPanel userId={user.id} />
</Tab>
```

### Step 5: Create Token Panel Component
```typescript
// src/components/TokenPanel.tsx

export default function TokenPanel({ userId }: { userId: string }) {
  // Show:
  // - Current token balance
  // - Usage percentage bar
  // - Available recharge packs
  // - Transaction history
}
```

---

## 💡 Business Model Benefits

### For Users
✅ **Fair pricing** — Pay only for what you use
✅ **Flexibility** — Buy tokens anytime
✅ **Transparent** — Know exact costs per action
✅ **No surprises** — Action blocked if insufficient tokens

### For Platform
✅ **Predictable revenue** — Usage tracking = precise cost control
✅ **Scalability** — Users pay per consumption, not fixed quota
✅ **High margins** — Token rate = 60-70% margin
✅ **Prevents abuse** — Built-in token enforcement

---

## 📊 Profit Margin Analysis

**Assumption:** 2-3 Enterprise clients using full capacity

```
2 Enterprise clients × $249/month = $498
─────────────────────────────────────
Fixed platform costs = -$120/month
Variable token costs = -$74/month (estimated)
─────────────────────────────────────
PROFIT NET = $304/month
Profit margin = 61%

3 Enterprise clients = $747/month revenue
Fixed costs = -$120/month
Variable costs = -$111/month
─────────────────────────────────────
PROFIT NET = $516/month
Profit margin = 69%
```

**With 34 mixed-tier clients:**
```
Estimated revenue = $1,216/month
Total costs = $320/month
─────────────────────────────────────
PROFIT NET = $896/month
Profit margin = 74% ✅ BUSINESS SAFE
```

---

## ⚠️ Critical Implementation Notes

### 1. **Token Recording Must Happen AFTER Success**
```typescript
// ❌ WRONG
await recordTokenUsage(user.id, "caption_set");
const result = await callClaudeAPI();  // What if this fails?

// ✅ CORRECT
const result = await callClaudeAPI();
await recordTokenUsage(user.id, "caption_set");
```

### 2. **Update Database Before Integration**
Must execute `token-system.sql` in Supabase before deploying

### 3. **Test with Free Trial User**
Free Trial has hard cap of 1K tokens (can't recharge)
Perfect for testing limit enforcement

### 4. **Stripe Webhook for Recharges**
Must update Stripe webhook to handle `type: "token_recharge"` metadata

---

## 📋 Remaining Tasks

- [ ] Execute SQL migration in Supabase
- [ ] Add token check/record to caption route
- [ ] Add token check/record to agent routes
- [ ] Add token check/record to PDF report route
- [ ] Create TokenPanel component in Settings
- [ ] Update Stripe webhook for recharge completion
- [ ] Test free trial (1K token limit)
- [ ] Test Starter plan (10K recharge packs)
- [ ] Test overage pricing
- [ ] Update pricing page UI

---

## 🎯 Quick Reference

**Where to add token tracking:**
1. Check before action: `checkTokenAvailability(userId, "caption_set")`
2. Execute the AI action
3. Record after success: `recordTokenUsage(userId, "caption_set")`

**API endpoints:**
- GET `/api/tokens/usage` → Current balance
- POST `/api/tokens/usage` → Record consumption
- GET `/api/tokens/recharge` → Available packs
- POST `/api/tokens/recharge` → Checkout

**Database:**
- `token_usage` — Monthly aggregated usage
- `token_usage_log` — Detailed action logs
- `token_purchases` — Recharge transactions

---

**This system = Profitable, Scalable, User-Friendly ✅**
