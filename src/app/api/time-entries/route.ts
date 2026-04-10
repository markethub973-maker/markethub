import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/route-helpers";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const client = req.nextUrl.searchParams.get("client");
  const month = req.nextUrl.searchParams.get("month"); // YYYY-MM
  const supa = createServiceClient();
  let q = supa.from("time_entries").select("*").eq("user_id", auth.userId).order("date", { ascending: false });
  if (client) q = q.eq("client", client);
  if (month) q = q.gte("date", `${month}-01`).lte("date", `${month}-31`);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entries: data });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const body = await req.json();
  const supa = createServiceClient();
  const { data, error } = await supa.from("time_entries").insert({
    user_id: auth.userId,
    client: body.client ?? "",
    project: body.project ?? "",
    description: body.description ?? "",
    hours: body.hours ?? 0,
    rate: body.rate ?? 0,
    date: body.date ?? new Date().toISOString().slice(0, 10),
    billable: body.billable ?? true,
    invoiced: false,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entry: data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { id, ...rest } = await req.json();
  const supa = createServiceClient();
  const { data, error } = await supa.from("time_entries").update(rest).eq("id", id).eq("user_id", auth.userId).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entry: data });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { id } = await req.json();
  const supa = createServiceClient();
  await supa.from("time_entries").delete().eq("id", id).eq("user_id", auth.userId);
  return NextResponse.json({ ok: true });
}
