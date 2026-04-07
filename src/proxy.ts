import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { canAccessRoute } from "@/lib/plan-features";
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

// ── Security headers applied to every response ─────────────────────────────
const SECURITY_HEADERS: Record<string, string> = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "X-DNS-Prefetch-Control": "off",
  "X-Download-Options": "noopen",
  "X-Permitted-Cross-Domain-Policies": "none",
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.anthropic.com https://api.apify.com https://api.resend.com https://api.stripe.com https://js.stripe.com https://graph.facebook.com https://www.googleapis.com",
    "frame-src https://js.stripe.com https://hooks.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; "),
};

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

// ── Global rate limiter backed by Upstash Redis ─────────────────────────────
// Counters are shared across all Vercel worker instances — truly global.
// Falls back to allow if Redis is unavailable (fail-open to avoid outages).
let _redis: Redis | null = null;
function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
  if (!_redis) {
    _redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
  return _redis;
}

// Two limiters: strict for auth endpoints, lenient for general API
let _authLimiter: Ratelimit | null = null;
let _apiLimiter: Ratelimit | null = null;

function getAuthLimiter(): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;
  if (!_authLimiter) {
    _authLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "60 s"),
      prefix: "rl:auth",
    });
  }
  return _authLimiter;
}

function getApiLimiter(): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;
  if (!_apiLimiter) {
    _apiLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(120, "60 s"),
      prefix: "rl:api",
    });
  }
  return _apiLimiter;
}

