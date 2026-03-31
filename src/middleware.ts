import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Public routes that don't require authentication
const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/pricing",
  "/upgrade-required",
  "/auth/callback",
  "/api/auth",
  "/api/stripe/webhook",
  "/api/subscription/check-trial",
  // Admin uses its own password-based auth — bypass Supabase middleware
  "/markethub973",
  "/dashboard/admin",
  "/api/admin",
  "/api/admin-auth",
  "/api/admin-secret-login",
];

// Routes that expired users CAN access (to upgrade)
const UPGRADE_PATHS = ["/upgrade-required", "/upgrade", "/pricing", "/api/stripe/checkout"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static files and Next internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.match(/\.(ico|png|jpg|svg|css|js|woff2?)$/)
  ) {
    return NextResponse.next();
  }

  // Allow public paths without any check
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  if (isPublic) return NextResponse.next();

  // Build Supabase client that reads/writes cookies
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
    return NextResponse.redirect(loginUrl);
  }

  // Skip plan check for upgrade-related paths
  const isUpgradePath = UPGRADE_PATHS.some((p) => pathname.startsWith(p));
  if (isUpgradePath) return response;

  // Check subscription plan (lazy — avoids extra DB call for most requests)
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_plan, subscription_status, trial_expires_at")
    .eq("id", user.id)
    .single();

  if (profile) {
    const plan = profile.subscription_plan;
    const isExpired =
      plan === "expired" ||
      profile.subscription_status === "expired" ||
      (plan === "free_test" &&
        profile.trial_expires_at &&
        new Date(profile.trial_expires_at) < new Date());

    if (isExpired) {
      // Skip for API routes — they handle their own 429 response
      if (!pathname.startsWith("/api")) {
        return NextResponse.redirect(new URL("/upgrade-required", request.url));
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
