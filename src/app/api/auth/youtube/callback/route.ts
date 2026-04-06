import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encryptField } from "@/lib/fieldCrypto";
import { logAudit, getIpFromHeaders } from "@/lib/auditLog";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state"); // user.id
  const error = searchParams.get("error");

  if (error || !code || !state) {
    return NextResponse.redirect(
      new URL(`/my-channel?error=${error || "missing_code"}`, req.url)
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/youtube/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/my-channel?error=google_not_configured", req.url));
  }

  // Exchange code for tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(new URL("/my-channel?error=token_exchange_failed", req.url));
  }

  const tokens = await tokenRes.json();
  const { access_token, refresh_token, expires_in } = tokens;

  // Store tokens in profiles
  const supabase = await createClient();
  const expiresAt = new Date(Date.now() + (expires_in ?? 3600) * 1000).toISOString();

  const { error: dbError } = await supabase
    .from("profiles")
    .update({
      youtube_access_token:     access_token,
      youtube_refresh_token:    refresh_token ?? null,
      youtube_token_expires_at: expiresAt,
      // Encrypted shadow columns
      enc_youtube_access_token:  encryptField(access_token),
      enc_youtube_refresh_token: refresh_token ? encryptField(refresh_token) : null,
    })
    .eq("id", state);

  if (dbError) {
    console.error("[YouTube OAuth] DB error:", dbError.message);
    return NextResponse.redirect(new URL("/my-channel?error=db_save_failed", req.url));
  }

  await logAudit({
    action: "token_refreshed",
    actor_id: state,
    entity_type: "youtube_oauth",
    ip: getIpFromHeaders(req.headers),
  });

  return NextResponse.redirect(new URL("/my-channel?analytics=connected", req.url));
}
