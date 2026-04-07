import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/adminAuth";

const PLAN_ORDER = ["free_test", "starter", "lite", "pro", "business", "enterprise"];

export async function POST(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { plan } = await req.json();
  if (!PLAN_ORDER.includes(plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const email = `test.${plan}@markethubpromo.com`;
  const password = `Test${plan.charAt(0).toUpperCase() + plan.slice(1)}2026!`;

  // Sign in directly with email/password via Supabase REST API
  const signinRes = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      },
      body: JSON.stringify({ email, password }),
    }
  );

  if (!signinRes.ok) {
    const err = await signinRes.json().catch(() => ({}));
    return NextResponse.json(
      { error: err.error_description ?? err.msg ?? "Login failed for test account. Create it first." },
      { status: 400 }
    );
  }

  const session = await signinRes.json();
  const { access_token, refresh_token } = session;

  if (!access_token) {
    return NextResponse.json({ error: "No access token returned" }, { status: 500 });
  }

  // Return an HTML page that sets the Supabase tokens in localStorage/cookies and redirects
  const html = `<!DOCTYPE html>
<html>
<head><title>Logging in...</title></head>
<body>
<script>
  // Set Supabase session in localStorage (same key Supabase JS client uses)
  const key = "sb-kashohhwsxyhyhhppvik-auth-token";
  localStorage.setItem(key, JSON.stringify({
    access_token: ${JSON.stringify(access_token)},
    refresh_token: ${JSON.stringify(refresh_token)},
    token_type: "bearer",
    expires_in: ${session.expires_in ?? 3600},
    expires_at: ${session.expires_at ?? Math.floor(Date.now() / 1000) + 3600},
    user: ${JSON.stringify(session.user ?? {})}
  }));
  window.location.href = "/dashboard";
</script>
<p>Logging in as <strong>${email}</strong>...</p>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
