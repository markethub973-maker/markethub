# N8N Workflow Templates — 31 total

All templates are seeded in Supabase `automation_templates`. Each row appears
in `/dashboard/automations` catalog as soon as the n8n instance is live.

The n8n **workflow JSON** is built per-template inside the n8n editor,
starting from `_template-scaffold.stub.json` which provides the standard
Webhook → Verify HMAC → Work → Callback skeleton.

## Contract (all workflows)

**Webhook input** (from MarketHub `/api/n8n/trigger`):
```json
{ "run_id": "uuid", "user_id": "uuid|null", "inputs": { /* per-template */ } }
```

Headers: `X-MarketHub-Signature: sha256=<hex>` — workflows MUST verify
against `$env.MARKETHUB_WEBHOOK_SECRET` before any action.

**Callback** (end of workflow → HTTP Request node):
- URL: `{{ $env.MARKETHUB_API_BASE }}/api/n8n/callback`
- Method: POST
- Body: `{ run_id, status: "succeeded"|"failed", output?, error? }`
- HMAC-sign the raw body with same secret, set `X-MarketHub-Signature`.

## Catalog

### 📱 Social (10)
| Slug | Plan | Purpose |
|------|------|---------|
| social-cross-post | creator | Post to multiple platforms at once |
| social-schedule-bulk | pro | Queue 50+ posts from CSV |
| social-story-repost | pro | Re-post best story weekly |
| social-hashtag-research | pro | Weekly trending hashtag email |
| social-competitor-alert | pro | Telegram ping on viral competitor post |
| social-mention-dm | studio | Auto-DM anyone who @mentions you |
| social-best-time-post | creator | Auto-schedule to audience peak hour |
| social-viral-watch | studio | Boost your posts that go viral |
| social-platform-migrate | pro | AI-reformat LinkedIn → Twitter/IG/TT |
| social-follower-churn | pro | Weekly churn attribution report |

### 👥 CRM (8)
| Slug | Plan | Purpose |
|------|------|---------|
| lead-to-crm | pro | Form/scrape → enriched CRM contact |
| crm-stage-advance | pro | Signal-based deal-stage automation |
| crm-lost-reactivate | pro | 90d email to lost leads with new angle |
| crm-enrich-contact | pro | Company size, industry, tech stack auto-fill |
| crm-email-drip | pro | 5-step 14-day nurture sequence |
| crm-birthday-dm | pro | AI-personalized birthday message |
| crm-silent-account | pro | Alert on idle paying customer |
| crm-referral-track | pro | Auto-credit referrer + thank you |

### 📊 Reporting (5)
| Slug | Plan | Purpose |
|------|------|---------|
| weekly-report-email | pro | Monday PDF of last week's metrics |
| reporting-monthly-pdf | pro | White-label monthly client report |
| reporting-budget-alert | pro | Ad-spend 80%/95% Telegram alerts |
| reporting-client-dashboard | studio | Live URL per client (embeddable) |
| reporting-daily-slack | creator | 09:00 weekday Slack standup |

### ✍️ Content (7)
| Slug | Plan | Purpose |
|------|------|---------|
| content-recycle-best | pro | Re-post top 3 monthly with rewording |
| content-ai-caption | creator | 3 AI caption variants + auto-pick winner |
| content-thumbnail-ab | studio | YouTube thumbnail A/B auto-rotate |
| content-seo-title | creator | 5 SEO title alts with search volume |
| content-transcript-blog | pro | YT/TT video → 600-word SEO blog |
| content-brand-voice | pro | Score posts vs brand voice, block <70 |
| content-trending-remix | pro | Daily trending-sound hook deck |

### 🔌 Integrations (1)
| Slug | Plan | Purpose |
|------|------|---------|
| stripe-to-slack | pro | Stripe events → Slack channel |

## Build order (suggested — when n8n is live)

**Phase 1 — power-user essentials** (build first, test end-to-end):
1. social-cross-post ← already user-tested in dev
2. lead-to-crm
3. weekly-report-email
4. stripe-to-slack

**Phase 2 — scheduling + calendar** (leverage existing MarketHub cron):
5. social-schedule-bulk
6. social-best-time-post
7. content-recycle-best
8. reporting-daily-slack

**Phase 3 — AI-heavy** (higher token cost, activate conditionally):
9. content-ai-caption
10. content-seo-title
11. content-transcript-blog
12. content-brand-voice
13. crm-email-drip

**Phase 4 — monitoring & alerts**:
14. social-competitor-alert
15. social-viral-watch
16. social-follower-churn
17. crm-silent-account
18. reporting-budget-alert

**Phase 5 — "delight" features** (last, after core validates):
19-31. remaining templates

Each is independent — no cross-dependencies. Break into batches of 3-5 per
day once n8n is provisioned.
