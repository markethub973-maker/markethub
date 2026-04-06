import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

const META_APP_ID = process.env.META_APP_ID!;
const META_APP_SECRET = process.env.META_APP_SECRET!;
const CRON_SECRET = process.env.CRON_SECRET!;

/**
 * Auto-refresh Instagram/Facebook tokens before they expire.
 * Called weekly by Vercel Cron. Also callable manually from admin.
 */
export async function GET(req: Request) {
  // Allow both cron (Authorization header) and admin cookie
  const authHeader = req.headers.get("authorization");
  const isCron = authHeader === `Bearer ${CRON_SECRET}`;

  if (!isCron) {
    // Check admin cookie fallback for manual trigger
    const cookie = req.headers.get("cookie") || "";
    const isAdmin = cookie.includes("admin_session_token=");
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
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
