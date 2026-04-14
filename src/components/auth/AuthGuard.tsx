"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import { ModuleBoundary } from "@/components/ModuleBoundary";
import OnboardingWidget from "@/components/onboarding/OnboardingWidget";
import TrialWarningBanner from "@/components/TrialWarningBanner";
import { createClient } from "@/lib/supabase/client";

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/markethub973",
  "/blocked",
  "/pricing",
  "/promo",
  "/privacy",
  "/terms",
  "/upgrade-required",
  "/help",
];

function isPublicPath(pathname: string): boolean {
  // Marketing subdomain: every path served on get.markethubpromo.com is a
  // public prospect page (the middleware rewrites / /ro /intl /thanks to the
  // real offer routes and 404s everything else — but the browser still sees
  // the external pathname like `/ro`, which wouldn't match our internal
  // whitelist).
  if (typeof window !== "undefined" && window.location.hostname === "get.markethubpromo.com") {
    return true;
  }
  if (PUBLIC_PATHS.includes(pathname)) return true;
  // Public slug routes
  if (pathname.startsWith("/l/")) return true;       // bio-link viewer
  if (pathname.startsWith("/portal/")) return true;  // client portal viewer
  if (pathname.startsWith("/approve/")) return true; // client approval
  if (pathname.startsWith("/report/")) return true;  // shared report
  if (pathname.startsWith("/offer"))   return true;  // /offer-ro, /offer-intl, /offer/thanks
  return false;
}

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  // Public pages render IMMEDIATELY — they must be indexable, shareable on
  // social media, and fast on first paint. Skipping the auth gate lets the
  // Server Component content ship in the initial HTML body instead of being
  // blocked behind a client-side `checked` flag that hides everything until
  // hydration completes.
  const publicPath = isPublicPath(pathname);

  useEffect(() => {
    if (publicPath) {
      setChecked(true);
      return;
    }
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      // Check if user is admin (via localStorage)
      const isAdminAuthenticated =
        typeof window !== "undefined" &&
        localStorage.getItem("admin_authenticated") === "true";

      if (!user && !isAdminAuthenticated) {
        router.replace("/login");
      } else {
        setChecked(true);
      }
    });
  }, [pathname, router, publicPath]);

  // Public pages: render children directly, no sidebar, no auth gate.
  if (publicPath) {
    return <>{children}</>;
  }

  if (!checked) return null;

  // Admin dashboard: sidebar + main layout
  if (pathname.startsWith("/dashboard/admin")) {
    return (
      <>
        <Sidebar />
        <main className="md:ml-64 min-h-screen">
          <ModuleBoundary name="Admin Dashboard">
            {children}
          </ModuleBoundary>
        </main>
      </>
    );
  }

  // Regular dashboard: sidebar + main layout
  return (
    <>
      <Sidebar />
      <main className="md:ml-64 min-h-screen flex flex-col">
        <TrialWarningBanner />
        <div className="flex-1">
          <ModuleBoundary name="Page">
            {children}
          </ModuleBoundary>
        </div>
      </main>
      <OnboardingWidget />
    </>
  );
}
