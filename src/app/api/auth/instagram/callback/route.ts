import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { encryptField } from "@/lib/fieldCrypto";
import { logAudit } from "@/lib/auditLog";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const userId = searchParams.get("state"); // passed from initiation route
  const error = searchParams.get("error");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  if (error || !code || !userId) {
    return NextResponse.redirect(`${appUrl}/settings?instagram=error&reason=${error || "missing_params"}`);
  }

  const supabase = createServiceClient(); // service role — no cookie auth needed

  try {
    // Step 1: Exchange code for short-lived token
    const tokenRes = await fetch(
      `https://graph.facebook.com/v22.0/oauth/access_token?` +
      new URLSearchParams({
        client_id: process.env.META_APP_ID!,
        client_secret: process.env.META_APP_SECRET!,
        redirect_uri: `${appUrl}/api/auth/instagram/callback`,
        code,
      })
    );
    const tokenData = await tokenRes.json();

    if (tokenData.error || !tokenData.access_token) {
      console.error("Facebook token error:", tokenData);
      return NextResponse.redirect(`${appUrl}/settings?instagram=error&reason=token_failed`);
    }

    // Step 2: Exchange for long-lived token (60 days)
    const longRes = await fetch(
      `https://graph.facebook.com/v22.0/oauth/access_token?` +
      new URLSearchParams({
        grant_type: "fb_exchange_token",
        client_id: process.env.META_APP_ID!,
        client_secret: process.env.META_APP_SECRET!,
        fb_exchange_token: tokenData.access_token,
      })
    );
    const longData = await longRes.json();
    const longToken = longData.access_token || tokenData.access_token;

    // Step 3: Get ALL Facebook Pages + linked Instagram accounts
    const pagesRes = await fetch(
      `https://graph.facebook.com/v22.0/me/accounts?fields=id,name,access_token,instagram_business_account{id,username,name},connected_instagram_account{id,username,name}&access_token=${longToken}`
    );
    const pagesData = await pagesRes.json();

    // If no pages found, try direct token approach (Business Manager accounts)
    if (!pagesData.data?.length) {
      // Try using the user token directly against the env-configured IG account
      const envIgId = process.env.INSTAGRAM_ACCOUNT_ID;
      if (envIgId) {
        const directRes = await fetch(
          `https://graph.facebook.com/v22.0/${envIgId}?fields=id,username,name&access_token=${longToken}`
        );
        const directData = await directRes.json();
        if (!directData.error && directData.id) {
          const { error: dbError } = await supabase
            .from("instagram_connections")
            .upsert({
              user_id: userId,
              instagram_id: directData.id,
              instagram_username: directData.username || "unknown",
              instagram_name: directData.name || directData.username || "unknown",
              account_label: directData.name || directData.username || "unknown",
              access_token: longToken,
              enc_access_token: encryptField(longToken),
              token_type: "bearer",
              is_primary: true,
              connected_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }, { onConflict: "user_id,instagram_id" });

          if (!dbError) {
            await supabase.from("profiles").update({
              instagram_access_token: longToken,
              instagram_user_id: directData.id,
              instagram_username: directData.username,
            }).eq("id", userId);

            return NextResponse.redirect(`${appUrl}/settings?instagram=connected&accounts=1`);
          }
        }
      }
      console.error("No Facebook pages found:", pagesData);
      return NextResponse.redirect(`${appUrl}/settings?instagram=no_page`);
    }

    // Collect ALL Instagram accounts across all pages
    const igAccounts: Array<{
      igId: string; igUsername: string; igName: string;
      pageId: string; pageName: string; pageToken: string;
    }> = [];

    for (const page of pagesData.data) {
      // Try both business and creator account fields
      let igAcc = page.instagram_business_account || page.connected_instagram_account;

      // Fallback: query the page directly
      if (!igAcc?.id) {
        const igRes = await fetch(
          `https://graph.facebook.com/v22.0/${page.id}?fields=instagram_business_account,connected_instagram_account&access_token=${page.access_token || longToken}`
        );
        const igData = await igRes.json();
        igAcc = igData.instagram_business_account || igData.connected_instagram_account;
      }

      if (igAcc?.id) {
        // Get username if missing
        let username = igAcc.username;
        if (!username) {
          const profileRes = await fetch(
            `https://graph.facebook.com/v22.0/${igAcc.id}?fields=username,name&access_token=${page.access_token || longToken}`
          );
          const profileData = await profileRes.json();
          username = profileData.username || igAcc.id;
        }

        igAccounts.push({
          igId: igAcc.id,
          igUsername: username || "unknown",
          igName: igAcc.name || username || "unknown",
          pageId: page.id,
          pageName: page.name,
          pageToken: page.access_token || longToken,
        });
      }
    }

    if (igAccounts.length === 0) {
      return NextResponse.redirect(`${appUrl}/settings?instagram=no_ig_account`);
    }

    // Step 4: Check existing connections to determine is_primary
    const { count } = await supabase
      .from("instagram_connections")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    const hasExisting = (count ?? 0) > 0;

    // Step 5: Upsert ALL found Instagram accounts
    let savedCount = 0;
    for (let i = 0; i < igAccounts.length; i++) {
      const acc = igAccounts[i];
      const isPrimary = !hasExisting && i === 0;

      const { error: dbError } = await supabase
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
            token_type: "bearer",
            is_primary: isPrimary,
            connected_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,instagram_id" }
        );

      if (!dbError) savedCount++;
      else console.error(`Error saving IG account ${acc.igUsername}:`, dbError);
    }

    // Also update profiles for backward compatibility
    if (igAccounts.length > 0) {
      const primary = igAccounts[0];
      await supabase.from("profiles").update({
        instagram_access_token: primary.pageToken,
        instagram_user_id: primary.igId,
        instagram_username: primary.igUsername,
      }).eq("id", userId);
    }

    await logAudit({
      action: "token_refreshed",
      actor_id: userId,
      entity_type: "instagram_oauth",
      details: { accounts_saved: savedCount, total_found: igAccounts.length },
    });

    return NextResponse.redirect(
      `${appUrl}/settings?instagram=connected&accounts=${savedCount}`
    );
  } catch (err) {
    console.error("Instagram callback error:", err);
    return NextResponse.redirect(`${appUrl}/settings?instagram=error&reason=unexpected`);
  }
}
