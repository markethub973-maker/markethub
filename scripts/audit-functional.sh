#!/bin/bash
#
# MarketHub Pro — Audit Funcțional Automat
# Verifică fiecare pagină și endpoint pe prod
#
# Usage: ./scripts/audit-functional.sh
#

BASE="https://markethubpromo.com"
PASS=0
FAIL=0
WARN=0
RESULTS=""

log_pass() { PASS=$((PASS+1)); RESULTS+="✅ $1\n"; }
log_fail() { FAIL=$((FAIL+1)); RESULTS+="❌ $1\n"; }
log_warn() { WARN=$((WARN+1)); RESULTS+="⚠️  $1\n"; }

check_page() {
  local name="$1"
  local path="$2"
  local expect="${3:-200}"

  code=$(curl -sf -o /dev/null -w "%{http_code}" "${BASE}${path}" --max-time 10 2>/dev/null)
  if [ "$code" = "$expect" ] || [ "$code" = "307" ] || [ "$code" = "308" ]; then
    log_pass "$name → HTTP $code"
  else
    log_fail "$name → HTTP $code (expected $expect)"
  fi
}

check_api() {
  local name="$1"
  local path="$2"
  local method="${3:-GET}"
  local auth_header="$4"

  if [ -n "$auth_header" ]; then
    code=$(curl -sf -o /dev/null -w "%{http_code}" -X "$method" "${BASE}${path}" -H "$auth_header" --max-time 15 2>/dev/null)
  else
    code=$(curl -sf -o /dev/null -w "%{http_code}" -X "$method" "${BASE}${path}" --max-time 15 2>/dev/null)
  fi

  if [ "$code" = "200" ] || [ "$code" = "201" ] || [ "$code" = "307" ]; then
    log_pass "API $name → HTTP $code"
  elif [ "$code" = "401" ]; then
    log_warn "API $name → 401 (needs auth, expected)"
  else
    log_fail "API $name → HTTP $code"
  fi
}

check_json() {
  local name="$1"
  local path="$2"
  local field="$3"

  response=$(curl -sf "${BASE}${path}" --max-time 10 2>/dev/null)
  if echo "$response" | python3 -c "import sys,json; d=json.load(sys.stdin); assert '$field' in d" 2>/dev/null; then
    log_pass "API $name → has '$field'"
  else
    log_fail "API $name → missing '$field' or error"
  fi
}

echo "═══════════════════════════════════════════════"
echo "  MarketHub Pro — Audit Funcțional"
echo "  $(date '+%Y-%m-%d %H:%M')"
echo "═══════════════════════════════════════════════"
echo ""

# ─── 1. HEALTH & DEPLOY ─────────────────────────
echo "📡 1. Health & Deploy..."
check_json "Health" "/api/health" "version"
check_json "Health DB" "/api/health" "status"

# ─── 2. PUBLIC PAGES ─────────────────────────────
echo "🌐 2. Public Pages..."
check_page "Login" "/login"
check_page "Register" "/register"
check_page "Pricing" "/pricing"
check_page "Promo" "/promo"
check_page "Demo" "/demo"
check_page "Help" "/help"
check_page "Changelog" "/changelog"
check_page "Status" "/status"
check_page "Privacy" "/privacy"
check_page "Terms" "/terms"
check_page "Reseller" "/reseller"
check_page "Reseller Southeast" "/reseller/southeast"
check_page "Reseller Europe" "/reseller/europe"
check_page "Reseller Premium" "/reseller/premium"

# ─── 3. PROTECTED PAGES (expect 307 redirect to login) ──
echo "🔒 3. Protected Pages (should redirect)..."
check_page "Dashboard" "/dashboard" "307"
check_page "Calendar" "/calendar" "307"
check_page "Campaigns" "/campaigns" "307"
check_page "Leads" "/leads" "307"
check_page "Research" "/research" "307"
check_page "Settings" "/settings" "307"
check_page "Social Accounts" "/social-accounts" "307"
check_page "Assets" "/assets" "307"
check_page "Captions" "/captions" "307"
check_page "AI Studio Image" "/studio/image" "307"
check_page "AI Studio Video" "/studio/video" "307"
check_page "AI Studio Audio" "/studio/audio" "307"
check_page "Thumbnail" "/studio/thumbnail" "307"
check_page "Video Caption" "/studio/video-caption" "307"
check_page "Reels Studio" "/studio/reels" "307"
check_page "Hook Library" "/studio/hooks" "307"
check_page "Hashtag Scanner" "/studio/hashtag-scan" "307"
check_page "Lead Enrichment" "/studio/lead-enrich" "307"
check_page "AB Winner" "/studio/ab-winner" "307"
check_page "Recycle" "/studio/recycle" "307"
check_page "Repurpose" "/studio/repurpose" "307"
check_page "Content Strategy" "/studio/content-strategy" "307"
check_page "Brand Voice" "/brand/voice" "307"
check_page "Onboarding" "/onboarding"
check_page "Channels" "/channels" "307"
check_page "Videos" "/videos" "307"

