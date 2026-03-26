# TikTok Video Limit Implementation Guide

## Overview
Starter plan now has **10 TikTok videos/month** limit with upgrade prompts.

## Component: TikTokLimitWarning

### Location
```
src/components/TikTokLimitWarning.tsx
```

### Usage in Settings/Dashboard

```tsx
import TikTokLimitWarning from "@/components/TikTokLimitWarning";

export default function SettingsPage() {
  // Get user's current TikTok usage from API/database
  const tiktokUsage = 10; // Example: user has created 10 videos
  const planLimit = 10;   // Starter plan limit

  return (
    <div>
      {/* Show warning if at limit */}
      <TikTokLimitWarning
        currentUsage={tiktokUsage}
        limit={planLimit}
        planName="Starter"
      />

      {/* Rest of settings page */}
    </div>
  );
}
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `currentUsage` | number | 10 | Current month's TikTok video count |
| `limit` | number | 10 | Monthly limit based on plan |
| `planName` | string | "Starter" | User's current plan name |

### Features

✅ Shows warning only when limit is reached
✅ Displays usage bar with percentage
✅ Lists upgrade options (Lite, Pro, Business)
✅ Direct links to Pricing and Upgrade pages
✅ Responsive design with Tailwind CSS

---

## Implementation Steps (For Full Integration)

### 1. Track TikTok Usage in Database
```sql
-- Add to token_usage_log or create new table
CREATE TABLE tiktok_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  month_year VARCHAR(7) NOT NULL,
  videos_created INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, month_year)
);
```

### 2. Record Usage on Video Creation
```tsx
// In TikTok video creation API route
await db.from("tiktok_usage").upsert({
  user_id: user.id,
  month_year: "2026-03",
  videos_created: currentCount + 1,
});
```

### 3. Check Limit Before Action
```tsx
// In TikTok feature components
const { data: usage } = await supabase
  .from("tiktok_usage")
  .select("videos_created")
  .match({ user_id, month_year });

if (usage.videos_created >= PLAN_LIMITS[plan]) {
  // Show upgrade prompt
  return <TikTokLimitWarning {...props} />;
}
```

### 4. Enforce in Settings Page
```tsx
// In Settings component
<TikTokLimitWarning
  currentUsage={tiktokUsage}
  limit={getUserPlanLimit(userPlan)}
  planName={userPlan}
/>
```

---

## Plan Limits

| Plan | TikTok Limit |
|------|-------------|
| Free Trial | No TikTok Access |
| Starter | 10 videos/month |
| Lite | Unlimited |
| Pro | Unlimited |
| Business | Unlimited |
| Enterprise | Unlimited |

---

## Testing

**To see the warning on local:**

```tsx
// In any settings/dashboard page
<TikTokLimitWarning
  currentUsage={10}
  limit={10}
  planName="Starter"
/>
```

This will display the warning immediately.

---

## Next Steps

1. ✅ Pricing page updated (Starter: 10 videos/month)
2. ✅ Warning component created
3. ⏳ Add to Settings page
4. ⏳ Implement database tracking
5. ⏳ Add enforcement logic in TikTok API routes
6. ⏳ Test with real usage

