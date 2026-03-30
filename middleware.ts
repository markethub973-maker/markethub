import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Routes that require authentication
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/youtube",
  "/instagram",
  "/tiktok",
  "/competitors",
  "/competitor-ig",
  "/my-channel",
  "/trending",
  "/settings",
  "/clients",
  "/captions",
];

// Public routes — always accessible
const PUBLIC_ROUTES = [
  "/",
  "/pricing",
  "/auth",
  "/upgrade-required",
  "/api/auth",
  "/api/stripe/webhook",
];

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
}

function isPublic(pathname: string): boolean {
  return PUBLIC_ROUTES.some((p) => pathname.startsWith(p));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip middleware for static files and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Public routes pass through
  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  // Only apply auth checks to protected routes
  if (!isProtected(pathname)) {
    return NextResponse.next();
  }

  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Not authenticated → redirect to login
  if (!user) {
    const loginUrl = new URL("/auth/login", req.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Check if trial has expired → redirect to upgrade-required
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, trial_expires_at")
    .eq("id", user.id)
    .single();

  if (
    profile?.plan === "free_test" &&
    profile?.trial_expires_at &&
    new Date(profile.trial_expires_at as string) < new Date()
  ) {
    // Allow /api routes through so the upgrade flow still works
    if (!pathname.startsWith("/api")) {
      return NextResponse.redirect(new URL("/upgrade-required", req.url));
    }
  }

  if (profile?.plan === "expired" && !pathname.startsWith("/api")) {
    return NextResponse.redirect(new URL("/upgrade-required", req.url));
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
