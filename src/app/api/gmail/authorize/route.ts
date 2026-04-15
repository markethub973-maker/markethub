/**
 * GET /api/gmail/authorize — generates the Google OAuth consent URL and redirects.
 *
 * Flow:
 *   1. Operator opens brain.markethubpromo.com/api/gmail/authorize
 *   2. Google shows permission screen (read + send + modify)
 *   3. Google redirects to /api/gmail/callback with ?code=...
 *   4. Callback exchanges code → refresh_token + access_token, stores in DB
 */

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Gate behind brain admin cookie OR cron secret
  const ok =
    req.cookies.get("brain_admin")?.value === "1" ||
    req.nextUrl.searchParams.get("token") === process.env.BRAIN_CRON_SECRET;
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return NextResponse.json({ error: "GOOGLE_CLIENT_ID missing" }, { status: 500 });

  const redirectUri = "https://markethubpromo.com/api/gmail/callback";
  const scopes = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/userinfo.email",
  ].join(" ");

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", scopes);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");

  return NextResponse.redirect(url.toString());
}
