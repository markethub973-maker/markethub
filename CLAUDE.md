@AGENTS.md

## REGULI STRICTE PERMANENTE — SE ÎNCARCĂ LA FIECARE SESIUNE

### 0. REGULA SUPREMĂ: ÎNTÂI TESTEZ, APOI COMUNIC
- NICIODATĂ nu comunic date, credențiale, linkuri, statusuri sau rezultate fără să le verific LIVE mai întâi
- Dacă dau un link → îl testez cu curl/open ÎNAINTE
- Dacă dau o parolă → o testez prin login API ÎNAINTE
- Dacă dau un status "funcționează" → o testez end-to-end ÎNAINTE
- Dacă fac un render/preview → îl deschid și verific ÎNAINTE de a-l arăta
- **Date false sau nefuncționale = INTERZIS. Mai bine spun "nu știu, verific" decât să dau date greșite.**

### 1. TEST LOCAL ÎNAINTE DE DEPLOY
- La orice modificare UI/cod, pornesc dev server (`npx next dev -p 3333`) dacă nu rulează deja
- DESCHID pagina pe `localhost:3333` pentru Eduard ÎNAINTE de deploy
- Iterez LOCAL până Eduard confirmă vizual (fiecare ciclu = 2 secunde, NU 3 minute pe Vercel)
- Deploy pe prod DOAR după validare locală

### 2. DUPĂ DEPLOY, DESCHID PAGINA PENTRU EDUARD
- Aștept versiunea nouă în `/api/health`
- `open "https://markethubpromo.com/[pagina-afectată]"` — Eduard vede automat rezultatul
- NU spun "verifică tu" — EU deschid pagina

### 3. NICIODATĂ NU RAPORTEZ "GATA" FĂRĂ:
- Build pass (TSC zero erori noi)
- Test vizual confirmat (local SAU prod)
- Corecții aplicate dacă erau probleme
- Raport final cu LISTA COMPLETĂ: fișiere modificate, ce s-a schimbat, HEAD commit, versiune prod

### 4. CICLUL COMPLET OBLIGATORIU:
```
modificare cod → dev server → open localhost → Eduard confirmă →
fix dacă trebuie → re-test local → push → deploy → open prod →
confirmare finală → raport complet
```

### 5. CREDENȚIALE ȘI DATE — VERIFICARE LIVE OBLIGATORIE
- Înainte de a da orice credențial (email/parolă/link) → TESTEZ login-ul LIVE prin API
- Înainte de a da orice link → TESTEZ cu curl că returnează HTTP 200
- Înainte de a da orice tabel de conturi → TESTEZ FIECARE cont individual
- Dacă un cont nu funcționează → ÎL REPAR sau spun clar "nu funcționează"
- NICIODATĂ nu dau date din memorie fără verificare live — memoria poate fi depășită

### Anti-pattern-uri INTERZISE:
- Deploy fără test local = timp pierdut
- "Am pushuit, verifică tu" = lene
- "TypeScript trece, deci e ok" = fals (TSC ≠ vizual corect)
- Iterez pe prod (push→wait→check→push→wait) = 3 min/ciclu pierdut
- Raportez "gata" fără confirmare vizuală = risc UI broken
- Dau credențiale din memorie fără test live = risc date false
- Dau linkuri fără curl test = risc 404/broken
- Spun "funcționează" fără probe = minciună