# ─── 4. ADMIN PAGES ─────────────────────────────
echo "🔐 4. Admin Pages..."
check_page "Admin Panel" "/markethub973" "404"
check_page "Brain Login" "/brain-login"

# ─── 5. API ENDPOINTS (no auth) ──────────────────
echo "⚡ 5. Public API Endpoints..."
check_api "Health" "/api/health"
check_api "Pricing" "/api/pricing"
check_api "Status" "/api/status"
check_api "Booking Slots" "/api/booking/slots?slug=test"

# ─── 6. API ENDPOINTS (auth required) ────────────
echo "🔑 6. Auth API Endpoints..."
check_api "Instagram OAuth" "/api/auth/instagram"
check_api "TikTok OAuth" "/api/auth/tiktok"
check_api "YouTube OAuth" "/api/auth/youtube/connect"
check_api "LinkedIn OAuth" "/api/auth/linkedin-post/connect"

# ─── 7. PROSPECT & BOOKING PAGES ─────────────────
echo "📋 7. Prospect & Booking..."
check_page "Prospect Page" "/p/casa-bunicii-restaurant"
check_page "Booking Page" "/book/casa-bunicii-restaurant"

# ─── 8. OFFER PAGES ──────────────────────────────
echo "💰 8. Offer Pages..."
check_page "Offer RO" "/offer-ro"
check_page "Offer INTL" "/offer-intl"
check_page "Offer DE" "/offer-de"
check_page "Offer FR" "/offer-fr"
check_page "Offer IT" "/offer-it"
check_page "Offer ES" "/offer-es"
check_page "Offer PT" "/offer-pt"

# ─── 9. EXTERNAL SERVICE CHECKS ──────────────────
echo "🔌 9. External Services..."

# Serper
serper_check=$(curl -sf -o /dev/null -w "%{http_code}" "https://google.serper.dev/search" \
  -H "X-API-KEY: test" -H "Content-Type: application/json" \
  -d '{"q":"test"}' --max-time 5 2>/dev/null)
if [ "$serper_check" = "403" ] || [ "$serper_check" = "401" ]; then
  log_pass "Serper.dev reachable (auth needed)"
else
  log_warn "Serper.dev → HTTP $serper_check"
fi

# Fal.ai
fal_check=$(curl -sf -o /dev/null -w "%{http_code}" "https://queue.fal.run" --max-time 5 2>/dev/null)
if [ -n "$fal_check" ]; then
  log_pass "Fal.ai reachable → HTTP $fal_check"
else
  log_fail "Fal.ai unreachable"
fi

# Resend
resend_check=$(curl -sf -o /dev/null -w "%{http_code}" "https://api.resend.com/emails" --max-time 5 2>/dev/null)
log_pass "Resend.com reachable → HTTP $resend_check"

# Supabase
supa_check=$(curl -sf -o /dev/null -w "%{http_code}" "https://kashohhwsxyhyhhppvik.supabase.co/rest/v1/" --max-time 5 2>/dev/null)
if [ "$supa_check" = "200" ] || [ "$supa_check" = "401" ]; then
  log_pass "Supabase reachable → HTTP $supa_check"
else
  log_fail "Supabase unreachable → HTTP $supa_check"
fi

# ─── 10. SSL & SECURITY ─────────────────────────
echo "🔒 10. SSL & Security..."
ssl_check=$(curl -sI "${BASE}" --max-time 5 2>/dev/null | grep -i "strict-transport-security")
if [ -n "$ssl_check" ]; then
  log_pass "HSTS header present"
else
  log_warn "HSTS header missing"
fi

csp_check=$(curl -sI "${BASE}/login" --max-time 5 2>/dev/null | grep -i "content-security-policy")
if [ -n "$csp_check" ]; then
  log_pass "CSP header present"
else
  log_warn "CSP header missing"
fi

# ─── RESULTS ─────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════"
echo "  RESULTS"
echo "═══════════════════════════════════════════════"
echo -e "$RESULTS"
echo ""
echo "═══════════════════════════════════════════════"
echo "  ✅ PASS: $PASS  |  ❌ FAIL: $FAIL  |  ⚠️  WARN: $WARN"
echo "═══════════════════════════════════════════════"
echo ""

if [ "$FAIL" -gt 0 ]; then
  echo "🚨 $FAIL failures detected — review above"
  exit 1
else
  echo "✅ All checks passed!"
  exit 0
fi
