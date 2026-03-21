import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const userId = searchParams.get("state");
  const error = searchParams.get("error");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  if (error || !code || !userId) {
    return NextResponse.redirect(`${appUrl}/settings?instagram=error`);
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  try {
    // Exchange code for short-lived token
    const tokenRes = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?` +
      new URLSearchParams({
        client_id: process.env.META_APP_ID!,
        client_secret: process.env.META_APP_SECRET!,
        redirect_uri: `${appUrl}/api/auth/instagram/callback`,
        code,
      })
    );
    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      return NextResponse.redirect(`${appUrl}/settings?instagram=error`);
    }

    // Exchange for long-lived token (60 days)
    const longRes = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?` +
      new URLSearchParams({
        grant_type: "fb_exchange_token",
        client_id: process.env.META_APP_ID!,
        client_secret: process.env.META_APP_SECRET!,
        fb_exchange_token: tokenData.access_token,
      })
    );
    const longData = await longRes.json();
    const longToken = longData.access_token || tokenData.access_token;

    // Get Facebook Pages
    const pagesRes = await fetch(
      `https://graph.facebook.com/v21.0/me/accounts?access_token=${longToken}`
    );
    const pagesData = await pagesRes.json();

    if (!pagesData.data || pagesData.data.length === 0) {
      return NextResponse.redirect(`${appUrl}/settings?instagram=no_page`);
    }

    // Find Instagram Business Account connected to a Page
    let igUserId = null;
    let igUsername = null;

    for (const page of pagesData.data) {
      const igRes = await fetch(
        `https://graph.facebook.com/v21.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`
      );
      const igData = await igRes.json();

      if (igData.instagram_business_account?.id) {
        igUserId = igData.instagram_business_account.id;

        // Get username
        const profileRes = await fetch(
          `https://graph.facebook.com/v21.0/${igUserId}?fields=username&access_token=${longToken}`
        );
        const profileData = await profileRes.json();
        igUsername = profileData.username || null;
        break;
      }
    }

    if (!igUserId) {
      return NextResponse.redirect(`${appUrl}/settings?instagram=no_ig_account`);
    }

    // Save to Supabase
    await supabase.from("profiles").update({
      instagram_access_token: longToken,
      instagram_user_id: igUserId,
      instagram_username: igUsername,
    }).eq("id", userId);

    return NextResponse.redirect(`${appUrl}/settings?instagram=success`);
  } catch {
    return NextResponse.redirect(`${appUrl}/settings?instagram=error`);
  }
}
