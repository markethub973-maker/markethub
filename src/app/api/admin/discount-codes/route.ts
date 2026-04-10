import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isAdminAuthorized } from "@/lib/adminAuth";

// GET — list all discount codes
export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("discount_codes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ codes: [], table_exists: false });
  return NextResponse.json({ codes: data ?? [], table_exists: true });
}

// POST — create a new code
export async function POST(req: NextRequest) {
  if (!isAdminAuthorized(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { code, description, discount_pct, max_uses, applies_to, expires_at } = body as {
    code: string; description?: string; discount_pct: number;
    max_uses?: number; applies_to?: string[]; expires_at?: string;
  };

  if (!code?.trim()) return NextResponse.json({ error: "Code is required" }, { status: 400 });
  if (!discount_pct || discount_pct < 1 || discount_pct > 100)
    return NextResponse.json({ error: "Discount must be 1–100%" }, { status: 400 });

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("discount_codes")
    .insert({
      code: code.trim().toUpperCase(),
      description: description?.trim() ?? "",
      discount_pct,
      max_uses: max_uses ?? 0,
      applies_to: applies_to ?? [],
      expires_at: expires_at || null,
      is_active: true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ code: data });
}

// PATCH — toggle active / deactivate
export async function PATCH(req: NextRequest) {
  if (!isAdminAuthorized(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, is_active } = await req.json() as { id: string; is_active: boolean };
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const supabase = createServiceClient();
  const { error } = await supabase.from("discount_codes").update({ is_active }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}

// DELETE — remove a code
export async function DELETE(req: NextRequest) {
  if (!isAdminAuthorized(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const supabase = createServiceClient();
  const { error } = await supabase.from("discount_codes").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
