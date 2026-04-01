import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const appId = process.env.INSTAGRAM_APP_ID;
    const redirectUri = process.env.INSTAGRAM_REDIRECT_URI;

    if (!appId || !redirectUri) {
      return NextResponse.json(
        { error: "Instagram app configuration missing" },
        { status: 500 }
      );
    }

    // Generate random state for security
    const state = Math.random().toString(36).substring(7);

    // Facebook OAuth URL (Instagram Graph API uses Facebook OAuth, not Instagram Basic Display)
    const instagramAuthUrl = new URL("https://www.facebook.com/dialog/oauth");
    instagramAuthUrl.searchParams.append("client_id", appId);
    instagramAuthUrl.searchParams.append("redirect_uri", redirectUri);
    instagramAuthUrl.searchParams.append("scope", "instagram_basic,instagram_manage_insights,pages_show_list,instagram_manage_comments,ads_read,ads_management");
    instagramAuthUrl.searchParams.append("response_type", "code");
    instagramAuthUrl.searchParams.append("state", state);

    // Store state in session/cookie for validation
    const response = NextResponse.redirect(instagramAuthUrl);
    response.cookies.set("instagram_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 10 * 60, // 10 minutes
    });

    return response;
  } catch (error) {
    console.error("Instagram auth error:", error);
    return NextResponse.json({ error: "Failed to start Instagram login" }, { status: 500 });
  }
}
