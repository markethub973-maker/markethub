import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { signState } from "@/lib/oauthState";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL!));
  }

  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  if (!clientKey) {
    return NextResponse.redirect(
      new URL("/tiktok?error=tiktok_not_configured", process.env.NEXT_PUBLIC_APP_URL!)
    );
  }

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/tiktok/callback`;

  const params = new URLSearchParams({
    client_key: clientKey,
    redirect_uri: redirectUri,
    scope: "user.info.basic,user.info.stats,video.list",
    response_type: "code",
    // HMAC-signed state — callback verifies signature AND current session. (VULN-CRIT-1)
    state: signState(user.id),
  });

  return NextResponse.redirect(
    `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`
  );
}
