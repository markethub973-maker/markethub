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
    return NextResponse.redirect(new URL(`/social-accounts?error=${error || "missing_code"}`, req.url));
  }

  const verified = verifyState(stateParam);
  if (!verified) return NextResponse.redirect(new URL("/social-accounts?error=invalid_state", req.url));

  const sessionClient = await createClient();
  const { data: { user } } = await sessionClient.auth.getUser();
  if (!user || user.id !== verified.userId) return NextResponse.redirect(new URL("/social-accounts?error=session_mismatch", req.url));

  const appId = process.env.META_APP_ID!;
  const appSecret = process.env.META_APP_SECRET!;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/facebook-page/callback`;

  // Exchange code for user access token
  const tokenRes = await fetch(
    `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`
  );
  if (!tokenRes.ok) return NextResponse.redirect(new URL("/social-accounts?error=token_exchange_failed", req.url));
  const { access_token } = await tokenRes.json();

  // Get managed pages
  const pagesRes = await fetch(
    `https://graph.facebook.com/v19.0/me/accounts?access_token=${access_token}`
  );
  if (!pagesRes.ok) return NextResponse.redirect(new URL("/social-accounts?error=pages_fetch_failed", req.url));
  const { data: pages } = await pagesRes.json();

  if (!pages?.length) return NextResponse.redirect(new URL("/social-accounts?error=no_pages_found", req.url));

  // Use first page
  const page = pages[0];
  const supa = createServiceClient();
  await supa.from("profiles").update({
    fb_page_id: page.id,
    fb_page_name: page.name,
    fb_page_access_token: page.access_token,
  }).eq("id", user.id);

  return NextResponse.redirect(new URL("/social-accounts?fb_page=connected", req.url));
}
