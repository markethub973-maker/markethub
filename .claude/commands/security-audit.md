# Security Audit — MarketHub Pro
# Rulează cu: /security-audit
# Actualizat conform: OWASP Top 10, OWASP LLM Top 10, checklist-securitate-aplicatii-ai.pdf

Lansează o echipă de 5 agenți de securitate în paralel (arhitectura din documentul checklist-securitate-aplicatii-ai), 
sintetizează rezultatele și fixează toate problemele critice și ridicate găsite.

## Echipa de agenți (rulează în paralel)

### Agent 1 — Auth Reviewer
Auditează autentificare, sesiuni, CSRF, OAuth, admin auth, rate limiting pe auth paths, cookie security (HttpOnly/Secure/SameSite), timing attacks pe login.

### Agent 2 — Injection Tester  
Auditează SQL injection (Supabase queries cu input user), XSS (dangerouslySetInnerHTML, output AI nesanitizat), prompt injection în rutele AI, NoSQL injection, path traversal, header injection.

### Agent 3 — IDOR Scanner
Auditează Insecure Direct Object Reference: ownership checks (.eq user_id), UUID vs sequential IDs, admin endpoint exposure, horizontal/vertical privilege escalation, client portal token entropy.

### Agent 4 — Secrets Scanner
Auditează secrete hardcodate, .gitignore, environment variables, system prompt leakage (info sensibile în prompts), console.log cu date sensibile, SSRF (URL-uri user-controlled fetch-uite server-side).

### Agent 5 — Dependency Auditor
Auditează npm audit (vulnerabilități critice/high), pachete abandonate, versiuni pinuite vs range, lockfile integrity, configurare greșită Next.js/Vercel, NEXT_PUBLIC_ cu date sensibile, logging insuficient.

## Instrucțiuni de execuție

1. Lansează toți 5 agenții în paralel cu `run_in_background: true`
2. Așteaptă toate rezultatele
3. Sintetizează într-un **Raport Final** cu:
   - CRITIC (roșu) — fix IMEDIAT înainte de orice altceva
   - RIDICAT (portocaliu) — fix în 48h
   - MEDIU (galben) — planifică fix în sprint-ul următor
   - OK — confirmat securizat
4. Fixează automat toate problemele CRITIC și RIDICAT
5. Rulează testul e2e de securitate (`/tmp/prelaunch_master_test.mjs`) pentru validare
6. Commit și push fix-urile cu mesaj `fix(security): [descriere]`

## Când să rulezi

- **Înainte de orice lansare** (campanie marketing, promo nouă)
- **După orice feature major** adăugat
- **Lunar** — ca audit periodic de rutină
- **Când apar CVE-uri noi** în dependențele folosite (Next.js, Supabase, Stripe)
- **Când OWASP publică update-uri** la Top 10 sau LLM Top 10

## Actualizări strategii securitate

Adaugă în acest fișier când apar tehnici noi de atac:

### v1.0 — Aprilie 2026 (inițial)
- OWASP Top 10 (A01-A10)
- OWASP LLM Top 10 (LLM01-LLM10)  
- Verificări specifice: RLS Supabase, rate limiting Upstash, admin tunnel HMAC, CSP nonce

### v1.1 — de adăugat când apar
- [ ] Verificare integritate Stripe webhook (HMAC sha256)
- [ ] Audit Oblio API credentials rotation
- [ ] Test prompt injection pe rutele find-clients cu payload-uri reale
- [ ] Verificare Content-Security-Policy strictness score
- [ ] Supply chain: verificare hash-uri pachete npm (npm shrinkwrap)
