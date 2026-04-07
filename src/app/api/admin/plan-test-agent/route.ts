import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/adminAuth";
import { createServiceClient } from "@/lib/supabase/service";
import {
  PLAN_ORDER,
  ROUTE_GATES,
  canAccessRoute,
  type PlanId,
} from "@/lib/plan-features";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://markethubpromo.com";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Build the Supabase SSR cookie so our proxy can read auth state */
function buildAuthCookie(session: {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  token_type?: string;
  user: object;
}): string {
  const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] ?? "";
  const cookieName = `sb-${projectRef}-auth-token`;
  const cookieValue = encodeURIComponent(JSON.stringify(session));
  return `${cookieName}=${cookieValue}`;
}

/** Sign in and get full session (for cookie construction) */
async function signInFull(email: string, password: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  token_type?: string;
  user: object;
} | null> {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!data.access_token) return null;
    return data;
  } catch {
    return null;
  }
}

/** Test a single route for a plan by making a real HTTP request with auth cookie */
async function testRoute(
  route: string,
  cookie: string
): Promise<"accessible" | "blocked" | "error"> {
  try {
    const url = `${APP_URL}${route}`;
    const res = await fetch(url, {
      method: "GET",
      headers: { Cookie: cookie },
      redirect: "manual",
    });

    // 307 or 302 to /upgrade-required = blocked
    if (res.status === 307 || res.status === 302 || res.status === 308 || res.status === 301) {
      const loc = res.headers.get("location") ?? "";
      if (loc.includes("upgrade-required")) return "blocked";
      if (loc.includes("login")) return "blocked"; // not authenticated
      // Other redirects — treat as accessible (e.g., dashboard redirects)
      return "accessible";
    }

    // 200 = accessible
    if (res.status === 200) return "accessible";

    return "error";
  } catch {
    return "error";
  }
}

// ── GET — return the computed access matrix + DB account status ───────────────
export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = createServiceClient();

  // Fetch all test accounts
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, subscription_plan, plan")
    .in("email", PLAN_ORDER.map(p => `test.${p}@markethubpromo.com`));

  type ProfileRow = { id: string; email: string; subscription_plan: string | null; plan: string | null };
  const accountMap: Record<string, ProfileRow> = {};
  for (const p of (profiles ?? []) as ProfileRow[]) {
    accountMap[p.email] = p;
  }

  // Build account status per plan
  const accountStatus: Record<string, {
    email: string;
    exists: boolean;
    dbPlan: string | null;
    planMatch: boolean;
  }> = {};

  for (const planId of PLAN_ORDER) {
    const email = `test.${planId}@markethubpromo.com`;
    const profile = accountMap[email];
    const dbPlan = profile?.subscription_plan ?? profile?.plan ?? null;
    accountStatus[planId] = {
      email,
      exists: !!profile,
      dbPlan,
      planMatch: dbPlan === planId,
    };
  }

  // Build access matrix: plan → route → expected access
  const matrix: Record<string, Record<string, boolean>> = {};
  for (const planId of PLAN_ORDER) {
    matrix[planId] = {};
    for (const route of Object.keys(ROUTE_GATES)) {
      matrix[planId][route] = canAccessRoute(planId, route);
    }
  }

  return NextResponse.json({
    matrix,
    accountStatus,
    routes: Object.entries(ROUTE_GATES).map(([route, gate]) => ({
      route,
      label: gate.label,
      minPlan: gate.minPlan,
    })),
    plans: PLAN_ORDER,
  });
}

// ── POST — run live HTTP tests for a specific plan or all plans ───────────────
export async function POST(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const targetPlan: string | null = body.plan ?? null; // null = all plans

  const plansToTest = targetPlan
    ? PLAN_ORDER.filter(p => p === targetPlan)
    : PLAN_ORDER;

  const results: Record<string, {
    plan: string;
    loginOk: boolean;
    routes: Array<{
      route: string;
      label: string;
      expectedAccess: boolean;
      actualAccess: "accessible" | "blocked" | "error";
      ok: boolean;
    }>;
    passed: number;
    failed: number;
    errors: number;
  }> = {};

  for (const planId of plansToTest) {
    const email = `test.${planId}@markethubpromo.com`;
    const password = `Test${planId.charAt(0).toUpperCase() + planId.slice(1)}2026!`;

    // Try to sign in
    const session = await signInFull(email, password);
    const loginOk = !!session;

    const routeResults: typeof results[string]["routes"] = [];
    let passed = 0;
    let failed = 0;
    let errors = 0;

    if (loginOk && session) {
      const cookie = buildAuthCookie(session);

      for (const [route, gate] of Object.entries(ROUTE_GATES)) {
        const expectedAccess = canAccessRoute(planId as PlanId, route);
        const actualAccess = await testRoute(route, cookie);
        const ok =
          actualAccess === "error"
            ? false
            : expectedAccess
            ? actualAccess === "accessible"
            : actualAccess === "blocked";

        routeResults.push({
          route,
          label: gate.label,
          expectedAccess,
          actualAccess,
          ok,
        });

        if (actualAccess === "error") errors++;
        else if (ok) passed++;
        else failed++;
      }
    }

    results[planId] = {
      plan: planId,
      loginOk,
      routes: routeResults,
      passed,
      failed,
      errors,
    };
  }

  return NextResponse.json({ results });
}
