# Plan Implementare — MarketHub Pro Features
**Data:** 26 Martie 2026
**Status:** 🟡 ÎN AȘTEPTARE — gata de implementat diseară

---

## Ce s-a realizat DEJA azi:
- ✅ STRIPE_WEBHOOK_SECRET adăugat în Vercel
- ✅ STRIPE_SECRET_KEY adăugat în Vercel
- ✅ Webhook Stripe configurat (checkout.session.completed + customer.subscription.deleted)
- ✅ API Credentials Admin Dashboard: 9/9 = 100%
- ✅ Deployment live pe markethubpromo.com

---

## CERINȚA UTILIZATORULUI:
1. Implementare toate "Date valoroase neutilizate" din Settings → API Keys
2. Export Excel + PDF pe toate paginile cu date
3. Toate documentele AI să folosească stilul **"Professional Business Brief"**:
   - Rol: "Consultant de Business Senior"
   - Format: bullet points + subtitluri clare
   - Restricții: concis, factual, direct — fără "pălăvrăgeală"
   - Structura: Context | Obiective | Analiză | Recomandări | Pași Următori
   - Ton sobru, pragmatic, fără fraze de curtoazie

---

## FAZA 1 — Fundație (Primul de implementat)

### 1A. Instalează dependența
```bash
cd /Users/edyvanmix/Claude/viralstat-dashboard && npm install xlsx
```

### 1B. Creează `/src/lib/ai-prompts.ts`
Conține:
- `BUSINESS_BRIEF_SYSTEM_PROMPT` — promptul global pentru toate AI
- `buildSentimentPrompt(comments, platform)`
- `buildABTitlesPrompt(title, description, niche)`
- `buildMonthlyReportPrompt(metrics)`
- `buildWeeklyDigestPrompt(metrics)`

### 1C. Modifică `/src/lib/utils.ts` — adaugă `exportExcel()`
### 1D. Modifică `/src/lib/plan-config.ts` — adaugă costuri AI:
- sentiment_analysis: 0.03
- ab_titles: 0.02
- monthly_report: 0.10
- weekly_digest: 0.04

---

## FAZA 2 — API Routes AI

| Fișier nou | Descriere |
|-----------|-----------|
| `/src/app/api/ai/sentiment/route.ts` | POST — analiză sentiment comentarii |
| `/src/app/api/ai/ab-titles/route.ts` | POST — 10 variante titlu A/B |
| `/src/app/api/ai/monthly-report/route.ts` | GET — raport lunar AI |
| `/src/app/api/ai/weekly-digest/route.ts` | POST — digest săptămânal |

**Pattern de urmat:** `/src/app/api/captions/route.ts`

---

## FAZA 3 — Email Onboarding

**Modifică:** `/src/lib/resend.ts` — adaugă 5 funcții:
- `sendOnboarding1_Welcome` — Ziua 1: Ce poți face
- `sendOnboarding2_Setup` — Ziua 2: Conectează YouTube
- `sendOnboarding3_Instagram` — Ziua 3: Instagram Analytics
- `sendOnboarding4_Competitors` — Ziua 5: Analizează competitori
- `sendOnboarding5_ProTips` — Ziua 7: 5 tips avansate

---

## FAZA 4 — Date Noi (RapidAPI + YouTube + Instagram)

| Fișier nou | Sursă | Descriere |
|-----------|-------|-----------|
| `/src/app/api/tiktok/trending-sounds/route.ts` | RapidAPI | Sunete virale TikTok |
| `/src/app/api/tiktok/categories/route.ts` | RapidAPI | Trenduri pe categorii |
| `/src/app/api/instagram-scraper/batch/route.ts` | RapidAPI | 10-20 competitori simultan |
| `/src/app/api/instagram/reels-insights/route.ts` | Meta API | Plays, reach, shares Reels |
| `/src/app/api/youtube/multi-regional/route.ts` | YouTube API | Trending RO/UK/US/DE |

---

## FAZA 5 — Componente UI + Export

### Componente noi:
| Componentă | Descriere |
|-----------|-----------|
| `/src/components/ui/ExportButtons.tsx` | Butoane Export Excel + PDF (reusabil) |
| `/src/components/ui/SentimentAnalysisCard.tsx` | Card analiză sentiment comentarii |
| `/src/components/ui/ABTitlesGenerator.tsx` | Generator 10 titluri A/B |
| `/src/components/ui/TrendingSoundsCard.tsx` | Card TikTok trending sounds |
| `/src/components/ui/MultiRegionalTrending.tsx` | Grid 4 țări trending YouTube |

### Pagini de modificat cu ExportButtons:
- `/src/app/trending/page.tsx` + MultiRegionalTrending
- `/src/app/tiktok/page.tsx` + TrendingSoundsCard
- `/src/app/instagram/page.tsx` + SentimentAnalysisCard
- `/src/app/competitors/page.tsx`
- `/src/app/competitor-ig/page.tsx` + Batch Scraping UI
- `/src/app/my-channel/page.tsx` + ABTitlesGenerator

---

## Fișiere de referință (pattern-uri existente):
- AI routes: `/src/app/api/captions/route.ts`
- Email cu PDF: `/src/app/api/email/send-report/route.ts`
- Email functions: `/src/lib/resend.ts`
- Plan config: `/src/lib/plan-config.ts`
- PDF template: `/src/lib/pdfTemplate.tsx`
- TikTok API: `/src/app/api/tiktok/route.ts`
- Instagram scraper: `/src/app/api/instagram-scraper/route.ts`
- YouTube: `/src/app/api/youtube/trending/route.ts`

---

## Commit-ul de făcut după implementare:
```
feat: Add AI sentiment analysis, A/B title generator, monthly report, weekly digest, TikTok trending sounds/categories, Instagram batch scraping, YouTube multi-regional trending, Excel/PDF export, email onboarding sequences - Professional Business Brief AI format
```
