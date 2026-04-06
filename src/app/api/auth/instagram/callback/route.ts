import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/client";
import { encryptField } from "@/lib/fieldCrypto";
import { logAudit } from "@/lib/auditLog";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (!code || !state) {
      return NextResponse.redirect(new URL("/settings?error=missing_code", request.url));
    }

    // Verify state (in production, compare with stored state)
    // For now, we accept the state

    // Exchange code for access token
    const appId = process.env.INSTAGRAM_APP_ID;
    const appSecret = process.env.INSTAGRAM_APP_SECRET;
    const redirectUri = process.env.INSTAGRAM_REDIRECT_URI;

    if (!appId || !appSecret || !redirectUri) {
      return NextResponse.redirect(
        new URL("/settings?error=config_missing", request.url)
      );
    }

    // Step 1: Exchange code for Facebook access token
    const tokenResponse = await fetch(
      "https://graph.facebook.com/v22.0/oauth/access_token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: appId,
          client_secret: appSecret,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
          code,
        }).toString(),
      }
    );

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      console.error("Facebook token error:", tokenData);
      return NextResponse.redirect(new URL("/settings?error=token_failed", request.url));
    }

    // Step 2: Get Instagram accounts linked to Facebook
    const accountsResponse = await fetch(
      `https://graph.facebook.com/v22.0/me/accounts?fields=instagram_business_account{id,username,name}&access_token=${tokenData.access_token}`
    );
    const accountsData = await accountsResponse.json();

    // Find first Instagram business account
    const page = accountsData.data?.find((p: any) => p.instagram_business_account);
    const igAccount = page?.instagram_business_account;

    if (!igAccount?.id) {
      console.error("No Instagram business account found:", accountsData);
      return NextResponse.redirect(new URL("/settings?error=no_instagram_account", request.url));
    }

    const userData = {
      id: igAccount.id,
      username: igAccount.username || "unknown",
      name: igAccount.name || igAccount.username || "unknown",
    };

    // Step 3: Save to Supabase
    const supabase = createClient();
    const { data: user } = await supabase.auth.getUser();

    if (!user?.user?.id) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Save Instagram connection to database (token stored encrypted)
    const { error } = await supabase
      .from("instagram_connections")
      .upsert(
        {
          user_id: user.user.id,
          instagram_id: userData.id,
          instagram_username: userData.username,
          instagram_name: userData.name,
          access_token:     tokenData.access_token,          // plaintext (backward-compat)
          enc_access_token: encryptField(tokenData.access_token), // encrypted shadow
          token_type: tokenData.token_type || "bearer",
          connected_at: new Date(),
        },
        { onConflict: "user_id" }
      );

    if (error) {
      console.error("Database error:", error);
      return NextResponse.redirect(new URL("/settings?error=db_failed", request.url));
    }

    await logAudit({
      action: "token_refreshed",
      actor_id: user.user.id,
      entity_type: "instagram_oauth",
    });

    // Success - redirect to settings with success message
    return NextResponse.redirect(new URL("/settings?instagram=connected", request.url));
  } catch (error) {
    console.error("Instagram callback error:", error);
    return NextResponse.redirect(new URL("/settings?error=unexpected", request.url));
  }
}
