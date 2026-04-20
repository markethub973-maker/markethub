import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { signState } from "@/lib/oauthState";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const appId = process.env.META_APP_ID;
  if (!appId) return NextResponse.redirect(new URL("/social-accounts?error=meta_not_configured", req.url));

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/facebook-page/callback`;
  const scope = "pages_show_list,pages_read_engagement,pages_read_user_content,read_insights";

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    scope,
    response_type: "code",
    state: signState(user.id),
  });

  return NextResponse.redirect(`https://www.facebook.com/v19.0/dialog/oauth?${params}`);
}
