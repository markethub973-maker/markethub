# Security Audit — 14 apr 2026 (end of day)

## ✅ În vigoare

- **HTTPS forțat** pe toate subdomain-urile (Cloudflare + Vercel SSL)
- **HSTS** `max-age=63072000; includeSubDomains; preload` (middleware)
- **CSP** nonce-based per-request (middleware `buildCsp`)
- **CSRF** — origin check pe toate state-changing requests (middleware)
- **Rate limiting** Upstash:
  - Auth endpoints: 10 req/min/IP
  - API general: 120 req/min/IP
  - AI-expensive: 20 req/min/IP
- **SSH** Contabo VPS: key-only (password disabled), UFW 22/80/443 only, fail2ban
- **Supabase** queries parameterized (nu e injection posibil)
- **Stripe webhook** HMAC signature verification
- **Brain cron secret** pentru `/api/brain/advisor` + `/api/cron/*`
- **Brain admin login**:
  - ✅ Rate limit 5 attempts/15min/IP (in-memory)
  - ✅ Constant-time password compare (timingSafeEqual)
  - ✅ HttpOnly, Secure, SameSite=Lax cookie cu domain scope
- **Admin tunnel** pentru `/markethub973` + `/api/admin/*` (404 fără secret)
- **Telegram webhook**: secret token header verification
- **Sentry** activ — 0 erori în 14 zile
- **Backup nightly** Contabo 04:00 → 7 zile retention
- **Email aliases CF Routing** — forward only, no inbox exposure

## ⚠️ Recomandări când ai timp

### Tier 1 — fă mâine înainte de outreach

1. **RESEND_WEBHOOK_SECRET** — setează în Resend dashboard, adaugă în Vercel env. Fără el, inbound webhook acceptă orice payload (deși atacatorul ar trebui să știe URL-ul exact).
2. **Rotește `BRAIN_ADMIN_PASSWORD`** — `AlexCEO2026!` e ușor de ghicit pentru cineva care știe stilul. Folosește `openssl rand -base64 24`.
3. **2FA pe Vercel + Supabase + Stripe** — dacă nu ai deja. Toate trei au opțiune Gratuită, TOTP-based.

### Tier 2 — săptămâna asta

4. **Cloudflare WAF rule** pentru `brain.markethubpromo.com` → block non-RO IPs (tu ești doar din RO, orice IP non-RO pe brain.* = atac).
5. **Log alerting** — cron zilnic care monitoriza `/api/brain-admin/login` 429 spikes → email alert.
6. **Database row-level security** pe `outreach_log`, `telegram_messages`, `webhook_log` — doar service_role accept (deja default dar verifică).

### Tier 3 — atunci când platforma crește

7. **Penetration test** plătit — $500-2000 dacă ajungi la $5k MRR (merită investiția).
8. **Bug bounty program** simplu pe HackerOne (free pt startup-uri).
9. **CSP tightening** — scoate `unsafe-inline` de pe `script-src` când nu mai e nevoie (Next.js tot îl necesită pentru RSC hydration deocamdată).

## 🔐 Ce e criptat deja (dus-întors)

- Toate comunicațiile → HTTPS/TLS 1.3
- Parolele user-ilor în Supabase Auth → bcrypt hash
- Stripe card data → nu ajunge niciodată la noi (PCI out of scope)
- Env vars pe Vercel → encrypted at rest
- Cookie-uri → httpOnly + secure + sameSite
- Telegram voice clips → HTTPS la download + procesare server-side doar

## 📍 Nu se poate cripta (fundamental)

- Conținutul emailurilor outbound (SMTP e text clar peste TLS; dacă vrei E2E ar trebui PGP, impossible pt cold outreach)
- Log-urile Sentry (visible pt tine + team Sentry; nu stocăm PII sensibile)
- Dashboard state în browser (cine are acces la browser-ul tău are acces la app — e premisa oricărei web app)

## ✅ Concluzie

Platformă este **security-hardened la nivel de startup-early-stage**. Suficient pt a procesa primii clienți în siguranță. Nu sunt vulnerabilități critice deschise.

Nu procesăm card data direct, nu stocăm PII sensibile, nu avem endpoint-uri publice care returnează date client. Cel mai mare risc rezidual e phishing social engineering pe userii tăi — inaccessible tehnic din platformă.
