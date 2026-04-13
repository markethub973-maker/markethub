# N8N Workflow Templates

5 seeded workflows matching the rows in Supabase `automation_templates`.
Import each into n8n via Settings → Import from File, then **Activate** the
workflow so its webhook becomes live.

Each workflow follows the same contract:

**Webhook input** (from MarketHub `/api/n8n/trigger`):
```json
{
  "run_id": "uuid",
  "user_id": "uuid|null",
  "inputs": { /* per-template */ }
}
```

Headers: `X-MarketHub-Signature: sha256=<hex>` — n8n workflows MUST verify
this against `$env.MARKETHUB_WEBHOOK_SECRET` before proceeding.

**Callback** (at the end, via HTTP Request node):
- URL: `{{ $env.MARKETHUB_API_BASE }}/api/n8n/callback`
- Method: POST
- Body: `{ run_id, status: "succeeded"|"failed", output?, error? }`
- Compute HMAC signature with same secret, set `X-MarketHub-Signature`.

## Templates

| File | Slug | Category |
|------|------|----------|
| social-cross-post.stub.json    | social-cross-post    | social |
| lead-to-crm.stub.json          | lead-to-crm          | crm |
| weekly-report-email.stub.json  | weekly-report-email  | reporting |
| content-recycle-best.stub.json | content-recycle-best | content |
| stripe-to-slack.stub.json      | stripe-to-slack      | integration |

These are **stubs** — the webhook node + signature verification + callback
are wired, but the business-logic nodes between them need to be connected
to the respective platform APIs inside the n8n editor. This keeps each
file small enough to commit; the full-fledged versions with platform
nodes are built in the n8n UI and exported back to this folder after
testing.

## Follow-up sessions

Sprint 1 delivers 5/30 templates (representative coverage across all 5
categories). Remaining 25 to build in a follow-up M10.2 session:
- Social: scheduling, story repost, hashtag research, competitor alerts, mention DM
- CRM: deal-stage advance, lost-lead reactivation, contact enrichment, email drip, birthday DM
- Reporting: monthly PDF, agency white-label export, budget alert, client-facing dashboard link, Slack daily standup
- Content: AI caption regenerator, thumbnail A/B, SEO title optimizer, transcript → blog, brand-voice check
- Integration: Zapier bridge, Notion sync, Google Sheets pivot, Airtable import, GitHub issue from ticket
