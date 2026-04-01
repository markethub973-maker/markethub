#!/bin/bash

# ============================================================
#  Sa continuam de unde am ramas — MarketHub Pro
#  Project: viralstat-dashboard
#  URL live: https://markethubpromo.com
#  Admin:    https://markethubpromo.com/markethub973
#  Repo:     https://github.com/markethub973-maker/markethub.git
# ============================================================

BOLD="\033[1m"
GREEN="\033[0;32m"
YELLOW="\033[0;33m"
RED="\033[0;31m"
CYAN="\033[0;36m"
BLUE="\033[0;34m"
MAGENTA="\033[0;35m"
RESET="\033[0m"
DIM="\033[2m"

clear

echo ""
echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${CYAN}║          MARKETHUB PRO — SA CONTINUAM DE UNDE AM RAMAS       ║${RESET}"
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════════════════════╝${RESET}"
echo ""

# ── Git status ─────────────────────────────────────────────
echo -e "${BOLD}${BLUE}▶ GIT STATUS${RESET}"
echo -e "${DIM}──────────────────────────────────────────────────────────────${RESET}"
cd /Users/edyvanmix/Claude/viralstat-dashboard
BRANCH=$(git branch --show-current)
LAST_COMMIT=$(git log --oneline -1)
TOTAL_COMMITS=$(git log --oneline | wc -l | tr -d ' ')
echo -e "  Branch:       ${GREEN}${BRANCH}${RESET}"
echo -e "  Last commit:  ${YELLOW}${LAST_COMMIT}${RESET}"
echo -e "  Total commits:${CYAN} ${TOTAL_COMMITS}${RESET}"
echo ""

# ── Ce s-a facut ───────────────────────────────────────────
echo -e "${BOLD}${GREEN}✅ CE S-A FACUT (aceasta sesiune + anterioare)${RESET}"
echo -e "${DIM}──────────────────────────────────────────────────────────────${RESET}"
echo -e "  ${GREEN}✓${RESET} Sistem subscriptii complet (trial 7 zile, middleware, webhook Stripe)"
echo -e "  ${GREEN}✓${RESET} Pagina /dashboard/billing (facturi, metoda plata, status plan)"
echo -e "  ${GREEN}✓${RESET} /upgrade si /pricing — afisare plan curent + Manage Subscription"
echo -e "  ${GREEN}✓${RESET} /dashboard/subscription — link Billing & Invoices pentru paid users"
echo -e "  ${GREEN}✓${RESET} Bug fix critic: profiles.plan → profiles.subscription_plan (11 fisiere)"
echo -e "  ${GREEN}✓${RESET} Internationalizare completa EN (toate textele romane eliminate)"
echo -e "  ${GREEN}✓${RESET} Agent AI prompts traduse in engleza (8 agenti)"
echo -e "  ${GREEN}✓${RESET} Agentii conectati direct la Anthropic API (ANTHROPIC_API_KEY_APP)"
echo -e "  ${GREEN}✓${RESET} ro-RO → en-US in toate fisierele (utils, captions, alerts, campaigns)"
echo -e "  ${GREEN}✓${RESET} RON → USD in pagina Campaigns"
echo -e "  ${GREEN}✓${RESET} Admin: credentials afisaza acum toate cheile API (6 sectiuni)"
echo -e "  ${GREEN}✓${RESET} Admin: activeSubscriptions numara corect toate planurile (5 paid)"
echo -e "  ${GREEN}✓${RESET} .env.local completat cu toate cheile din Vercel Production"
echo -e "  ${GREEN}✓${RESET} Audit securitate: parola hardcodata eliminata din ambele login routes"
echo -e "  ${GREEN}✓${RESET} stripe.ts extins cu toate 6 planuri (starter/lite/pro/business/enterprise)"
echo -e "  ${GREEN}✓${RESET} Romanian strings eliminate din 3 API routes (checkout, analytics, hashtags)"
echo -e "  ${GREEN}✓${RESET} News API default country: 'ro' → 'us'"
echo -e "  ${GREEN}✓${RESET} console.log eliminat din instagram-scraper/route.ts"
echo ""

# ── Ce mai trebuie facut ────────────────────────────────────
echo -e "${BOLD}${YELLOW}⚠️  CE MAI TREBUIE FACUT (prioritate)${RESET}"
echo -e "${DIM}──────────────────────────────────────────────────────────────${RESET}"

