"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import SetupAgent from "@/components/ui/SetupAgent";
import { createClient } from "@/lib/supabase/client";

const PUBLIC_PATHS = ["/login", "/register", "/markethub973"];

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
        <main className="ml-64 min-h-screen">{children}</main>
      </>
    );
  }

  // Regular dashboard: sidebar + main layout
  return (
    <>
      <Sidebar />
      <main className="ml-64 min-h-screen">{children}</main>
      {pathname !== "/ai-hub" && <SetupAgent />}
    </>
  );
}
