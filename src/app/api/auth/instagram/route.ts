import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { signState } from "@/lib/oauthState";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL!));
  }

  const redirectUri = process.env.INSTAGRAM_REDIRECT_URI
    || `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/instagram/callback`;

  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID!,
    redirect_uri: redirectUri,
    scope: "instagram_basic,instagram_business_content_publish,instagram_manage_insights,pages_show_list,pages_read_engagement,instagram_manage_comments,ads_read",
    response_type: "code",
    // HMAC-signed state — callback re-verifies signature AND current Supabase
    // session. Raw user.id is no longer trusted as identity claim. (VULN-CRIT-1)
    state: signState(user.id),
  });

  return NextResponse.redirect(
    `https://www.facebook.com/dialog/oauth?${params.toString()}`
  );
}
