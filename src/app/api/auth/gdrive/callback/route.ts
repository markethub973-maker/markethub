import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { verifyState } from "@/lib/oauthState";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const stateParam = searchParams.get("state");
  const error = searchParams.get("error");

  if (error || !code || !stateParam) {
    return NextResponse.redirect(new URL(`/assets?error=${error || "missing_code"}`, req.url));
  }

  const verified = verifyState(stateParam);
  if (!verified) return NextResponse.redirect(new URL("/assets?error=invalid_state", req.url));

  const sessionClient = await createClient();
  const { data: { user } } = await sessionClient.auth.getUser();
  if (!user || user.id !== verified.userId) {
    return NextResponse.redirect(new URL("/assets?error=session_mismatch", req.url));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/gdrive/callback`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code" }),
  });

  if (!tokenRes.ok) return NextResponse.redirect(new URL("/assets?error=token_exchange_failed", req.url));

  const { access_token, refresh_token, expires_in } = await tokenRes.json();
  const expiresAt = new Date(Date.now() + (expires_in ?? 3600) * 1000).toISOString();

  // Store Drive tokens in profiles
  const supa = createServiceClient();
  await supa.from("profiles").update({
    gdrive_access_token: access_token,
    gdrive_refresh_token: refresh_token,
    gdrive_token_expires_at: expiresAt,
  }).eq("id", user.id);

  return NextResponse.redirect(new URL("/assets?gdrive=connected", req.url));
}
