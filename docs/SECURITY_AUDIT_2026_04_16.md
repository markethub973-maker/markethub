# Security Audit — markethubpromo.com — 2026-04-16

Audit black-box pe producție. Nu s-au făcut modificări de cod.

## 1. Security Headers (/, /pricing, /features, /api/health)
| Header | Status | Value |
|---|---|---|
| Strict-Transport-Security | 🟡 | `max-age=31536000` — lipsește `includeSubDomains` și `preload` |
| Content-Security-Policy | 🟡 | Prezent, dar conține `'unsafe-inline'` pentru script-src și style-src |
| X-Frame-Options | 🟢 | `DENY` |
| X-Content-Type-Options | 🟢 | `nosniff` |
| Referrer-Policy | 🟢 | `strict-origin-when-cross-origin` |
| Permissions-Policy | 🟢 | `camera=(), microphone=(), geolocation=()` |
| X-XSS-Protection | 🟢 | `1; mode=block` (legacy dar ok) |

## 2. CORS
🟡 **Warning** — `/api/health` răspunde cu `access-control-allow-origin: *` și paginile prerenderate (`/pricing`, `/login`) la fel. Nu reflectă `evil.com` (bine), dar `*` pe asset-uri cache este acceptabil; pe API e discutabil. `/api/health` nu e sensibil, dar verifică toate rutele `/api/*` să nu aibă wildcard pe mutație.

## 3. Exposed Paths
| Path | Status | Rating |
|---|---|---|
| `/.env` | 403 | 🟢 (ideal 404, dar nu leak) |
| `/.git/config` | 403 | 🟢 |
| `/admin` | 307 → `/login?next=/admin` | 🟢 |
| `/.well-known/security.txt` | 200, RFC 9116 complet | 🟢 |

security.txt conține Contact, Expires 2027-04-14, Canonical, Policy, Acknowledgments, Preferred-Languages. Excelent.

## 4. Rate Limiting
🔴 **Critical** — 10 request-uri rapide către `/api/health` → 10× 200, zero 429. Lipsește rate limit aplicativ (Cloudflare WAF rules probabil whitelist health). Verifică că rutele sensibile (`/api/auth/login`, `/api/v1/*`, `/api/ai/*`) au rate limit real — health nu indică, dar absența unui 429 global este îngrijorătoare.

## 5. Cookie Security
🟢 `/login` (GET) nu setează cookie — corect, session se emite la POST success. POST `/api/auth/login` cu credențiale invalide a returnat 404 (ruta probabil are alt path sau e Supabase direct). Nu s-a putut inspecta Set-Cookie în acest test; recomand verificare manuală cu credențiale valide pentru `HttpOnly; Secure; SameSite=Lax/Strict`.

## 6. CSRF / Origin Check
🟡 `/api/auth/login` a returnat 404 la POST cu Origin=evil.com — endpoint-ul nu există la acea cale. Middleware-ul de origin-check nu poate fi validat fără ruta corectă. Recomand audit intern al CSRF guard pe rutele `/api/v1/*` write (POST/DELETE/PATCH).

## 7. HTTPS Enforcement
🟢 `http://markethubpromo.com/` → `301 → https://markethubpromo.com/` (Cloudflare edge).

## 8. /api/docs
🟢 Returnează HTML documentation pagina (nu JSON OpenAPI raw). Gated "Pro plan or higher" în meta description. Nu leak routes interne, DB schemas, sau stack traces. SSR pagina publică — acceptabil.

## Sumar
- 🔴 **1 critical**: rate limiting invizibil pe `/api/health` — necesită verificare pe rutele sensibile.
- 🟡 **3 warnings**: HSTS fără `includeSubDomains; preload`, CSP cu `unsafe-inline`, CORS `*` pe `/api/health`.
- 🟢 **Rest bun**: frame options, nosniff, referrer, permissions, HTTPS redirect, security.txt, exposed paths blocate, admin gate, /api/docs safe.

**Prioritate fix**: (1) confirmare rate limit pe auth/AI endpoints, (2) HSTS preload upgrade, (3) CSP nonce pentru eliminarea `unsafe-inline`.
