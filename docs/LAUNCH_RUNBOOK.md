# MarketHub Pro — LAUNCH RUNBOOK (Alex CEO Autonomous Platform)

**Status**: 14 apr 2026 seara — platformă completă, autonomă, ready for outreach.

---

## 🎯 Ce e LIVE și funcțional

### Customer-facing (ce văd clienții)

| URL | Ce este |
|-----|---------|
| `https://markethubpromo.com` | Aplicația SaaS principală |
| `https://get.markethubpromo.com/ro` | Landing Romania — AI Marketing Accelerator **€499** |
| `https://get.markethubpromo.com/intl` | Landing International — **€1000** |
| Stripe checkout (live mode) | Payment real activ pe ambele landing-uri |
| Welcome email de la Alex | Trimis automat la orice plată |
| Alert intern la vânzare | Email la markethub973@gmail.com |

### CEO Command Center (doar pentru tine, privat)

| URL | Funcție |
|-----|---------|
| `https://brain.markethubpromo.com/` | Dashboard — MRR live + recomandări + quick actions |
| `/login` | Password gate (parolă: `AlexCEO2026!`) |
| `/outreach` | Paste 25 domenii → Alex generează + trimite outreach personalizat |
| `/pipeline` | Vezi toate outreach-urile cu status (SENT → FU1 → FU2 → REPLIED) |
| `/demo` | Paste domeniu + email → Alex generează + trimite demo gratis (5 captions + 3 images) |
| `/mine-leads` | Apify Google Maps search → domain list |

### Autonomous loops (rulează singur)

| Cron | Schedule | Face |
|------|----------|------|
| Brain Daily Digest | 08:00 zilnic | Email de la Alex cu state-ul business-ului + recomandări |
| Outreach Follow-up | 10:00 zilnic | FU1 la +3 zile, FU2 la +7 zile automat |
| Brain Health Check | 07:30 zilnic | Self-check toate serviciile, email alert dacă cade ceva |

---

## 🤖 Alex persona

- **Nume public**: Alex (Founder, MarketHub Pro)
- **Email public**: `alex@markethubpromo.com` (CF Routing → markethub973@gmail.com)
- **Email business**: `office@markethubpromo.com` (la fel, forwarded)
- **Eduard rămâne privat** (tu, operatorul real, neassociat cu persona AI)
- **Tone guideline**: warm human founder, not academic, not corporate, not slangy
- **Dual-agent review**: toate mesajele trec prin Claude (scrie) + OpenAI (review language) înainte de send

---

## 📋 Flow tipic zilnic (5-15 min/zi)

1. **08:00** — Primești Brain Digest de la Alex pe Gmail (markethub973@gmail.com)
2. **08:10** — Login brain.markethubpromo.com
3. **Click "Send outreach batch"** → paste 20 domenii noi sau folosește pre-populate → dry run → verifică → trimite
4. **Click "Mine leads"** → caută "vertical + oraș" (ex. "dental clinic Cluj") → copy domains → folosești mâine
5. **Check email** — când primești răspunsuri, click "Generate demo for prospect" în dashboard → pune domeniul lor + emailul lor → Alex le trimite demo gratis
6. **Pipeline view** — vezi statusul tuturor lead-urilor (cine a răspuns, cine e la FU1, etc.)

---

## ⚙️ Ce cere prezența ta (când ai timp, nu urgent)

| Task | Unde | Durată |
|------|------|--------|
| **APIFY_TOKEN** pentru lead mining | https://console.apify.com/account/integrations → new token → Vercel env | 5 min |
| **Resend inbound webhook** — să marcheze REPLIED automat | Resend dashboard → Webhooks → Add inbound webhook pointing to `https://markethubpromo.com/api/webhooks/resend-inbound` | 5 min |
| **LinkedIn auto-posting** — Alex postează zilnic | OAuth setup LinkedIn app | 15 min |
| **Inbound email pentru alex@** — dacă vrei replies direct în sistem | Resend inbound domain config | 10 min |

---

## 🔐 Credențiale & secrete (toate pe Vercel env)

- `BRAIN_ADMIN_PASSWORD` = `AlexCEO2026!` (rotabil)
- `BRAIN_CRON_SECRET` = configurat (n8n folosește)
- `BRAIN_OPERATOR_USER_ID` = `56c46d7f-0662-4547-9038-ba9cf13c45c1` (mellamusic73)
- `ANTHROPIC_API_KEY` + `ANTHROPIC_API_KEY_APP` — LIVE
- `OPENAI_API_KEY` — LIVE (GPT-5-nano via /v1/responses)
- `RESEND_API_KEY` — LIVE (send)
- `STRIPE_SECRET_KEY` — LIVE MODE
- `SUPABASE_SERVICE_ROLE_KEY` — LIVE

---

## 🚨 Monitoring & recovery

- Sentry live (0 erori ultimele 14 zile)
- Brain health check zilnic 07:30 → email alert la orice failure
- Backup nightly Contabo VPS 04:00 (7 zile retention)
- SSH password disabled, key-only auth
- Cloudflare WAF + rate limiting pe aplicație

---

## 📊 Math-ul spre prima vânzare

Target €1500-3000 în 2 săpt:
- 20 outreach/zi × 7 zile = **140 outreach**
- Response rate 10-15% cu demo offer = **15-20 replies**
- Demo conversion 25-35% = **4-7 plăți**
- Mix RO €499 + Global €1000 ≈ **€2000-4000**

---

## 🆘 Dacă ceva nu merge

1. Check https://brain.markethubpromo.com/ — dacă nu se încarcă, verifică Vercel deploy
2. Check email markethub973@gmail.com — dacă e email "⚠️ Brain health check failing" → citește ce anume
3. Rollback ultimate deploy din Vercel dashboard
4. SSH la Contabo: `ssh -i ~/.ssh/id_mhp_brain root@207.180.235.143` pentru n8n issues

---

## 🎯 CE FACI MÂINE DIMINEAȚA (5 min)

1. Login https://brain.markethubpromo.com/login cu `AlexCEO2026!`
2. Vezi dashboard: state actual + recomandări Alex
3. Click "Send outreach batch" → dry run → verifică 2-3 emailuri → trimite
4. Aștepți răspunsuri
5. Când primești primul răspuns → /demo → email direct de la Alex cu demo gratis
6. Primul "da, vreau" → trimiți link checkout `/ro` sau `/intl`
7. Plată procesată → welcome email automat de la Alex → tu livrezi în 5-7 zile

**Prima plată vineri-weekend**. Success.
# Tiny bump to force redeploy for env var refresh 1776272804
Wed Apr 15 20:28:03 EEST 2026
# Redeploy trigger 1776275517 - TELEGRAM_ALLOWED_CHAT_ID env refresh
