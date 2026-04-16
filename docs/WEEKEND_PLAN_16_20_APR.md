# Weekend Plan — 16-20 aprilie 2026

Eduard's directive: "sambata + duminica = zile de relax. Pana atunci foc automat. Maiine deja campanie. Saptamana viitoare culegem raspunsuri."

## Timeline executat autonom

### JOI 16 apr (AZI, dimineața) — "foc automat"
**Tu**: dormi
**Alex**:
- [x] Reverse Strategy infrastructure complete (DB + endpoints + 9 agents trained)
- [x] Gap 4 closed: cross-sell populate auto via tagger
- [x] Gap 5 closed: /brain-private/knowledge UI live
- [x] Double-Sided Value Prop framework codified in knowledge base
- [ ] 09:30 wake-up fires — will correctly refuse dental send (gate blocks score 4)
- [ ] Run /api/brain/find-intermediaries for "SMBs needing marketing services"
- [ ] Scan top intermediary (digital agencies Bucuresti) — Nora pulses
- [ ] Sofia generates 22 personalized drafts with Reverse-Strategy pitch angle (leverage multiplier, not volume)
- [ ] 3 mostre delivered to Eduard's Telegram by ~11:00 local

### VINERI 17 apr — "campanie"
**Tu (10 min)**: 
- Cafea → citești 3 mostre pe Telegram
- "Trimite" / "modifică X"
**Alex**:
- [ ] 10:00: bat ch-ul real pleacă (22 email-uri via Resend)
- [ ] 10:05: Telegram confirm "✅ 22 outreach trimise"
- [ ] Rest of Friday: Gmail Triage la 5 min, Reply Detector live, Telegram ping la orice reply
- [ ] LinkedIn auto-post la 09:00 (deja în vercel cron)
- [ ] Morning debate 07:00 (deja în vercel cron)

### SÂMBĂTĂ 18 apr — "relax"
**Tu**: 0 acțiuni. Viață.
**Alex background**:
- Gmail Triage la 5 min — dacă cineva răspunde, Telegram ping
- Reply Detector marchează replied_at + trimite tu alert
- Gmail backup verify 04:00 (existing cron)

### DUMINICĂ 19 apr — "relax"
**Tu**: 0 acțiuni
**Alex background**: același ca sâmbătă

### LUNI 20 apr dimineața — "recoltă"
**Tu (30 min)**:
- Cafea → Telegram briefing 07:00 de la Alex
- Deschizi /pipeline → vezi cine a răspuns (estimat 2-4 reply-uri = 9-18% rate)
- Pentru fiecare reply: 1-click "Generate demo" → Alex trimite demo gratis
**Alex**:
- [ ] LinkedIn auto-post 09:00
- [ ] Follow-up cron 10:00 — FU1 la cei fără reply de joi
- [ ] Expected: 1-2 prospect → prețioasă conversație

### MARȚI-MIERCURI 21-22 apr — "primul client"
- Demo trimise duminică → primii dentiști sun (figurativ) să zică "OK, trimite link-ul"
- Tu → copy-paste link Stripe `/offer-ro` → ei plătesc €499 → Stripe webhook → welcome email automat de la Alex
- **Primul €499 în cont, marți sau miercuri**

---

## Automations care lucrează în timp ce tu dormi/relaxezi

| Automation | Cadență | Ce face |
|-----------|---------|---------|
| Morning debate | Zilnic 07:00 UTC | Alex briefing pe Telegram |
| LinkedIn daily | Mon/Tue/Thu/Fri 09:00 | Post automat profil personal |
| Gmail Triage | La 5 min | Detect reply + incident |
| Reply Detector | La 5 min (în Gmail Triage) | Mark outreach_log replied |
| Follow-up cron | Zilnic 10:00 | FU1 la 3 zile, FU2 la 7 zile |
| Backup verify | Zilnic 04:00 | Contabo VPS backup ok |
| Cron health check | La 6h | Alert dacă ceva pică |
| Cost monitor | La 6h | Alert dacă depășim 80% din orice limită |

## Decision tree vineri dimineață

```
Primești 3 mostre Telegram → te uiți 5 min
│
├─ Tonul sună ca tine?
│   ├─ DA → scrie "trimite" → batch real la 10:00
│   └─ NU → zi ce e wrong → Alex regenerează în 10 min
│
├─ Prețul e ok pentru agency vs dental?
│   ├─ €499 agency starter = bun pentru proof
│   └─ White-label subscription mai tarziu daca închidem
│
└─ Ai timp să procesezi 2-3 reply-uri pe zi?
    ├─ DA → send tot batch-ul (22)
    └─ NU → split în 2: 11 vineri + 11 luni
```

## Budget + ROI proiectat weekend

| Item | Cost | Sursă |
|------|------|-------|
| Apify scan agencies | ~$0.15 | Free tier $5/lună |
| Claude drafturi (22) | ~$0.20 | Anthropic pay-as-you-go |
| Resend send (22) | $0 | Free tier 100/zi |
| Reply processing | $0 | Gmail OAuth free |
| **TOTAL COST** | **$0.35** | |
| **Expected revenue** | **€499-998** | 1-2 clienți la €499 |
| **ROI** | **140x-280x** | pe săptămână |

---

## Formula Eduard (codified)

> "noi avem clienti ei produsul ei ne platesc noi dam clienti si invers noi avem produsul ei au nevoie de el dar in functie de deel adaptam cerere si oferta si oferta pentru cereri"

= Double-Sided Value Prop — jucăm ambele părți ale marketplace-ului, adaptăm pitch-ul la ce nevoie are prospectul (clienți sau produs).

Aplicat:
- Agency pitch: "Ai clienți, noi avem produsul — fă-l marja ta, eticheta ta, clienții sunt ai tăi."
- Dental pitch (viitor, cu ofertă nouă): "Noi avem clienți (pacienți care caută local), voi aveți serviciul — platformă unde vă găsesc."
- Platforma MarketHub Pro devine un **marketplace + SaaS hibrid**, nu doar SaaS.
