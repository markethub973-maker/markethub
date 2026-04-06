import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

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

// ── In-memory rate limiter (per-edge-worker instance, best-effort) ──────────
// Provides protection against trivial abuse; for global rate limiting
// a Redis-backed solution (e.g. Upstash) would be needed.
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
let lastCleanup = Date.now();

function checkRateLimit(ip: string, limit: number, windowMs: number): boolean {
  const now = Date.now();

  // Periodic cleanup to avoid unbounded memory growth
  if (now - lastCleanup > 60_000) {
    for (const [key, val] of rateLimitMap.entries()) {
      if (now > val.resetAt) rateLimitMap.delete(key);
    }
    lastCleanup = now;
  }

  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
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
    res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, x-cron-secret, x-admin-secret");
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
  "/api/stripe/webhook",
  "/api/apify/webhook",
  "/api/webhooks",          // all webhook receivers do their own HMAC auth
  "/api/cron",              // cron routes verify CRON_SECRET themselves
  "/api/subscription/check-trial",
  "/api/admin-session-check",
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
const AUTH_PATHS = ["/api/auth/", "/login", "/register"];
const AUTH_RATE_LIMIT = { limit: 10, windowMs: 60_000 }; // 10/min per IP
const API_RATE_LIMIT  = { limit: 120, windowMs: 60_000 }; // 120/min per IP

export async function middleware(request: NextRequest) {
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

  const ip = getClientIp(request);

  // ── Rate limiting ───────────────────────────────────────────────────────
  const isAuthPath = AUTH_PATHS.some((p) => pathname.startsWith(p));
  if (isAuthPath) {
    if (!checkRateLimit(`auth:${ip}`, AUTH_RATE_LIMIT.limit, AUTH_RATE_LIMIT.windowMs)) {
      const res = NextResponse.json(
        { error: "Too many requests. Please wait before trying again." },
        { status: 429 }
      );
      res.headers.set("Retry-After", "60");
      applySecurityHeaders(res);
      return res;
    }
  } else if (pathname.startsWith("/api/")) {
    if (!checkRateLimit(`api:${ip}`, API_RATE_LIMIT.limit, API_RATE_LIMIT.windowMs)) {
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

  // ── Check subscription plan ─────────────────────────────────────────────
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("plan, subscription_plan, subscription_status, trial_expires_at")
    .eq("id", user.id)
    .single();

  const profileOld = profileError
    ? (await supabase.from("profiles").select("plan").eq("id", user.id).single()).data
    : null;

  const resolvedProfile = profile ?? profileOld;

  if (resolvedProfile) {
    const activePlan = (resolvedProfile as any).subscription_plan ?? (resolvedProfile as any).plan;
    const status = (resolvedProfile as any).subscription_status;
    const trialExpiresAt = (resolvedProfile as any).trial_expires_at;

    const isExpired =
      activePlan === "expired" ||
      status === "expired" ||
      (activePlan === "free_test" &&
        trialExpiresAt &&
        new Date(trialExpiresAt) < new Date());

    if (isExpired && !pathname.startsWith("/api")) {
      const redirect = NextResponse.redirect(new URL("/upgrade-required", request.url));
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
