import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/route-helpers";

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const user = { id: auth.userId };
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("instagram_connections")
    .select("id, instagram_id, instagram_username, instagram_name, account_label, is_primary, page_name, connected_at")
    .eq("user_id", auth.userId)
    .order("is_primary", { ascending: false })
    .order("connected_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ accounts: data ?? [] });
}

// Set primary account
export async function POST(req: Request) {
  const auth = await requireAuth(); if (!auth.ok) return auth.response;
  const user = { id: auth.userId }; const supabase = await createClient();

  const { instagram_id, action } = await req.json();

  if (action === "set_primary") {
    await supabase
      .from("instagram_connections")
      .update({ is_primary: false })
      .eq("user_id", auth.userId);

    await supabase
      .from("instagram_connections")
      .update({ is_primary: true })
      .eq("user_id", auth.userId)
      .eq("instagram_id", instagram_id);

    return NextResponse.json({ success: true });
  }

  if (action === "disconnect") {
    await supabase
      .from("instagram_connections")
      .delete()
      .eq("user_id", auth.userId)
      .eq("instagram_id", instagram_id);

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
