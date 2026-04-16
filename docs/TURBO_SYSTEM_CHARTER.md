# TURBO SYSTEM Charter — Rule #1 Operating Philosophy

**Authored**: Eduard, 2026-04-16 morning
**Status**: ABSOLUTE — overrides all other operational rules
**Binding on**: Alex + all 9 directors + platform + all future agents

---

## The rule, plainly

> "Time = money. We are a hybrid team (Eduard + AI). Agencies take weekends off, work 8h/day, have holidays. We don't. That IS the advantage."

## Cadence

| Hours | Who | What |
|-------|-----|------|
| 06:30 – 02:00 daily | Eduard + Alex-team | active collaboration, building, shipping |
| 02:00 – 06:30 | Alex-team only | crons, monitoring, background work |
| 24/7 always-on | Platform | Gmail Triage, Reply Detector, LinkedIn cron, morning debate, turbo scout |

**Pause rules**:
- Only for a tech block we can't bypass (service down, rate limit hit, build fail)
- NEVER because "it's late" or "tomorrow"
- NEVER wait for perfect conditions — ship then iterate

## Non-negotiables (every agent must obey)

1. **No half-shipped features** — if we deploy, it's client-ready end-to-end
2. **No placeholder data** in production paths — real sources or we don't ship
3. **No TODOs in hot paths** — TODOs are only allowed in side-features, never revenue flow
4. **100% client serving before "done"** — we iterate until the customer outcome is proven
5. **Study best-in-class daily** — competitor pattern extraction is a team KPI

## Daily routines (codified in cron)

| Time UTC | Automation | Owner |
|----------|------------|-------|
| 06:45 | `/api/brain/turbo-scout` — scout tech + revenue + competitor | Leo |
| 07:00 | `/api/brain/morning-debate` — strategic debate based on state | Alex |
| 09:00 (Mon/Tue/Thu/Fri) | `/api/brain/linkedin-daily` — autonomous post | Alex persona |
| Every 5 min | `/api/cron/gmail-triage` (via n8n) — alerts + reply detection | Nora |
| Every 6h | Cockpit watchdog (GitHub Actions) — self-diagnosis | Platform |

## Self-improvement mandate (Eduard's explicit directive)

Every 24 hours the team MUST:
1. **Tech scout** — 1 new technology/API/service evaluated, ROI computed, implemented if >5x win
2. **Revenue scout** — 1 new monetization angle surfaced + priced
3. **Competitor pattern** — 1 specific move from top-10 competitors decoded + applied

Output persisted in `brain_knowledge_base` category `case_study`. Visible on `/brain-private/knowledge` UI. Telegram briefing attaches summary.

## Multi-tier revenue architecture

| Tier | Price | Target |
|------|-------|--------|
| Small | €20-50/mo SaaS | Solopreneurs, freelancers |
| Medium | €499 DFY one-time | SMBs needing 30-day accelerator |
| Large | €1000-2500 + retainer | Multi-location businesses, agencies |
| Premium | €5000+ white-label / mediation fee | Distribution-channel partners |
| Parallel teams | per-niche variant | Dental, agency, coach, ecom, legal (future) |

## Escape-free-tier roadmap (target: week 2-4 of real MRR)

| Service | Current | Target | Cost | Unlocks |
|---------|---------|--------|------|---------|
| Vercel | Free | Pro | €20/mo | 900s max duration, unlimited deploys, analytics |
| Supabase | Free | Pro | €25/mo | 8GB DB, no pause, daily backups |
| Anthropic | Pay as you go | Tier 4 | requires spend threshold | 4x rate limits |
| ElevenLabs | Free (10K chars) | Creator | €22/mo | 100K chars + voice clone + library |
| Apify | Free ($5 credit) | Starter | €49/mo | 20x compute |
| Cloudflare | Free | Pro | €25/mo | image opt + analytics |
| **Total escape cost** | €0 | **~€141/mo** | | covered by 1 DFY sale/month |

## Implementation hooks (today)

- [x] Rule codified in `brain_knowledge_base` as framework "TURBO SYSTEM Charter (Rule #1)"
- [x] `ALEX_KNOWLEDGE_BRIEF` prepended with Rule #0 (absolute) — every agent call reads it
- [x] `/api/brain/turbo-scout` endpoint live
- [x] Vercel cron `0 6 45 * * *` daily at 06:45 UTC (before morning debate)
- [x] Proxy whitelist updated (subdomain + CSRF exempt)
- [x] Knowledge base auto-populates with daily scout findings
- [x] Telegram briefing receives scout summary each morning

## What this means for Eduard

You no longer need to ask "what should we work on?". Every morning 06:45 the system has already:
1. Identified a new tech worth evaluating
2. Proposed a new revenue angle
3. Extracted a competitor pattern
4. Summed up the #1 priority action

You arrive, read Telegram, decide. Or override if you have bigger vision.

The team WORKS while you sleep. Non-stop.

**This is the rule. Every agent knows it. Every endpoint respects it. From now on.**
