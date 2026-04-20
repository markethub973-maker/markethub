"use client";

/**
 * OnboardingCheck — redirects new users to /onboarding if they have
 * no social connections and haven't completed onboarding yet.
 *
 * Usage: wrap around the dashboard layout or import inside AuthGuard.
 *
 * Excluded paths: /onboarding, /settings, /social-accounts, /login,
 * /register, /pricing, /api, plus any public path.
 */

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const EXCLUDED_PREFIXES = [
  "/onboarding",
  "/settings",
  "/social-accounts",
  "/login",
  "/register",
  "/pricing",
  "/api",
  "/admin",
  "/dashboard/admin",
  "/approve",
  "/portal",
  "/report",
  "/offer",
  "/reseller",
  "/p/",
  "/book",
  "/l/",
  "/blocked",
  "/privacy",
  "/terms",
  "/help",
  "/white-label",
  "/upgrade-required",
  "/demo",
  "/promo",
  "/markethub973",
  "/changelog",
  "/auth",
];

function isExcluded(pathname: string): boolean {
  return EXCLUDED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

interface OnboardingCheckProps {
  children: React.ReactNode;
}

export default function OnboardingCheck({ children }: OnboardingCheckProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (isExcluded(pathname)) {
      setChecked(true);
      return;
    }

    // Quick localStorage check first (avoids DB call on every navigation)
    if (typeof window !== "undefined" && localStorage.getItem("mhp-onboarding-complete")) {
      setChecked(true);
      return;
    }

    const check = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setChecked(true);
        return;
      }

      // Check profile for onboarding_done flag
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_done, youtube_access_token, tiktok_access_token, linkedin_access_token, fb_page_id")
        .eq("id", user.id)
        .single();

      // Already completed
      if (profile?.onboarding_done) {
        localStorage.setItem("mhp-onboarding-complete", "true");
        setChecked(true);
        return;
      }

      // Check for any social connection
      const hasProfileConnection =
        !!profile?.youtube_access_token ||
        !!profile?.tiktok_access_token ||
        !!profile?.linkedin_access_token ||
        !!profile?.fb_page_id;

      if (hasProfileConnection) {
        // Has connections but flag not set — set it and continue
        await supabase.from("profiles").update({ onboarding_done: true }).eq("id", user.id);
        localStorage.setItem("mhp-onboarding-complete", "true");
        setChecked(true);
        return;
      }

      // Check Instagram connections table
      const { data: igConn } = await supabase
        .from("instagram_connections")
        .select("id")
        .eq("user_id", user.id)
        .limit(1)
        .single();

      if (igConn) {
        await supabase.from("profiles").update({ onboarding_done: true }).eq("id", user.id);
        localStorage.setItem("mhp-onboarding-complete", "true");
        setChecked(true);
        return;
      }

      // No connections and onboarding not done — redirect
      router.replace("/onboarding");
    };

    check();
  }, [pathname, router]);

  if (!checked && !isExcluded(pathname)) {
    return null; // Don't flash content while checking
  }

  return <>{children}</>;
}
