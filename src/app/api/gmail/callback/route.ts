/**
 * GET /api/gmail/callback — Google OAuth redirect target.
 * Exchanges the one-time code for access_token + refresh_token, stores the
 * refresh_token in DB so Alex can call Gmail API forever (refresh is valid
 * until revoked).
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const err = req.nextUrl.searchParams.get("error");
  if (err) return NextResponse.json({ error: err }, { status: 400 });
  if (!code) return NextResponse.json({ error: "missing code" }, { status: 400 });

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: "google creds missing" }, { status: 500 });
  }

  // Exchange code for tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: "https://markethubpromo.com/api/gmail/callback",
      grant_type: "authorization_code",
    }).toString(),
  });
  if (!tokenRes.ok) {
    const t = await tokenRes.text();
    return NextResponse.json({ error: "token exchange failed", detail: t }, { status: 502 });
  }
  const tokens = (await tokenRes.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope: string;
    token_type: string;
  };

  // Get user email to know whose inbox we connected
  const uiRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const userInfo = uiRes.ok
    ? ((await uiRes.json()) as { email?: string })
    : {};
  const email = userInfo.email ?? "unknown";

  // Persist refresh token
  if (tokens.refresh_token) {
    const svc = createServiceClient();
    await svc.from("gmail_tokens").upsert(
      {
        email,
        refresh_token: tokens.refresh_token,
        access_token: tokens.access_token,
        expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        scopes: tokens.scope,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "email" },
    );
  }

  // Friendly success page
  return new Response(
    `<!doctype html><html><body style="font-family:system-ui;background:#0A0A10;color:#eee;padding:40px;text-align:center;">
      <h1 style="color:#10B981;">✅ Gmail conectat</h1>
      <p>Contul <strong>${email}</strong> e acum linkat la Alex. Refresh token salvat.</p>
      <p>Poți închide acest tab.</p>
    </body></html>`,
    { status: 200, headers: { "Content-Type": "text/html" } },
  );
}
