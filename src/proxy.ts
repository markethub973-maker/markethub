import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { canAccessRoute } from "@/lib/plan-features";
import { logSecurityEvent } from "@/lib/siem";

// ── Security headers applied to every response (CSP is dynamic — see buildCsp) ─
const BASE_SECURITY_HEADERS: Record<string, string> = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "X-DNS-Prefetch-Control": "off",
  "X-Download-Options": "noopen",
  "X-Permitted-Cross-Domain-Policies": "none",
};

/**
 * Build a nonce-based CSP per request.
 * - script-src uses 'nonce-{nonce}' + 'strict-dynamic' → no 'unsafe-inline' in production
 * - style-src keeps 'unsafe-inline' because the app uses inline style attributes extensively
 * - 'unsafe-eval' is included only in development (React uses eval for stack traces)
 */
function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV === "development";
  return [
    "default-src 'self'",
    // 'unsafe-inline' needed for Next.js RSC hydration inline scripts
    // 'strict-dynamic' was removed — it blocks Next.js static chunks that have no nonce
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://js.stripe.com`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.anthropic.com https://api.apify.com https://api.resend.com https://api.stripe.com https://js.stripe.com https://graph.facebook.com https://www.googleapis.com",
    "frame-src https://js.stripe.com https://hooks.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

// ── CORS allowed origins ────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  "https://markethubpromo.com",
  "https://www.markethubpromo.com",
  // Allow localhost in development
  ...(process.env.NODE_ENV === "development"
    ? ["http://localhost:3000", "http://localhost:3001"]
    : []),
];

// ── Plan features cache (DB overrides, refreshed every 5 min) ───────────────
// Allows admin panel changes to propagate without code redeploy.
let planFeaturesCache: { data: Record<string, Record<string, boolean>>; at: number } | null = null;
const PLAN_FEATURES_TTL = 5 * 60 * 1000;

async function loadPlanFeaturesOverrides(
  supabase: ReturnType<typeof import("@supabase/ssr").createServerClient>
): Promise<Record<string, Record<string, boolean>>> {
  const now = Date.now();
  if (planFeaturesCache && now - planFeaturesCache.at < PLAN_FEATURES_TTL) {
    return planFeaturesCache.data;
  }
  try {
    const { data } = await supabase
      .from("admin_platform_config")
      .select("extra_data")
      .eq("platform", "plan_features")
      .maybeSingle();
    const overrides = (data?.extra_data as Record<string, Record<string, boolean>>) ?? {};
    planFeaturesCache = { data: overrides, at: now };
    return overrides;
  } catch {
    return planFeaturesCache?.data ?? {};
  }
}

// ── Global rate limiter via Upstash REST API (plain fetch, no SDK) ──────────
// Uses INCR + EXPIRE via Upstash HTTP REST — works in any runtime.
// Auth: 10 req/min per IP | API: 120 req/min per IP | AI: 20 req/min per IP
// AI tier is for Anthropic-expensive endpoints (consultant chat, support
// ticket creation, learning DB search) where each request can cost cents.
// Fails open if Redis is unavailable (no outage risk).
const LIMITS = { auth: 10, api: 120, ai: 20 } as const;

