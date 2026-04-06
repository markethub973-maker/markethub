# Continuare sesiune MarketHub Pro

## Comanda de start pentru Claude

```
Citeste memoria din sesiunea 2026-04-01 si continua dezvoltarea MarketHub Pro (viralstat-dashboard).

Proiectul este la: /Users/edyvanmix/Claude/viralstat-dashboard/
Site live: https://markethubpromo.com
GitHub: https://github.com/markethub973-maker/markethub.git (branch main)
Vercel token: vezi .env.local sau Vercel dashboard
```

## Ce s-a livrat ultima sesiune (1 apr 2026)

1. Monthly Report PDF real (@react-pdf/renderer)
2. Weekly Digest email real (Resend API)
3. Google OAuth YouTube Analytics (GOOGLE_CLIENT_ID/SECRET pe Vercel)
4. Pagina /meta-insights cu 5 tab-uri (Stories, Reels, Ads, Cross-Platform, Audience Overlap)
5. Sortare coloane tabele (Overview + Marketing)
6. Fix Instagram page (insights non-fatale)
7. MultiRegionalTrending: MAX 10 tari, 8 default, 65 disponibile
8. AI Captions: 45+ limbi internationale
9. Anthropic Usage Monitor pe Admin (alerta < $3)
10. TikTok clarificat (merge via RapidAPI, nu necesita token)

## Backlog / idei urmatoare

- [ ] Pagina de notificari/alerte mai avansata
- [ ] Export PDF pentru Meta Insights
- [ ] Dashboard client-facing (link share pentru clienti)
- [ ] Scheduler pentru postari (calendar integrat)
- [ ] Rapoarte automate saptamanale prin email (cron)
- [ ] TikTok OAuth (dupa aprobare app TikTok — 2-4 saptamani)
- [ ] Audience Overlap real (dupa Business Verification Meta)

## Atentie

- Instagram token din admin_platform_config expira ~29 mai 2026
- Anthropic API key: daca creditul scade sub $3 apare alerta pe Admin
- Supabase migration YouTube tokens: verifica daca s-a rulat (ADD COLUMN youtube_access_token etc)
