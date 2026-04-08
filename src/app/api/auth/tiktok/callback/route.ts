import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { logAudit, getIpFromHeaders } from "@/lib/auditLog";

const TT_TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
const TT_USER_URL  = "https://open.tiktokapis.com/v2/user/info/";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code  = searchParams.get("code");
  const state = searchParams.get("state"); // user.id
  const error = searchParams.get("error");

  if (error || !code || !state) {
    return NextResponse.redirect(
      new URL(`/tiktok?error=${error ?? "missing_code"}`, req.url)
    );
  }

  const clientKey    = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  const redirectUri  = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/tiktok/callback`;

  if (!clientKey || !clientSecret) {
    return NextResponse.redirect(new URL("/tiktok?error=tiktok_not_configured", req.url));
  }

  // 1. Exchange code for tokens
  const tokenRes = await fetch(TT_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key:    clientKey,
      client_secret: clientSecret,
      code,
      grant_type:    "authorization_code",
      redirect_uri:  redirectUri,
    }),
  });

  if (!tokenRes.ok) {
    console.error("[TikTok OAuth] token exchange failed:", await tokenRes.text());
    return NextResponse.redirect(new URL("/tiktok?error=token_exchange_failed", req.url));
  }

  const tokenData = await tokenRes.json();
  const { access_token, refresh_token, expires_in, open_id } = tokenData.data ?? tokenData;

  if (!access_token || !open_id) {
    console.error("[TikTok OAuth] missing access_token or open_id:", tokenData);
    return NextResponse.redirect(new URL("/tiktok?error=token_invalid", req.url));
  }

  // 2. Fetch user info
  const userRes = await fetch(
    `${TT_USER_URL}?fields=open_id,union_id,avatar_url,display_name,username,follower_count,following_count,likes_count,video_count`,
    { headers: { Authorization: `Bearer ${access_token}` } }
  );

  if (!userRes.ok) {
    console.error("[TikTok OAuth] user fetch failed:", await userRes.text());
    return NextResponse.redirect(new URL("/tiktok?error=user_fetch_failed", req.url));
  }

  const userData = await userRes.json();
  const u = userData.data?.user ?? userData.user;

  if (!u) {
    return NextResponse.redirect(new URL("/tiktok?error=no_user_found", req.url));
  }

  const tiktok_open_id      = open_id as string;
  const display_name        = (u.display_name ?? u.nickname ?? "") as string;
  const username            = (u.username ?? "") as string;
  const avatar_url          = (u.avatar_url ?? null) as string | null;
  const follower_count      = (u.follower_count ?? 0) as number;
  const following_count     = (u.following_count ?? 0) as number;
  const likes_count         = (u.likes_count ?? 0) as number;
  const video_count         = (u.video_count ?? 0) as number;
  const token_expires_at    = new Date(Date.now() + (expires_in ?? 86400) * 1000).toISOString();

  // 3. Save to tiktok_connections
  const supabase = createServiceClient();

  const { count } = await supabase
    .from("tiktok_connections" as any)
    .select("id", { count: "exact", head: true })
    .eq("user_id", state);

  const is_primary = (count ?? 0) === 0;

  const { error: dbError } = await supabase
    .from("tiktok_connections" as any)
    .upsert({
      user_id:          state,
      tiktok_open_id,
      display_name,
      username:         username || null,
      avatar_url,
      follower_count,
      following_count,
      likes_count,
      video_count,
      is_primary,
      access_token,
      refresh_token:    refresh_token ?? null,
      token_expires_at,
      connected_at:     new Date().toISOString(),
    }, { onConflict: "user_id,tiktok_open_id" });

  if (dbError) {
    console.error("[TikTok OAuth] DB error:", dbError.message);
    return NextResponse.redirect(new URL("/tiktok?error=db_save_failed", req.url));
  }

  await logAudit({
    action: "tiktok_connected",
    actor_id: state,
    details: { tiktok_open_id, username },
    ip: getIpFromHeaders(req.headers),
  });

  return NextResponse.redirect(new URL("/tiktok?connected=1", req.url));
}
