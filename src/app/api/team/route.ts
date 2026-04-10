import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/route-helpers";
import { createServiceClient } from "@/lib/supabase/service";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(_req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const supa = createServiceClient();
  const { data, error } = await supa
    .from("team_members").select("*").eq("owner_id", auth.userId).order("invited_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ members: data });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { email, role } = await req.json();
  if (!email?.trim()) return NextResponse.json({ error: "email required" }, { status: 400 });

  const supa = createServiceClient();
  const { data: existing } = await supa.from("profiles").select("id").eq("email", email.trim()).maybeSingle();

  const { data, error } = await supa.from("team_members").insert({
    owner_id: auth.userId,
    member_email: email.trim(),
    member_id: existing?.id ?? null,
    role: role ?? "editor",
    status: "invited",
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Send invite email
  const { data: owner } = await supa.from("profiles").select("name, email").eq("id", auth.userId).single();
  await resend.emails.send({
    from: "MarketHub Pro <noreply@markethubpromo.com>",
    to: email.trim(),
    subject: `${owner?.name ?? "Someone"} te-a invitat în MarketHub Pro`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px;color:#292524">
        <h2 style="color:#F59E0B">Invitație MarketHub Pro</h2>
        <p><strong>${owner?.name ?? owner?.email}</strong> te-a invitat să colaborezi pe platforma MarketHub Pro ca <strong>${role ?? "Editor"}</strong>.</p>
        <a href="https://markethubpromo.com/register" style="display:inline-block;margin-top:24px;background:#F59E0B;color:#1C1814;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">
          Acceptă invitația
        </a>
        <p style="margin-top:32px;color:#A8967E;font-size:12px">— MarketHub Pro</p>
      </div>
    `,
  }).catch(() => {});

  return NextResponse.json({ member: data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { id, role, status } = await req.json();
  const supa = createServiceClient();
  const updates: any = {};
  if (role) updates.role = role;
  if (status) updates.status = status;
  const { data, error } = await supa.from("team_members").update(updates).eq("id", id).eq("owner_id", auth.userId).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ member: data });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { id } = await req.json();
  const supa = createServiceClient();
  await supa.from("team_members").delete().eq("id", id).eq("owner_id", auth.userId);
  return NextResponse.json({ ok: true });
}
