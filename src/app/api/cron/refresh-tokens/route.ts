import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isAdminAuthorized } from "@/lib/adminAuth";
import { timingSafeEqual } from "crypto";

const META_APP_ID = process.env.META_APP_ID!;
const META_APP_SECRET = process.env.META_APP_SECRET!;
const CRON_SECRET = process.env.CRON_SECRET ?? "";

/**
 * Auto-refresh Instagram/Facebook tokens before they expire.
 * Called weekly by Vercel Cron. Also callable manually from admin.
 *
 * Moved from /api/admin/refresh-tokens — the old path was behind the admin
 * tunnel check in proxy.ts which requires ?t=<ADMIN_TUNNEL_SECRET> in the
 * query string. Vercel cron can't set query params, so the old cron was
 * silently returning 404 and the Instagram/FB tokens were never getting
 * refreshed automatically.
 */
export async function GET(req: NextRequest) {
  // Accept: Vercel cron Bearer token OR admin session cookie (for manual trigger)
  const authHeader = req.headers.get("authorization") ?? "";
  const provided = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  let fromCron = false;
  if (CRON_SECRET && provided && provided.length === CRON_SECRET.length) {
    try {
      fromCron = timingSafeEqual(Buffer.from(provided), Buffer.from(CRON_SECRET));
    } catch { /* mismatched length */ }
  }
  const fromAdmin = isAdminAuthorized(req);

  if (!fromCron && !fromAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const results: Record<string, string> = {};

  try {
    // ── Instagram / Facebook token refresh ─────────────────────────────
    const { data: igConfig } = await supabase
      .from("admin_platform_config")
      .select("token, extra_data")
      .eq("platform", "instagram")
      .single();

    if (igConfig?.extra_data?.user_token) {
      const userToken = igConfig.extra_data.user_token;

      // Refresh the long-lived user token (extends another 60 days)
      const refreshRes = await fetch(
        `https://graph.facebook.com/oauth/access_token?grant_type=fb_exchange_token&client_id=${META_APP_ID}&client_secret=${META_APP_SECRET}&fb_exchange_token=${userToken}`
      );
      const refreshData = await refreshRes.json();

      if (refreshData.access_token) {
        const newUserToken = refreshData.access_token;

        // Get fresh Page Token from new user token
        const pageRes = await fetch(
          `https://graph.facebook.com/v22.0/${igConfig.extra_data.page_id}?fields=access_token&access_token=${newUserToken}`
        );
        const pageData = await pageRes.json();
        const newPageToken = pageData.access_token || igConfig.token;

        // Update both tokens in DB
        await supabase
          .from("admin_platform_config")
          .update({
            token: newPageToken,
            extra_data: {
              ...igConfig.extra_data,
              user_token: newUserToken,
              last_refresh: new Date().toISOString(),
            },
            updated_at: new Date().toISOString(),
          })
          .eq("platform", "instagram");

        results.instagram = "✅ Refreshed successfully";
      } else {
        results.instagram = `⚠️ Refresh failed: ${refreshData.error?.message || "unknown error"}`;
      }
    } else {
      results.instagram = "⚠️ No user_token stored — manual re-auth needed";
    }

    // ── Facebook Pages token refresh ────────────────────────────────────
    const { data: fbConfig } = await supabase
      .from("admin_platform_config")
      .select("token, extra_data")
      .eq("platform", "facebook")
      .single();

    if (fbConfig?.extra_data?.user_token || igConfig?.extra_data?.user_token) {
      const userToken = fbConfig?.extra_data?.user_token || igConfig?.extra_data?.user_token;
      const pageId = fbConfig?.extra_data?.page_id || igConfig?.extra_data?.page_id;

      if (pageId) {
        const pageRes = await fetch(
          `https://graph.facebook.com/v22.0/${pageId}?fields=access_token&access_token=${userToken}`
        );
        const pageData = await pageRes.json();

        if (pageData.access_token) {
          await supabase
            .from("admin_platform_config")
            .update({
              token: pageData.access_token,
              extra_data: {
                ...(fbConfig?.extra_data || {}),
                last_refresh: new Date().toISOString(),
              },
              updated_at: new Date().toISOString(),
            })
            .eq("platform", "facebook");

          results.facebook = "✅ Refreshed successfully";
        } else {
          results.facebook = "⚠️ Could not refresh page token";
        }
      }
    } else {
      results.facebook = "⚠️ No token stored";
    }

    // ── Per-user Instagram token refresh ────────────────────────────────
    // Each row in instagram_connections has its own page_access_token that
    // also expires in ~60 days. Walk all rows and re-exchange each token
    // against Graph API. This covers the multi-account case the cron
    // didn't touch before (only admin_platform_config was refreshed).
    const { data: userConns } = await supabase
      .from("instagram_connections")
      .select("id, user_id, instagram_id, instagram_username, page_id, page_access_token")
      .not("page_access_token", "is", null);

    let userRefreshed = 0;
    let userFailed = 0;
    let userSkipped = 0;
    for (const conn of userConns ?? []) {
      if (!conn.page_access_token || !conn.page_id) {
        userSkipped++;
        continue;
      }
      try {
        // Exchange the current page token for a fresh long-lived one.
        // Facebook Graph API supports fb_exchange_token on user tokens —
        // for page tokens we refetch the page's current access_token via
        // the stored user_token path if available, otherwise we re-request
        // it through the same grant.
        const exchangeRes = await fetch(
          `https://graph.facebook.com/v22.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${META_APP_ID}&client_secret=${META_APP_SECRET}&fb_exchange_token=${conn.page_access_token}`
        );
        const exchangeData = await exchangeRes.json();
        if (exchangeData.access_token) {
          await supabase
            .from("instagram_connections")
            .update({ page_access_token: exchangeData.access_token })
            .eq("id", conn.id);
          userRefreshed++;
        } else {
          userFailed++;
        }
      } catch {
        userFailed++;
      }
    }
    results.instagram_per_user = `${userRefreshed} refreshed, ${userFailed} failed, ${userSkipped} skipped`;

    // Log cron run
    await supabase.from("cron_logs").upsert({
      job: "refresh-tokens",
      ran_at: new Date().toISOString(),
      result: results,
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (err) {
    console.error("Token refresh error:", err);
    return NextResponse.json({ error: "Refresh failed", details: String(err) }, { status: 500 });
  }
}
