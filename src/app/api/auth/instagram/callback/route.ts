import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
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

    const appId = process.env.INSTAGRAM_APP_ID;
    const appSecret = process.env.INSTAGRAM_APP_SECRET;
    const redirectUri = process.env.INSTAGRAM_REDIRECT_URI;

    if (!appId || !appSecret || !redirectUri) {
      return NextResponse.redirect(new URL("/settings?error=config_missing", request.url));
    }

    // Step 1: Exchange code for Facebook user access token
    const tokenResponse = await fetch("https://graph.facebook.com/v22.0/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: appId,
        client_secret: appSecret,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        code,
      }).toString(),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) {
      console.error("Facebook token error:", tokenData);
      return NextResponse.redirect(new URL("/settings?error=token_failed", request.url));
    }

    // Step 2: Get ALL Facebook pages + linked Instagram accounts
    const accountsResponse = await fetch(
      `https://graph.facebook.com/v22.0/me/accounts?fields=id,name,access_token,instagram_business_account{id,username,name},connected_instagram_account{id,username,name}&access_token=${tokenData.access_token}`
    );
    const accountsData = await accountsResponse.json();

    if (!accountsData.data?.length) {
      console.error("No Facebook pages found:", accountsData);
      return NextResponse.redirect(new URL("/settings?error=no_instagram_account", request.url));
    }

    // Collect ALL Instagram accounts across all pages
    const igAccounts: Array<{
      igId: string; igUsername: string; igName: string;
      pageId: string; pageName: string; pageToken: string;
    }> = [];

    for (const page of accountsData.data) {
      const igAcc = page.instagram_business_account || page.connected_instagram_account;
      if (igAcc?.id) {
        igAccounts.push({
          igId: igAcc.id,
          igUsername: igAcc.username || "unknown",
          igName: igAcc.name || igAcc.username || "unknown",
          pageId: page.id,
          pageName: page.name,
          pageToken: page.access_token || tokenData.access_token,
        });
      }
    }

    if (igAccounts.length === 0) {
      return NextResponse.redirect(new URL("/settings?error=no_instagram_account", request.url));
    }

    // Step 3: Save to Supabase
    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user?.id) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    const userId = authData.user.id;

    // Check if user has any existing connections to determine is_primary
    const { count } = await supabase
      .from("instagram_connections")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    const hasExisting = (count ?? 0) > 0;

    // Upsert ALL found Instagram accounts (multi-account support)
    let savedCount = 0;
    for (let i = 0; i < igAccounts.length; i++) {
      const acc = igAccounts[i];
      const isPrimary = !hasExisting && i === 0; // first account is primary if no existing

      const { error } = await supabase
        .from("instagram_connections")
        .upsert(
          {
            user_id: userId,
            instagram_id: acc.igId,
            instagram_username: acc.igUsername,
            instagram_name: acc.igName,
            account_label: acc.igName,
            page_id: acc.pageId,
            page_name: acc.pageName,
            access_token: acc.pageToken,
            enc_access_token: encryptField(acc.pageToken),
            token_type: tokenData.token_type || "bearer",
            is_primary: isPrimary,
            connected_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,instagram_id" }
        );

      if (!error) savedCount++;
      else console.error(`Error saving IG account ${acc.igUsername}:`, error);
    }

    await logAudit({
      action: "token_refreshed",
      actor_id: userId,
      entity_type: "instagram_oauth",
      details: { accounts_saved: savedCount, total_found: igAccounts.length },
    });

    return NextResponse.redirect(
      new URL(`/settings?instagram=connected&accounts=${savedCount}`, request.url)
    );
  } catch (error) {
    console.error("Instagram callback error:", error);
    return NextResponse.redirect(new URL("/settings?error=unexpected", request.url));
  }
}
