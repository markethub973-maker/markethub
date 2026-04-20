import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/route-helpers";

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("competitor_snapshots")
    .select("*")
    .eq("user_id", auth.userId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ snapshots: data });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const { domain, name, data: snapshotData } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const supabase = await createClient();

    // Upsert: if same domain exists for this user, update it
    if (domain) {
      const { data: existing } = await supabase
        .from("competitor_snapshots")
        .select("id")
        .eq("user_id", auth.userId)
        .eq("domain", domain)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from("competitor_snapshots")
          .update({ name, data: snapshotData || {} })
          .eq("id", existing.id)
          .eq("user_id", auth.userId)
          .select()
          .single();

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
        return NextResponse.json({ snapshot: data });
      }
    }

    const { data, error } = await supabase
      .from("competitor_snapshots")
      .insert({
        user_id: auth.userId,
        domain: domain || null,
        name,
        data: snapshotData || {},
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ snapshot: data });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("competitor_snapshots")
    .delete()
    .eq("id", id)
    .eq("user_id", auth.userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
