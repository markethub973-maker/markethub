import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { logAudit, getIpFromHeaders } from "@/lib/auditLog";
import { verifyState } from "@/lib/oauthState";

const YT_BASE = "https://www.googleapis.com/youtube/v3";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code       = searchParams.get("code");
  const stateParam = searchParams.get("state");
  const error      = searchParams.get("error");

  if (error || !code || !stateParam) {
    return NextResponse.redirect(
      new URL(`/youtube?error=${error || "missing_code"}`, req.url)
    );
  }

  // ── CSRF: verify HMAC-signed state + current Supabase session (VULN-CRIT-1)
  const verified = verifyState(stateParam);
  if (!verified) {
    return NextResponse.redirect(new URL("/youtube?error=invalid_state", req.url));
  }
  const sessionClient = await createClient();
  const { data: { user: sessionUser } } = await sessionClient.auth.getUser();
  if (!sessionUser || sessionUser.id !== verified.userId) {
    return NextResponse.redirect(new URL("/youtube?error=session_mismatch", req.url));
  }
  const state = sessionUser.id;

  const clientId     = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri  = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/youtube/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/youtube?error=google_not_configured", req.url));
  }

  // 1. Exchange code for tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code" }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(new URL("/youtube?error=token_exchange_failed", req.url));
  }

  const tokens = await tokenRes.json();
  const { access_token, refresh_token, expires_in } = tokens;

  // 2. Fetch channel info using the access token
  const channelRes = await fetch(
    `${YT_BASE}/channels?part=snippet,statistics&mine=true`,
    { headers: { Authorization: `Bearer ${access_token}` } }
  );

  if (!channelRes.ok) {
    return NextResponse.redirect(new URL("/youtube?error=channel_fetch_failed", req.url));
  }

  const channelData = await channelRes.json();
  const ch = channelData.items?.[0];
  if (!ch) {
    return NextResponse.redirect(new URL("/youtube?error=no_channel_found", req.url));
  }

  const channel_id      = ch.id as string;
  const channel_name    = ch.snippet?.title as string;
  const channel_handle  = ch.snippet?.customUrl as string | undefined;
  const thumbnail_url   = ch.snippet?.thumbnails?.default?.url as string | undefined;
  const subscriber_count = parseInt(ch.statistics?.subscriberCount ?? "0", 10);
  const token_expires_at = new Date(Date.now() + (expires_in ?? 3600) * 1000).toISOString();

  // 3. Save to youtube_connections (upsert — same user + channel_id = update)
  const supabase = createServiceClient();

  // Check if this is the user's first connection → set as primary
  const { count } = await supabase
    .from("youtube_connections" as any)
    .select("id", { count: "exact", head: true })
    .eq("user_id", state);

  const is_primary = (count ?? 0) === 0;

  const { error: dbError } = await supabase
    .from("youtube_connections" as any)
    .upsert({
      user_id:          state,
      channel_id,
      channel_name,
      channel_handle:   channel_handle  ?? null,
      thumbnail_url:    thumbnail_url   ?? null,
      subscriber_count,
      is_primary,
      access_token,
      refresh_token:    refresh_token   ?? null,
      token_expires_at,
      connected_at:     new Date().toISOString(),
    }, { onConflict: "user_id,channel_id" });

  if (dbError) {
    console.error("[YouTube OAuth] DB error:", dbError.message);
    return NextResponse.redirect(new URL("/youtube?error=db_save_failed", req.url));
  }

  await logAudit({
    action: "youtube_connected",
    actor_id: state,
    details: { channel_id },
    ip: getIpFromHeaders(req.headers),
  });

  return NextResponse.redirect(new URL("/youtube?connected=1", req.url));
}
