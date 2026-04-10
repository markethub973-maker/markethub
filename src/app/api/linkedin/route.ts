import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/route-helpers";
import { createServiceClient } from "@/lib/supabase/service";

// LinkedIn OAuth with openid/profile/email/w_member_social scopes only
// exposes the *authenticated* user's own profile via /v2/userinfo. There is
// no supported way to look up arbitrary LinkedIn users — the page is now an
// account status view, not a search tool.
export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const supa = createServiceClient();
  const { data: profile } = await supa
    .from("profiles")
    .select("linkedin_access_token")
    .eq("id", auth.userId)
    .single();

  if (!profile?.linkedin_access_token) {
    return NextResponse.json({
      connected: false,
      connect_url: "/api/auth/linkedin-post/connect",
    });
  }

  const meRes = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${profile.linkedin_access_token}` },
  });

  if (!meRes.ok) {
    // Token expired or revoked — clear it so the UI can prompt reconnect.
    await supa.from("profiles").update({ linkedin_access_token: null }).eq("id", auth.userId);
    return NextResponse.json({
      connected: false,
      error: "Token LinkedIn expirat. Reconectează-te.",
      connect_url: "/api/auth/linkedin-post/connect",
    });
  }

  const me = await meRes.json();

  return NextResponse.json({
    connected: true,
    profile: {
      sub: me.sub,
      name: me.name ?? `${me.given_name ?? ""} ${me.family_name ?? ""}`.trim(),
      given_name: me.given_name ?? "",
      family_name: me.family_name ?? "",
      email: me.email ?? "",
      email_verified: me.email_verified ?? false,
      picture: me.picture ?? "",
      locale: me.locale ?? null,
    },
  });
}
