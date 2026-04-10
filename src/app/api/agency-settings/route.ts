import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/route-helpers";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(_req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const supa = createServiceClient();
  const { data } = await supa.from("agency_settings").select("*").eq("user_id", auth.userId).maybeSingle();
  return NextResponse.json({ settings: data ?? { agency_name: "", agency_logo: "", primary_color: "#F59E0B", accent_color: "#D97706", support_email: "", footer_text: "" } });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const body = await req.json();
  const supa = createServiceClient();
  const { data, error } = await supa.from("agency_settings").upsert({
    user_id: auth.userId,
    agency_name: body.agency_name ?? "",
    agency_logo: body.agency_logo ?? "",
    primary_color: body.primary_color ?? "#F59E0B",
    accent_color: body.accent_color ?? "#D97706",
    custom_domain: body.custom_domain ?? "",
    support_email: body.support_email ?? "",
    footer_text: body.footer_text ?? "",
    updated_at: new Date().toISOString(),
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settings: data });
}
