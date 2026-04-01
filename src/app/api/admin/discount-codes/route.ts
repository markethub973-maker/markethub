import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  return data?.is_admin ? user : null;
}

// GET — list all discount codes
export async function GET() {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("discount_codes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ codes: [], table_exists: false });
  return NextResponse.json({ codes: data ?? [], table_exists: true });
}

// POST — create a new code
export async function POST(req: Request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
export async function PATCH(req: Request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, is_active } = await req.json() as { id: string; is_active: boolean };
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const supabase = createServiceClient();
  const { error } = await supabase.from("discount_codes").update({ is_active }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}

// DELETE — remove a code
export async function DELETE(req: Request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const supabase = createServiceClient();
  const { error } = await supabase.from("discount_codes").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
