import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyState } from "@/lib/oauthState";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const stateParam = searchParams.get("state");
  const error = searchParams.get("error");

  if (error || !code || !stateParam) {
    return NextResponse.redirect(new URL(`/settings?error=${error || "missing_code"}`, req.url));
  }

  const verified = verifyState(stateParam);
  if (!verified) return NextResponse.redirect(new URL("/settings?error=invalid_state", req.url));

  const sessionClient = await createClient();
  const { data: { user } } = await sessionClient.auth.getUser();
  if (!user || user.id !== verified.userId) return NextResponse.redirect(new URL("/settings?error=session_mismatch", req.url));

  const clientId = process.env.LINKEDIN_CLIENT_ID!;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET!;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/linkedin-post/callback`;

  const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri, client_id: clientId, client_secret: clientSecret }),
  });

  if (!tokenRes.ok) return NextResponse.redirect(new URL("/settings?error=token_exchange_failed", req.url));
  const { access_token, expires_in } = await tokenRes.json();

  const supa = createServiceClient();
  await supa.from("profiles").update({
    linkedin_access_token: access_token,
  }).eq("id", user.id);

  return NextResponse.redirect(new URL("/settings?linkedin=connected", req.url));
}