echo -e ""
echo -e "  ${RED}[CRITIC]${RESET} ${BOLD}1. Stripe Price IDs lipsa in Vercel env vars${RESET}"
echo -e "  ${DIM}   Exista: STRIPE_PRO_PRICE_ID, STRIPE_ENTERPRISE_PRICE_ID${RESET}"
echo -e "  ${DIM}   Lipsa:  STRIPE_STARTER_PRICE_ID, STRIPE_LITE_PRICE_ID, STRIPE_BUSINESS_PRICE_ID${RESET}"
echo -e "  ${DIM}   Fix:    Stripe Dashboard → Products → creeaza plan → copiaza Price ID → Vercel env${RESET}"
echo ""
echo -e "  ${RED}[CRITIC]${RESET} ${BOLD}2. ADMIN_PASSWORD lipsa in Vercel env vars${RESET}"
echo -e "  ${DIM}   Dupa eliminarea fallback-ului hardcodat, admin login nu mai functioneaza${RESET}"
echo -e "  ${DIM}   Fix:    Vercel Dashboard → Settings → Env Vars → adauga ADMIN_PASSWORD${RESET}"
echo ""
echo -e "  ${YELLOW}[HIGH]${RESET}   ${BOLD}3. Supabase migration SQL — neexecutat${RESET}"
echo -e "  ${DIM}   Fisier: supabase-migrations/subscription-system.sql${RESET}"
echo -e "  ${DIM}   Fix:    Supabase Dashboard → SQL Editor → ruleaza fisierul${RESET}"
echo ""
echo -e "  ${YELLOW}[HIGH]${RESET}   ${BOLD}4. /upgrade page — afisaza doar 3 planuri (Free/Pro/Enterprise)${RESET}"
echo -e "  ${DIM}   Lipsesc: Starter \$9, Lite \$19, Business \$99${RESET}"
echo -e "  ${DIM}   Fix:    Aliniaza cu /pricing page care afisaza corect toate 6 planuri${RESET}"
echo ""
echo -e "  ${YELLOW}[HIGH]${RESET}   ${BOLD}5. Missing .ok checks inainte de .json() in Instagram API routes${RESET}"
echo -e "  ${DIM}   Fisiere: instagram/media/route.ts, instagram/route.ts, clients/analytics/route.ts${RESET}"
echo -e "  ${DIM}   Fix:    Adauga if (!res.ok) return error inainte de fiecare res.json()${RESET}"
echo ""
echo -e "  ${BLUE}[MEDIUM]${RESET} ${BOLD}6. Buyer Persona Builder — in Testing (netestat in prod)${RESET}"
echo -e "  ${DIM}   Testeaza cu un cont Instagram real conectat${RESET}"
echo ""
echo -e "  ${BLUE}[MEDIUM]${RESET} ${BOLD}7. Early-Bird Pricing Strategy — in progress${RESET}"
echo -e "  ${DIM}   Planificat: Starter \$9→\$15, etc. dupa prima luna de la launch${RESET}"
echo -e "  ${DIM}   Fix:    Actualizeaza plan-config.ts + Stripe prices la momentul potrivit${RESET}"
echo ""
echo -e "  ${DIM}[LOW]${RESET}    ${BOLD}8. console.error in ~14 API routes${RESET}"
echo -e "  ${DIM}   Nu sunt critice (sunt error-uri, nu log-uri de debug)${RESET}"
echo -e "  ${DIM}   Ideal: inlocuire cu un logging service (Sentry, Logtail etc.)${RESET}"
echo ""

# ── Linkuri utile ───────────────────────────────────────────
echo -e "${BOLD}${MAGENTA}🔗 LINKURI UTILE${RESET}"
echo -e "${DIM}──────────────────────────────────────────────────────────────${RESET}"
echo -e "  App live:        ${CYAN}https://markethubpromo.com${RESET}"
echo -e "  Admin panel:     ${CYAN}https://markethubpromo.com/markethub973${RESET}"
echo -e "  Vercel:          ${CYAN}https://vercel.com/markethub973-9400s-projects/viralstat-dashboard${RESET}"
echo -e "  Supabase:        ${CYAN}https://supabase.com/dashboard/project/kashohhwsxyhyhhppvik${RESET}"
echo -e "  Stripe:          ${CYAN}https://dashboard.stripe.com${RESET}"
echo -e "  Anthropic:       ${CYAN}https://console.anthropic.com${RESET}"
echo -e "  GitHub:          ${CYAN}https://github.com/markethub973-maker/markethub${RESET}"
echo ""

# ── Comenzi rapide ─────────────────────────────────────────
echo -e "${BOLD}${BLUE}⚡ COMENZI RAPIDE${RESET}"
echo -e "${DIM}──────────────────────────────────────────────────────────────${RESET}"
echo -e "  ${YELLOW}Dev local:${RESET}       cd /Users/edyvanmix/Claude/viralstat-dashboard && npm run dev"
echo -e "  ${YELLOW}TypeScript check:${RESET} npx tsc --noEmit"
echo -e "  ${YELLOW}Push live:${RESET}        git push origin main"
echo -e "  ${YELLOW}Vercel env:${RESET}       npx vercel env ls"
echo -e "  ${YELLOW}Vercel pull:${RESET}      npx vercel env pull --environment=production .env.production.tmp"
echo ""

# ── Stack tehnic ────────────────────────────────────────────
echo -e "${BOLD}${DIM}📦 STACK TEHNIC${RESET}"
echo -e "${DIM}──────────────────────────────────────────────────────────────${RESET}"
echo -e "  ${DIM}Next.js 16 (App Router) · Supabase · Stripe · Anthropic Claude SDK${RESET}"
echo -e "  ${DIM}Resend · RapidAPI · YouTube Data API v3 · Meta Graph API · NewsAPI${RESET}"
echo -e "  ${DIM}Vercel (deploy + cron) · @react-pdf/renderer · Recharts${RESET}"
echo ""
echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "  ${DIM}Spune: 'da continuam' si incepem cu urmatorul item din lista.${RESET}"
echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo ""
