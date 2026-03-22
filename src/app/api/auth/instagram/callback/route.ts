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

    let igUserId = null;
    let igUsername = null;
    let savedToken = longToken;

    // Approach 1: Business Management API — find IG accounts via business portfolios
    const bizRes = await fetch(
      `https://graph.facebook.com/v21.0/me/businesses?fields=id,name&access_token=${longToken}`
    );
    const bizData = await bizRes.json();
    console.error("[Instagram CB] businesses:", JSON.stringify(bizData));

    if (!bizData.error && bizData.data?.length > 0) {
      for (const biz of bizData.data) {
        const igAccountsRes = await fetch(
          `https://graph.facebook.com/v21.0/${biz.id}/instagram_business_accounts?fields=id,username&access_token=${longToken}`
        );
        const igAccountsData = await igAccountsRes.json();
        console.error("[Instagram CB] ig_accounts for biz", biz.id, ":", JSON.stringify(igAccountsData));
        if (!igAccountsData.error && igAccountsData.data?.length > 0) {
          igUserId = igAccountsData.data[0].id;
          igUsername = igAccountsData.data[0].username || null;
          break;
        }
      }
    }

    // Approach 2: me/accounts (pages) with page tokens
    if (!igUserId) {
      const pagesRes = await fetch(
        `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,instagram_business_account,connected_instagram_account&access_token=${longToken}`
      );
      const pagesData = await pagesRes.json();
      console.error("[Instagram CB] pages:", JSON.stringify(pagesData));

      const pages = pagesData.data && pagesData.data.length > 0 ? pagesData.data : [];

      for (const page of pages) {
        // Try instagram_business_account OR connected_instagram_account from /me/accounts response
        const linkedIg = page.instagram_business_account?.id || page.connected_instagram_account?.id;
        if (linkedIg) {
          igUserId = linkedIg;
          const pageToken = page.access_token || longToken;
          const profileRes = await fetch(
            `https://graph.facebook.com/v21.0/${igUserId}?fields=username&access_token=${pageToken}`
          );
          const profileData = await profileRes.json();
          igUsername = profileData.username || null;
          savedToken = pageToken;
          break;
        }
        // Try fetching with page token
        const pageToken = page.access_token;
        if (pageToken) {
          const igRes = await fetch(
            `https://graph.facebook.com/v21.0/${page.id}?fields=instagram_business_account,connected_instagram_account&access_token=${pageToken}`
          );
          const igData = await igRes.json();
          const foundIg = igData.instagram_business_account?.id || igData.connected_instagram_account?.id;
          if (foundIg) {
            igUserId = foundIg;
            const profileRes = await fetch(
              `https://graph.facebook.com/v21.0/${igUserId}?fields=username&access_token=${pageToken}`
            );
            const profileData = await profileRes.json();
            igUsername = profileData.username || null;
            savedToken = pageToken;
            break;
          }
        }
      }
    }

    // Approach 3: Known pages from env
    if (!igUserId) {
      const knownPageIds = (process.env.FACEBOOK_PAGE_IDS || "").split(",").filter(Boolean);
      for (const pageId of knownPageIds) {
        const pageRes = await fetch(
          `https://graph.facebook.com/v21.0/${pageId}?fields=access_token,instagram_business_account&access_token=${longToken}`
        );
        const pageData = await pageRes.json();
        if (pageData.instagram_business_account?.id) {
          igUserId = pageData.instagram_business_account.id;
          const pageToken = pageData.access_token || longToken;
          const profileRes = await fetch(
            `https://graph.facebook.com/v21.0/${igUserId}?fields=username&access_token=${pageToken}`
          );
          const profileData = await profileRes.json();
          igUsername = profileData.username || null;
          savedToken = pageToken;
          break;
        }
      }
    }

    // Approach 4: INSTAGRAM_ACCOUNT_ID env fallback
    if (!igUserId && process.env.INSTAGRAM_ACCOUNT_ID) {
      igUserId = process.env.INSTAGRAM_ACCOUNT_ID;
      const profileRes = await fetch(
        `https://graph.facebook.com/v21.0/${igUserId}?fields=username&access_token=${longToken}`
      );
      const profileData = await profileRes.json();
      igUsername = profileData.username || null;
    }

    if (!igUserId) {
      return NextResponse.redirect(`${appUrl}/settings?instagram=no_ig_account`);
    }

    // Save to Supabase — use Page Access Token for proper Instagram Business API access
    await supabase.from("profiles").update({
      instagram_access_token: savedToken,
      instagram_user_id: igUserId,
      instagram_username: igUsername,
    }).eq("id", userId);

    return NextResponse.redirect(`${appUrl}/settings?instagram=success`);
  } catch {
    return NextResponse.redirect(`${appUrl}/settings?instagram=error`);
  }
}
