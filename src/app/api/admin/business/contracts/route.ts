import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/adminAuth";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const supa = createServiceClient();
  const { data, error } = await supa.from("agency_contracts").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ contracts: data });
}

export async function POST(req: NextRequest) {
  if (!isAdminAuthorized(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const supa = createServiceClient();
  const { data: admin } = await supa.from("profiles").select("id").eq("is_admin", true).limit(1).single();
  const { data, error } = await supa.from("agency_contracts").insert({ ...body, user_id: admin?.id }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ contract: data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  if (!isAdminAuthorized(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id, ...rest } = await req.json();
  const supa = createServiceClient();
  const { data, error } = await supa.from("agency_contracts").update(rest).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ contract: data });
}

export async function DELETE(req: NextRequest) {
  if (!isAdminAuthorized(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await req.json();
  const supa = createServiceClient();
  const { error } = await supa.from("agency_contracts").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
