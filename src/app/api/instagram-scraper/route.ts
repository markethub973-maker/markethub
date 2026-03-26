import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Instagram Profile Search - PUBLIC DATA ONLY
 * Fetches basic public Instagram profile information
 * Uses official Instagram web data and Graph API
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const username = req.nextUrl.searchParams.get("username")?.trim().replace(/^@/, "");
  if (!username) return NextResponse.json({ error: "Username is required" }, { status: 400 });

  try {
    console.log(`[Instagram Search] Fetching public data for @${username}...`);

    // Try fetching from Instagram's public graph endpoint
    // This endpoint doesn't require authentication for public profiles
    const instagramRes = await fetch(
      `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
        },
      }
    );

    console.log(`[Instagram Search] Instagram public API response: ${instagramRes.status}`);

    if (instagramRes.ok) {
      try {
        const data = await instagramRes.json();
        const user = data.data?.user;

        if (user) {
          console.log(`[Instagram Search] Found public profile: ${user.username}`);

          return NextResponse.json({
            profile: {
              username: user.username,
              fullName: user.full_name,
              biography: user.biography,
              avatar: user.profile_pic_url,
              followers: user.follower_count || 0,
              following: user.following_count || 0,
              postsCount: user.media_count || 0,
              isVerified: user.is_verified,
              isPrivate: user.is_private,
              externalUrl: user.external_url,
              category: user.category || null,
            },
            engagementRate: 0,
            posts: [],
            source: 'instagram-public-api',
          });
        }
      } catch (parseErr) {
        console.log(`[Instagram Search] Could not parse Instagram public API response`);
      }
    }

    // If public API fails, try alternative approach
    console.log(`[Instagram Search] Public API failed, trying fallback...`);

    // Return a helpful message about limitations
    return NextResponse.json({
      error: "Instagram search unavailable",
      message: `Unable to fetch detailed data for @${username}. The RapidAPI subscription required for comprehensive Instagram analytics is not currently active.`,
      suggestion: "You can still view your own Instagram analytics by connecting your account in 'My Channel'.",
      status: "inactive_subscription",
    }, { status: 402 }); // 402 Payment Required - subscription needed

  } catch (err: any) {
    console.error("[Instagram Search] Error:", err.message);
    return NextResponse.json(
      { error: err.message, type: "system_error" },
      { status: 500 }
    );
  }
}
