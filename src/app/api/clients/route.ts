import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/route-helpers";

// GET — list all client accounts for this user
export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const user = { id: auth.userId };
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("client_accounts")
    .select("id, client_name, instagram_username, instagram_user_id, created_at, notes")
    .eq("user_id", auth.userId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ clients: data || [] });
}

// POST — add a new client account
export async function POST(req: NextRequest) {
  const auth = await requireAuth(); if (!auth.ok) return auth.response;
  const user = { id: auth.userId }; const supabase = await createClient();

  const body = await req.json().catch(() => ({}));
  const { client_name, instagram_username, instagram_user_id, instagram_access_token, notes } = body;

  if (!client_name?.trim()) return NextResponse.json({ error: "Client name is required" }, { status: 400 });
  if (!instagram_access_token?.trim()) return NextResponse.json({ error: "Instagram token is required" }, { status: 400 });
  if (!instagram_user_id?.trim()) return NextResponse.json({ error: "Instagram User ID is required" }, { status: 400 });

  // Validate token by fetching basic profile
  const verifyRes = await fetch(
    `https://graph.facebook.com/v22.0/${instagram_user_id}?fields=username,followers_count&access_token=${instagram_access_token}`
  );
  const verifyData = await verifyRes.json();

  if (verifyData.error) {
    return NextResponse.json({ error: `Token invalid: ${verifyData.error.message}` }, { status: 400 });
  }

  const { error } = await supabase.from("client_accounts").insert({
    user_id: auth.userId,
    client_name: client_name.trim(),
    instagram_username: verifyData.username || instagram_username?.trim() || "",
    instagram_user_id: instagram_user_id.trim(),
    instagram_access_token: instagram_access_token.trim(),
    notes: notes?.trim() || null,
  });

  if (error) {
    if (error.code === "42P01") {
      // Table not yet migrated — return a generic message without exposing DDL
      return NextResponse.json({
        error: "Service temporarily unavailable. Please contact support if this persists.",
        code: "TABLE_MISSING",
      }, { status: 503 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, username: verifyData.username, followers: verifyData.followers_count });
}

// DELETE — remove a client account
export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(); if (!auth.ok) return auth.response;
  const user = { id: auth.userId }; const supabase = await createClient();

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID missing" }, { status: 400 });

  const { error } = await supabase
    .from("client_accounts")
    .delete()
    .eq("id", id)
    .eq("user_id", auth.userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