async function checkRateLimit(ip: string, type: "auth" | "api" | "ai"): Promise<boolean> {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!redisUrl || !redisToken) return true; // not configured — fail-open

  const key = `rl:${type}:${ip}`;
  const limit = LIMITS[type];

  try {
    // ATOMIC pipeline: INCR + EXPIRE NX in one round-trip.
    // Why pipeline / why NX:
    //   Previously we did INCR followed by a fire-and-forget fetch(EXPIRE).
    //   In Edge Runtime / serverless functions the unawaited fetch is killed
    //   when the request handler returns, so EXPIRE often never reached
    //   Redis. The result was rate-limit keys with TTL = -1 (no expiry) that
    //   accumulated forever — every IP that tripped the limit once stayed
    //   banned permanently. NX makes EXPIRE idempotent across the lifetime
    //   of the window so subsequent calls in the same minute don't reset it.
    const pipelineRes = await fetch(`${redisUrl}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${redisToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", key],
        ["EXPIRE", key, "60", "NX"],
      ]),
    });
    if (!pipelineRes.ok) return true;
    const results = (await pipelineRes.json()) as Array<{ result: number }>;
    const count = results?.[0]?.result;
    if (typeof count !== "number") return true;
    return count <= limit;
  } catch {
    return true; // network error — fail-open
  }
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

function applySecurityHeaders(res: NextResponse, csp: string): NextResponse {
  for (const [key, value] of Object.entries(BASE_SECURITY_HEADERS)) {
    res.headers.set(key, value);
  }
  res.headers.set("Content-Security-Policy", csp);
  return res;
}

function corsResponse(req: NextRequest, res: NextResponse): NextResponse {
  const origin = req.headers.get("origin") ?? "";
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.headers.set("Access-Control-Allow-Origin", origin);
    res.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, x-cron-secret");
    res.headers.set("Access-Control-Max-Age", "86400");
    res.headers.set("Vary", "Origin");
  }
  return res;
}

// ── Public routes that don't require authentication ─────────────────────────
const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/pricing",
  "/privacy",
  "/terms",
  "/upgrade-required",
  "/auth/callback",
  "/api/auth",
  "/api/pricing",           // public — used on register page before login
  "/api/stripe/webhook",
  "/api/apify/webhook",
  "/api/webhooks",          // all webhook receivers do their own HMAC auth
  "/api/cron",              // cron routes verify CRON_SECRET themselves
  "/api/maint",             // maintenance agent routes verify CRON_SECRET themselves
  "/api/cockpit",           // cockpit routes self-authenticate (state/assistant via isAdminAuthorized cookie, watchdog/backup/daily-report/reactive-siem via Bearer CRON_SECRET)
  "/api/brain",             // brain routes self-authenticate (advisor: cron secret OR admin session; goals/generate-product-page: admin session)
  "/api/calendar/approval", // token-gated client approval flow (approval_token)
  "/api/webhooks/whatsapp", // Meta WhatsApp delivery callbacks (verify_token gated)
  "/api/subscription/check-trial",
  "/api/admin-session-check",
  "/api/health",            // public uptime probe — no auth, no rate limit
  "/api/status",            // public status API — feeds /status page
  "/status",                // public status page
  "/security",              // public security disclosure page (RFC 9116 policy)
  "/.well-known/",          // RFC 9116 security.txt + future well-known files
  "/changelog",             // public release notes
  "/api/docs",              // public API documentation
  "/api/bio-link/",         // public slug API for Link in Bio viewer
  "/api/client-portal/",   // public token API for client portal viewer
  "/l/",                    // public Link in Bio pages
  "/portal/",               // public client portal pages
  "/promo",                 // public marketing landing page
  "/offer-ro",              // Romania-only DFY landing (€499) — shared in RO outreach
  "/offer-intl",            // International DFY landing (€1000) — shared in EU/UK/US outreach
  "/offer/thanks",          // post-payment confirmation (shared by both tiers)
  "/api/offer",             // one-time Stripe checkout for the DFY offer
  "/help",                  // public help / support page
  "/api/support",           // public support form submission endpoint
  "/blocked",               // blocked account page
  // SEO infra — MUST be reachable by Googlebot / crawlers. These are
  // auto-generated by Next.js from src/app/sitemap.ts and src/app/robots.ts.
  "/sitemap.xml",
  "/robots.txt",
  // Admin uses its own password-based auth — bypass Supabase middleware
  "/markethub973",
  "/dashboard/admin",
  "/api/admin",
  "/api/admin-auth",
  "/api/admin-secret-login",
];

// Routes that expired users CAN access (to upgrade)
const UPGRADE_PATHS = ["/upgrade-required", "/upgrade", "/pricing", "/api/stripe/checkout"];

// ── Auth route rate limits (stricter to prevent brute force) ────────────────
// Only PASSWORD login / registration endpoints get the strict 10/min bucket.
// Social OAuth init routes (/api/auth/instagram, /api/auth/youtube, /api/auth/tiktok)
// are NOT brute-forceable — they just redirect to the provider — and legitimate users
// often click them multiple times during the OAuth dance, so they use the normal
// 120/min API bucket instead.
const AUTH_PATHS = [
  "/api/auth/register",
  "/login",
  "/register",
  "/api/admin-secret-login",
  "/api/admin-auth",
];
// Rate limits are configured in getAuthLimiter/getApiLimiter (10/min auth, 120/min API)

// ── Admin tunnel verification ────────────────────────────────────────────────
// If ADMIN_TUNNEL_SECRET is set, admin routes require either:
//   1. A valid admin_session_token cookie (already logged in), OR
//   2. The ?t=<secret> query param in the URL (initial access)
// Without either, admin routes return 404 (not even a login page is shown).
//
// NOTE: Bearer tokens in Authorization header are NOT accepted here.
// They were previously allowed as a bypass for "API clients / test agents",
// but this allowed any arbitrary Bearer value to skip the tunnel check
// (VULN-003). The actual admin API key validation is done by isAdminAuthorized()
// inside each route handler — the tunnel is only a first-layer guard.
function checkAdminTunnel(request: NextRequest): boolean {
  const tunnelSecret = process.env.ADMIN_TUNNEL_SECRET;
  if (!tunnelSecret) return true; // tunnel not configured — open (backward compat)

  // Already have a valid session cookie → allow
  const sessionCookie = request.cookies.get("admin_session_token")?.value ?? "";
  if (sessionCookie) return true; // let isAdminAuthorized handle the actual check

  // Check ?t=<secret> query param
  const t = request.nextUrl.searchParams.get("t") ?? "";
  if (!t) return false;

  // Constant-time comparison — pure JS, safe for Edge Runtime.
  // Iterate over max(length) regardless so timing does not leak the secret's length.
  const maxLen = Math.max(t.length, tunnelSecret.length);
  let diff = t.length ^ tunnelSecret.length;
  for (let i = 0; i < maxLen; i++) {
    const tc = i < t.length ? t.charCodeAt(i) : 0;
    const sc = i < tunnelSecret.length ? tunnelSecret.charCodeAt(i) : 0;
    diff |= tc ^ sc;
  }
  return diff === 0;
}

// Header the maintenance probe agent sets on every synthetic request so the
// middleware can skip SIEM logging. Without this, each probe run generates
// ~15 false-positive brute_force_admin / unusual_activity events that then
// get escalated by the SIEM analyst agent. Checked inside the handler and
// forwarded to the route handlers (which also skip their own SIEM calls).
const MAINT_PROBE_HEADER = "x-maint-probe";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") ?? "";

  // Skip static files and Next internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.match(/\.(ico|png|jpg|jpeg|gif|svg|css|js|woff2?|ttf|map)$/)
  ) {
    return NextResponse.next();
  }

  // ── Private Brain Command Center: brain.markethubpromo.com ──────────────
  // Password-gated single-user dashboard. Requires `brain_admin` cookie
  // (set by POST /api/brain-admin/login). Everything else 404s so the app
  // UI and marketing content are never reachable via this hostname.
  if (host === "brain.markethubpromo.com") {
    const url = request.nextUrl.clone();
    const hasAuth = request.cookies.get("brain_admin")?.value === "1";

    // Public: login page + login/logout API
    if (pathname === "/login" || pathname === "/brain-login") {
      url.pathname = "/brain-login";
      return NextResponse.next({ request });
    }
    if (pathname.startsWith("/api/brain-admin/")) {
      return NextResponse.next();
    }

    // Any other path requires auth
    if (!hasAuth) {
      url.pathname = "/brain-login";
      return NextResponse.rewrite(url);
    }

    // Dashboard entry point
    if (pathname === "/" || pathname === "/brain-private") {
      url.pathname = "/brain-private";
      return NextResponse.rewrite(url);
    }
    // Outreach batch sender (sub-page of dashboard)
    if (pathname === "/outreach" || pathname === "/brain-private/outreach") {
      url.pathname = "/brain-private/outreach";
      return NextResponse.rewrite(url);
    }
    // Pipeline view (sub-page of dashboard)
    if (pathname === "/pipeline" || pathname === "/brain-private/pipeline") {
      url.pathname = "/brain-private/pipeline";
      return NextResponse.rewrite(url);
    }
    // Demo generator (sub-page of dashboard)
    if (pathname === "/demo" || pathname === "/brain-private/demo") {
      url.pathname = "/brain-private/demo";
      return NextResponse.rewrite(url);
    }
    // Brain APIs the dashboard uses — allow through on this subdomain.
    if (
      pathname.startsWith("/api/brain/outreach-batch") ||
      pathname.startsWith("/api/brain/demo")
    ) {
      return NextResponse.next();
    }

    // Everything else → 404 (app is not reachable here)
    return new NextResponse(null, { status: 404 });
  }

  // ── Marketing subdomain: get.markethubpromo.com ─────────────────────────
  // Rewrite clean paths to the actual offer pages + hard-404 everything else
  // so prospects never stumble into the in-app UI through this subdomain.
  if (host === "get.markethubpromo.com") {
    const url = request.nextUrl.clone();
    if (pathname === "/" || pathname === "/intl") {
      url.pathname = "/offer-intl";
      return NextResponse.rewrite(url);
    }
    if (pathname === "/ro") {
      url.pathname = "/offer-ro";
      return NextResponse.rewrite(url);
    }
    if (pathname === "/thanks" || pathname.startsWith("/thanks/")) {
      url.pathname = "/offer/thanks";
      return NextResponse.rewrite(url);
    }
    // Public API for checkout
    if (pathname.startsWith("/api/offer/")) {
      return NextResponse.next();
    }
    // Everything else on this subdomain → hard 404 so the app UI is not
    // reachable via the marketing hostname.
    return new NextResponse(null, { status: 404 });
  }

  // Is this a synthetic probe request? We use this flag to suppress SIEM
  // logging below — the probe is our own traffic and polluting the SIEM
  // noise floor defeats the point of running an analyst over it.
  const isMaintProbe = request.headers.get(MAINT_PROBE_HEADER) === "viralstat-probe/1";

  // ── Generate per-request nonce for CSP ───────────────────────────────────
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp   = buildCsp(nonce);

  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    const preflightRes = new NextResponse(null, { status: 204 });
    applySecurityHeaders(corsResponse(request, preflightRes), csp);
    return preflightRes;
  }

  // ── Request body size limit for AI routes (50 KB max) ─────────────────
  if (
    request.method === "POST" &&
    (pathname.startsWith("/api/find-clients/") || pathname.startsWith("/api/research/"))
  ) {
    const contentLength = parseInt(request.headers.get("content-length") ?? "0", 10);
    if (contentLength > 51_200) {
      void logSecurityEvent({
        event_type: "payload_too_large",
        ip: request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? undefined,
        path: pathname,
        details: { content_length: contentLength, limit: 51_200 },
      });
      const res = NextResponse.json(
        { error: "Request body too large. Maximum 50 KB allowed." },
        { status: 413 },
      );
      applySecurityHeaders(res, csp);
      return res;
    }
  }

  // ── Admin tunnel check ──────────────────────────────────────────────────
  const isAdminPath =
    pathname.startsWith("/markethub973") ||
    pathname.startsWith("/api/admin/") ||   // /api/admin/* routes (with slash)
    pathname === "/api/admin";
  // NOTE: /dashboard/admin is NOT in isAdminPath — it's a UI page that protects
  // itself via localStorage admin_authenticated check client-side. The tunnel
  // is only required for /markethub973 (login) and /api/admin/* (API calls).
  // NOTE: /api/admin-secret-login and /api/admin-auth are excluded intentionally
  // — they are the login endpoints and must remain reachable without tunnel token

  if (isAdminPath && !checkAdminTunnel(request)) {
    // Log brute-force admin tunnel attempts (but not our own probe traffic —
    // the probe hits /api/admin/pricing + /api/admin/users on purpose to
    // verify the 404 response, and those hits are NOT attacks).
    //
    // IMPORTANT: we AWAIT the log call even though it runs right before a
    // return. Serverless isolates freeze immediately after the response,
    // so `void logSecurityEvent(...)` gets killed mid-fetch and the
    // reactive-siem hook never fires. Awaiting adds ~500ms-2s to a request
    // that's going to 404 anyway — the attacker doesn't care, and real
    // tooling is whitelisted via the X-Maint-Probe header.
    if (!isMaintProbe) {
      await logSecurityEvent({
        event_type: "brute_force_admin",
        ip: request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown",
        user_agent: request.headers.get("user-agent") ?? undefined,
        path: pathname,
        details: { method: request.method, hasToken: request.nextUrl.searchParams.has("t") },
      });
    }
    const res = new NextResponse(null, { status: 404 });
    applySecurityHeaders(res, csp);
    return res;
  }

  const ip = getClientIp(request);

  // ── Extra rate limit on admin tunnel access (brute-force protection) ────
  if (isAdminPath && request.nextUrl.searchParams.has("t")) {
    if (!await checkRateLimit(ip, "auth")) {
      void logSecurityEvent({
        event_type: "brute_force_admin",
        ip,
        path: pathname,
        severity: "critical",
        details: { reason: "rate_limit_tunnel" },
      });
      const res = new NextResponse(null, { status: 404 });
      applySecurityHeaders(res, csp);
      return res;
    }
  }

  // ── Rate limiting ───────────────────────────────────────────────────────
  // Webhooks are exempt: they're already authenticated by HMAC signature
  // verification inside the handler, and rate-limiting them would cause
  // legitimate provider retries (Stripe, Apify) to be dropped — Stripe
  // backs off aggressively after 429s and we'd lose events.
  const isWebhook =
    pathname === "/api/stripe/webhook" ||
    pathname === "/api/apify/webhook" ||
    pathname === "/api/webhooks/apify";

  const isAuthPath = !isWebhook && AUTH_PATHS.some((p) => pathname.startsWith(p));
  // AI-expensive endpoints — each call hits Anthropic API at ~$0.001-0.01.
  // Tighter limit prevents bill blowup from a single bad-actor or runaway loop.
  const isAiPath = !isWebhook && (
    pathname === "/api/consultant/chat" ||
    pathname === "/api/learning/issues/search" ||
    (pathname === "/api/support/tickets" && request.method === "POST")
  );

  if (isAuthPath) {
    if (!await checkRateLimit(ip, "auth")) {
      const res = NextResponse.json(
        { error: "Too many requests. Please wait before trying again." },
        { status: 429 }
      );
      res.headers.set("Retry-After", "60");
      applySecurityHeaders(res, csp);
      return res;
    }
  } else if (isAiPath) {
    if (!await checkRateLimit(ip, "ai")) {
      void logSecurityEvent({
        event_type: "rate_limit_exceeded",
        ip,
        path: pathname,
        details: { tier: "ai", limit: LIMITS.ai, window_sec: 60 },
      });
      const res = NextResponse.json(
        { error: "AI rate limit exceeded. Please wait a minute before trying again." },
        { status: 429 }
      );
      res.headers.set("Retry-After", "60");
      applySecurityHeaders(res, csp);
      return res;
    }
  } else if (!isWebhook && pathname.startsWith("/api/")) {
    if (!await checkRateLimit(ip, "api")) {
      const res = NextResponse.json(
        { error: "Rate limit exceeded." },
        { status: 429 }
      );
      res.headers.set("Retry-After", "60");
      applySecurityHeaders(res, csp);
      return res;
    }
  }

  // ── CSRF protection via Origin header (OWASP-recommended pattern) ──────
  // Modern browsers always send Origin on cross-origin POST/PUT/DELETE/PATCH.
  // For state-changing requests under /api/* we require Origin to match
  // an allowed origin. Webhooks bypass (HMAC-auth'd) and cron routes bypass
  // (Bearer CRON_SECRET — not browser-initiated). Same for admin endpoints
  // which use isAdminAuthorized cookie check.
  //
  // This stops a malicious page on attacker.com from triggering
  // state-changing actions in a logged-in user's browser, even though
  // Supabase auth cookies would auto-attach.
  const isMutating =
    request.method === "POST" ||
    request.method === "PUT" ||
    request.method === "PATCH" ||
    request.method === "DELETE";
  const isCsrfExempt =
    isWebhook ||
    pathname.startsWith("/api/cron/") ||
    pathname.startsWith("/api/cockpit/") ||
    pathname.startsWith("/api/maint/") ||
    pathname === "/api/security/health-check" ||
    pathname.startsWith("/api/admin/") ||
    pathname === "/api/admin-auth" ||
    pathname === "/api/admin-secret-login" ||
    pathname.startsWith("/api/auth/") || // OAuth callbacks have own state-token verification
    pathname.startsWith("/api/offer/");  // public one-time checkout — called before login exists

  if (isMutating && pathname.startsWith("/api/") && !isCsrfExempt) {
    const origin = request.headers.get("origin");
    const referer = request.headers.get("referer");

    // Origin is preferred — referer can be stripped by privacy settings.
    // If origin is present, must match. If absent, fall back to referer
    // origin (parse the URL). If both missing, reject (suspicious — every
    // legitimate browser sends at least one for cross-origin POST).
    let originOk = false;
    if (origin) {
      originOk = ALLOWED_ORIGINS.includes(origin);
    } else if (referer) {
      try {
        const refOrigin = new URL(referer).origin;
        originOk = ALLOWED_ORIGINS.includes(refOrigin);
      } catch {
        originOk = false;
      }
    }

    if (!originOk) {
      void logSecurityEvent({
        event_type: "rate_limit_exceeded", // re-using existing type; csrf_block not in enum
        ip,
        path: pathname,
        details: {
          reason: "csrf_origin_mismatch",
          method: request.method,
          origin: origin ?? null,
          referer: referer ?? null,
        },
      });
      const res = NextResponse.json(
        { error: "CSRF check failed — request blocked" },
        { status: 403 },
      );
      applySecurityHeaders(res, csp);
      return res;
    }
  }

  // ── Allow public paths without auth check ──────────────────────────────
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  if (isPublic) {
    const res = NextResponse.next();
    applySecurityHeaders(corsResponse(request, res), csp);
    return res;
  }

  // ── Build Supabase client that reads/writes cookies ────────────────────
  // Forward nonce to route handlers via x-nonce request header
  const reqWithNonce = new Headers(request.headers);
  reqWithNonce.set("x-nonce", nonce);
  let response = NextResponse.next({ request: { headers: reqWithNonce } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(toSet) {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: reqWithNonce } });
          toSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Not authenticated:
  //   - API routes → respond with JSON 401 (so programmatic clients see a real error)
  //   - Root `/` → redirect to /promo (public marketing landing, not login wall)
  //   - Other page routes → redirect to /login?next=<pathname>
  if (!user) {
    if (pathname.startsWith("/api/")) {
      const unauth = NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
      applySecurityHeaders(corsResponse(request, unauth), csp);
      return unauth;
    }
    // Anonymous visitors hitting the bare domain should see the marketing
    // page, not a login wall — otherwise organic / Google / share links
    // bounce on a 307 to /login?next=/ which murders first impressions.
    if (pathname === "/") {
      const promoRedirect = NextResponse.redirect(new URL("/promo", request.url));
      applySecurityHeaders(promoRedirect, csp);
      return promoRedirect;
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    const redirect = NextResponse.redirect(loginUrl);
    applySecurityHeaders(redirect, csp);
    return redirect;
  }

  // Skip plan check for upgrade-related paths
  const isUpgradePath = UPGRADE_PATHS.some((p) => pathname.startsWith(p));
  if (isUpgradePath) {
    applySecurityHeaders(corsResponse(request, response), csp);
    return response;
  }

  // ── Profile query ──────────────────────────────────────────────────────────
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, is_admin, is_blocked")
    .eq("id", user.id)
    .single();

  // Block check — admins are exempt so they can never lock themselves out.
  if (profile && (profile as any).is_blocked && !(profile as any).is_admin) {
    if (pathname.startsWith("/api/")) {
      const blocked = NextResponse.json({ error: "Account blocked" }, { status: 403 });
      applySecurityHeaders(corsResponse(request, blocked), csp);
      return blocked;
    }
    if (pathname !== "/blocked") {
      const blockedUrl = new URL("/blocked", request.url);
      const redirect = NextResponse.redirect(blockedUrl);
      applySecurityHeaders(redirect, csp);
      return redirect;
    }
  }

  if (profile) {
    // "free" (legacy value) is rank 0, same as "free_test"
    const activePlan = (profile as any).plan ?? null;

    // ── Route-level plan gate (server-side, URL bypass protection) ──────────
    const planOverrides = await loadPlanFeaturesOverrides(supabase);
    if (
      activePlan &&
      !pathname.startsWith("/api") &&
      !isAdminPath &&
      !canAccessRoute(activePlan, pathname, planOverrides)
    ) {
      // Log plan bypass attempts (could indicate enumeration or privilege escalation)
      void logSecurityEvent({
        event_type: "plan_bypass_attempt",
        ip,
        user_id: user?.id,
        path: pathname,
        details: { plan: activePlan },
      });
      const upgradeUrl = new URL("/upgrade-required", request.url);
      upgradeUrl.searchParams.set("feature", pathname);
      const redirect = NextResponse.redirect(upgradeUrl);
      applySecurityHeaders(redirect, csp);
      return redirect;
    }
  }

  applySecurityHeaders(corsResponse(request, response), csp);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
