import { NextResponse } from "next/server";
import { resolveIGAuth } from "@/lib/adminPlatformToken";

const APP_ID = process.env.META_APP_ID;
const APP_SECRET = process.env.META_APP_SECRET;

export async function GET() {
  // Require auth — this route calls Meta API with app credentials and
  // previously had no access control (anyone could trigger it publicly).
  const auth = await resolveIGAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!APP_ID || !APP_SECRET) {
    return NextResponse.json({ error: "Meta credentials not set" }, { status: 500 });
  }

  try {
    // Get app access token
    const tokenRes = await fetch(
      `https://graph.facebook.com/oauth/access_token?client_id=${APP_ID}&client_secret=${APP_SECRET}&grant_type=client_credentials`
    );
    if (!tokenRes.ok) {
      return NextResponse.json({ error: "Failed to get Meta access token" }, { status: 502 });
    }
    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      return NextResponse.json({ error: tokenData.error.message }, { status: 400 });
    }

    const token = tokenData.access_token;

    // Get trending Instagram content via public hashtag search
    // Using Instagram oEmbed for public content display
    const trendingHashtags = ["trending", "viral", "reels", "explore"];

    const results = await Promise.allSettled(
      trendingHashtags.map(async (tag) => {
        const res = await fetch(
          `https://graph.facebook.com/v22.0/ig_hashtag_search?user_id=&q=${tag}&access_token=${token}`
        );
        return res.json();
      })
    );

    return NextResponse.json({
      token: token.substring(0, 20) + "...",
      status: "connected",
      message: "Meta API connected. Instagram Business account required for full data access."
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
