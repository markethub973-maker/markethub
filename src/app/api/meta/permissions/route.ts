import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/route-helpers";

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const user = { id: auth.userId };
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("instagram_access_token")
    .eq("id", auth.userId)
    .single();

  const token = profile?.instagram_access_token || process.env.META_ACCESS_TOKEN;
  if (!token) return NextResponse.json({ error: "Meta not connected" }, { status: 401 });

  try {
    const res = await fetch(
      `https://graph.facebook.com/v22.0/me/permissions?access_token=${token}`
    );
    const data = await res.json();

    if (data.error) {
      return NextResponse.json({ error: data.error.message }, { status: 400 });
    }

    const permissions: Array<{ permission: string; status: string }> = data.data || [];
    const granted = permissions.filter(p => p.status === "granted").map(p => p.permission);
    const declined = permissions.filter(p => p.status === "declined").map(p => p.permission);

    const DESIRED = [
      "instagram_basic",
      "instagram_manage_insights",
      "pages_show_list",
      "instagram_manage_comments",
      "ads_read",
      "ads_management",
    ];

    const missing = DESIRED.filter(p => !granted.includes(p));
    const needs_reconnect = missing.length > 0;

    return NextResponse.json({ granted, declined, missing, needs_reconnect });
  } catch (err) {
    console.error("[Permissions] Error:", err);
    return NextResponse.json({ error: "Failed to check permissions" }, { status: 500 });
  }
}
