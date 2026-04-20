/**
 * GET  /api/email/scheduled-reports — list user's scheduled reports
 * POST /api/email/scheduled-reports — create/update a scheduled report
 * DELETE /api/email/scheduled-reports — delete a scheduled report
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const svc = createServiceClient();
  const { data } = await svc
    .from("scheduled_reports")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ reports: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.email || !body?.frequency) {
    return NextResponse.json({ error: "email and frequency required" }, { status: 400 });
  }

  const frequency = body.frequency;
  if (!["weekly", "monthly", "custom"].includes(frequency)) {
    return NextResponse.json({ error: "frequency must be weekly, monthly, or custom" }, { status: 400 });
  }

  const svc = createServiceClient();

  // Upsert — one schedule per frequency per user
  const { data: existing } = await svc
    .from("scheduled_reports")
    .select("id")
    .eq("user_id", user.id)
    .eq("frequency", frequency)
    .maybeSingle();

  if (existing) {
    await svc.from("scheduled_reports").update({
      email: body.email,
      active: true,
      custom_day: body.custom_day ?? null,
      custom_time: body.custom_time ?? "09:00",
    }).eq("id", existing.id);
  } else {
    await svc.from("scheduled_reports").insert({
      user_id: user.id,
      email: body.email,
      frequency,
      custom_day: body.custom_day ?? null,
      custom_time: body.custom_time ?? "09:00",
      active: true,
    });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json().catch(() => ({ id: null }));
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const svc = createServiceClient();
  await svc.from("scheduled_reports").delete().eq("id", id).eq("user_id", user.id);

  return NextResponse.json({ ok: true });
}
