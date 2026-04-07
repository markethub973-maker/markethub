"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import SetupAgent from "@/components/ui/SetupAgent";
import { ModuleBoundary } from "@/components/ModuleBoundary";
import OnboardingWidget from "@/components/onboarding/OnboardingWidget";
import TrialWarningBanner from "@/components/TrialWarningBanner";
import { createClient } from "@/lib/supabase/client";

const PUBLIC_PATHS = ["/login", "/register", "/markethub973", "/blocked", "/pricing"];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      // Check if user is admin (via localStorage)
      const isAdminAuthenticated =
        typeof window !== "undefined" &&
        localStorage.getItem("admin_authenticated") === "true";

      if (!user && !isAdminAuthenticated && !PUBLIC_PATHS.includes(pathname)) {
        router.replace("/login");
      } else {
        setChecked(true);
      }
    });
  }, [pathname, router]);

  if (!checked) return null;

  // Public pages: no sidebar
  if (PUBLIC_PATHS.includes(pathname)) {
    return <>{children}</>;
  }

  // Admin dashboard: sidebar + main layout (no SetupAgent)
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
      {pathname !== "/ai-hub" && <SetupAgent />}
      <OnboardingWidget />
    </>
  );
}
