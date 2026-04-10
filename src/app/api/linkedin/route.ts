import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/route-helpers";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const username = req.nextUrl.searchParams.get("username");
  if (!username) return NextResponse.json({ error: "username required" }, { status: 400 });

  // Check if user has LinkedIn connected via OAuth
  const supa = createServiceClient();
  const { data: profile } = await supa
    .from("profiles")
    .select("linkedin_access_token")
    .eq("id", auth.userId)
    .single();

  if (!profile?.linkedin_access_token) {
    return NextResponse.json({
      error: "Conectează-ți contul LinkedIn pentru a vedea date de profil.",
      needs_auth: true,
      connect_url: "/api/auth/linkedin-post/connect",
    }, { status: 401 });
  }

  try {
    // Use LinkedIn API with OAuth token
    const meRes = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${profile.linkedin_access_token}` },
    });

    if (!meRes.ok) {
      // Token expired
      await supa.from("profiles").update({ linkedin_access_token: null }).eq("id", auth.userId);
      return NextResponse.json({
        error: "Token LinkedIn expirat. Reconectează-te.",
        needs_auth: true,
        connect_url: "/api/auth/linkedin-post/connect",
      }, { status: 401 });
    }

    const me = await meRes.json();

    return NextResponse.json({
      profile: {
        name: me.name ?? `${me.given_name ?? ""} ${me.family_name ?? ""}`.trim(),
        headline: "",
        summary: "",
        followers: 0,
        connections: 0,
        location: me.locale?.country ?? "",
        avatar: me.picture ?? "",
        url: `https://www.linkedin.com/in/${username}/`,
        company: "",
        position: "",
        email: me.email ?? "",
      },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