async function checkRateLimit(ip: string, type: "auth" | "api"): Promise<boolean> {
  try {
    const limiter = type === "auth" ? getAuthLimiter() : getApiLimiter();
    if (!limiter) return true; // Redis not configured — fail-open
    const { success } = await limiter.limit(ip);
    return success;
  } catch {
    return true; // Redis unavailable — fail-open
  }
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

function applySecurityHeaders(res: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    res.headers.set(key, value);
  }
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
  "/upgrade-required",
  "/auth/callback",
  "/api/auth",
  "/api/pricing",           // public — used on register page before login
  "/api/stripe/webhook",
  "/api/apify/webhook",
  "/api/webhooks",          // all webhook receivers do their own HMAC auth
  "/api/cron",              // cron routes verify CRON_SECRET themselves
  "/api/subscription/check-trial",
  "/api/admin-session-check",
  "/api/bio-link/",         // public slug API for Link in Bio viewer
  "/api/client-portal/",   // public token API for client portal viewer
  "/l/",                    // public Link in Bio pages
  "/portal/",               // public client portal pages
  "/blocked",               // blocked account page
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
const AUTH_PATHS = ["/api/auth/", "/login", "/register", "/api/admin-secret-login", "/api/admin-auth"];
// Rate limits are configured in getAuthLimiter/getApiLimiter (10/min auth, 120/min API)

// ── Admin tunnel verification ────────────────────────────────────────────────
// If ADMIN_TUNNEL_SECRET is set, admin routes require either:
//   1. A valid admin_session_token cookie (already logged in), OR
//   2. The ?t=<secret> query param in the URL (initial access)
// Without either, admin routes return 404 (not even a login page is shown).
function checkAdminTunnel(request: NextRequest): boolean {
  const tunnelSecret = process.env.ADMIN_TUNNEL_SECRET;
  if (!tunnelSecret) return true; // tunnel not configured — open (backward compat)

  // Already have a valid session cookie → allow
  const sessionCookie = request.cookies.get("admin_session_token")?.value ?? "";
  if (sessionCookie) return true; // let isAdminAuthorized handle the actual check

  // Bearer token in Authorization header → allow (for API clients / test agents)
  const bearer = request.headers.get("authorization") ?? "";
  if (bearer.startsWith("Bearer ")) return true;

  // Check ?t=<secret> query param
  const t = request.nextUrl.searchParams.get("t") ?? "";
  if (!t) return false;

  // Constant-time comparison — pure JS, safe for Edge Runtime
  if (t.length !== tunnelSecret.length) return false;
  let diff = 0;
  for (let i = 0; i < t.length; i++) {
    diff |= t.charCodeAt(i) ^ tunnelSecret.charCodeAt(i);
  }
  return diff === 0;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static files and Next internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.match(/\.(ico|png|jpg|jpeg|gif|svg|css|js|woff2?|ttf|map)$/)
  ) {
    return NextResponse.next();
  }

  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    const preflightRes = new NextResponse(null, { status: 204 });
    applySecurityHeaders(corsResponse(request, preflightRes));
    return preflightRes;
  }

  // ── Admin tunnel check ──────────────────────────────────────────────────
  const isAdminPath =
    pathname.startsWith("/markethub973") ||
    pathname.startsWith("/dashboard/admin") ||
    pathname.startsWith("/api/admin/") ||   // /api/admin/* routes (with slash)
    pathname === "/api/admin";
  // NOTE: /api/admin-secret-login and /api/admin-auth are excluded intentionally
  // — they are the login endpoints and must remain reachable without tunnel token

  if (isAdminPath && !checkAdminTunnel(request)) {
    // Return 404 — don't reveal that an admin panel exists
    const res = new NextResponse(null, { status: 404 });
    applySecurityHeaders(res);
    return res;
  }

  const ip = getClientIp(request);

  // ── Rate limiting ───────────────────────────────────────────────────────
  const isAuthPath = AUTH_PATHS.some((p) => pathname.startsWith(p));
  if (isAuthPath) {
    if (!await checkRateLimit(ip, "auth")) {
      const res = NextResponse.json(
        { error: "Too many requests. Please wait before trying again." },
        { status: 429 }
      );
      res.headers.set("Retry-After", "60");
      applySecurityHeaders(res);
      return res;
    }
  } else if (pathname.startsWith("/api/")) {
    if (!await checkRateLimit(ip, "api")) {
      const res = NextResponse.json(
        { error: "Rate limit exceeded." },
        { status: 429 }
      );
      res.headers.set("Retry-After", "60");
      applySecurityHeaders(res);
      return res;
    }
  }

  // ── Allow public paths without auth check ──────────────────────────────
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  if (isPublic) {
    const res = NextResponse.next();
    applySecurityHeaders(corsResponse(request, res));
    return res;
  }

  // ── Build Supabase client that reads/writes cookies ────────────────────
  let response = NextResponse.next({ request });

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
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Not authenticated → redirect to login
  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    const redirect = NextResponse.redirect(loginUrl);
    applySecurityHeaders(redirect);
    return redirect;
  }

  // Skip plan check for upgrade-related paths
  const isUpgradePath = UPGRADE_PATHS.some((p) => pathname.startsWith(p));
  if (isUpgradePath) {
    applySecurityHeaders(corsResponse(request, response));
    return response;
  }

  // ── Profile query — only columns that exist in the current schema ──────────
  // NOTE: subscription_plan, subscription_status, trial_expires_at, is_blocked,
  // blocked_reason are pending migration. Only query what's confirmed to exist.
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, is_admin")
    .eq("id", user.id)
    .single();

  if (profile) {
    // "free" (legacy value) is rank 0, same as "free_test"
    const activePlan = (profile as any).plan ?? null;

    // ── Route-level plan gate (server-side, URL bypass protection) ──────────
    const planOverrides = await loadPlanFeaturesOverrides(supabase);
    if (
      activePlan &&
      !pathname.startsWith("/api") &&
      !canAccessRoute(activePlan, pathname, planOverrides)
    ) {
      const upgradeUrl = new URL("/upgrade-required", request.url);
      upgradeUrl.searchParams.set("feature", pathname);
      const redirect = NextResponse.redirect(upgradeUrl);
      applySecurityHeaders(redirect);
      return redirect;
    }
  }

  applySecurityHeaders(corsResponse(request, response));
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
