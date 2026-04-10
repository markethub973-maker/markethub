import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveIGAuth } from "@/lib/adminPlatformToken";
import { resolveIGToken } from "@/lib/igToken";

export async function GET(req: NextRequest) {
  const accountId = req.nextUrl.searchParams.get("account_id"); // instagram_id param

  // Admin path uses resolveIGAuth
  const auth = await resolveIGAuth();

  let token: string;
  let igId: string;

  if (auth?.isAdmin) {
    token = auth.token;
    igId = auth.igId;
  } else {
    // Regular user — instagram_connections stores metadata only (no tokens).
    // The Graph API token lives in profiles.instagram_access_token; one token
    // is shared across all accounts under the same Facebook Business Manager.
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let query = supabase
      .from("instagram_connections")
      .select("instagram_id, instagram_username")
      .eq("user_id", user.id);

    if (accountId) {
      query = query.eq("instagram_id", accountId);
    } else {
      // Default: primary account, or first connected
      query = query.order("is_primary", { ascending: false }).limit(1);
    }

    const { data: conn } = await query.single();

    if (!conn) {
      return NextResponse.json({ error: "No Instagram account connected. Go to Settings → Integrations." }, { status: 404 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("instagram_access_token")
      .eq("id", user.id)
      .single();

    if (!profile?.instagram_access_token) {
      return NextResponse.json({ error: "Instagram token missing. Reconnect from Settings → Integrations." }, { status: 404 });
    }

    token = profile.instagram_access_token as string;
    igId = conn.instagram_id as string;
  }

  if (!token || !igId) {
    return NextResponse.json({ error: "Instagram not configured" }, { status: 500 });
  }

  try {
    const resolvedToken = await resolveIGToken(token, igId);

    const profileRes = await fetch(
      `https://graph.facebook.com/v22.0/${igId}?fields=id,name,username,biography,followers_count,follows_count,media_count,profile_picture_url,website&access_token=${resolvedToken}`
    );
    if (!profileRes.ok) {
      return NextResponse.json({ error: "Failed to fetch Instagram profile" }, { status: 502 });
    }
    const profile = await profileRes.json();
    if (profile.error) {
      return NextResponse.json({ error: profile.error.message }, { status: 400 });
    }

    const mediaRes = await fetch(
      `https://graph.facebook.com/v22.0/${igId}/media?fields=id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count,permalink&limit=12&access_token=${resolvedToken}`
    );
    const media = mediaRes.ok ? await mediaRes.json() : { data: [] };

    let insightsData: unknown[] = [];
    try {
      const insRes = await fetch(
        `https://graph.facebook.com/v22.0/${igId}/insights?metric=impressions,reach,profile_views&period=day&access_token=${resolvedToken}`
      );
      const ins = await insRes.json();
      if (!ins.error) insightsData = ins.data || [];
    } catch {}

    return NextResponse.json({ profile, media: media.data || [], insights: insightsData });
  } catch (error) {
    console.error("Instagram API error:", error);
    return NextResponse.json({ error: "Failed to fetch Instagram data" }, { status: 500 });
  }
}
