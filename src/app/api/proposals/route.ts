import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/route-helpers";
import { createServiceClient } from "@/lib/supabase/service";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(_req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const supa = createServiceClient();
  const { data, error } = await supa.from("proposals").select("*").eq("user_id", auth.userId).order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ proposals: data });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const body = await req.json();
  const supa = createServiceClient();
  const { data, error } = await supa.from("proposals").insert({
    user_id: auth.userId,
    client_name: body.client_name,
    client_email: body.client_email ?? "",
    title: body.title,
    services: body.services ?? [],
    total_value: body.total_value ?? 0,
    currency: body.currency ?? "USD",
    valid_days: body.valid_days ?? 30,
    notes: body.notes ?? "",
    status: "draft",
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ proposal: data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { id, action, ...rest } = await req.json();
  const supa = createServiceClient();

  if (action === "send" && rest.client_email) {
    const { data: proposal } = await supa.from("proposals").select("*").eq("id", id).single();
    const { data: owner } = await supa.from("profiles").select("name, email").eq("id", auth.userId).single();
    if (proposal) {
      const services = (proposal.services as any[]) ?? [];
      const rows = services.map((s: any) =>
        `<tr><td style="padding:8px 12px;border-bottom:1px solid #F5D7A0">${s.name}</td><td style="padding:8px 12px;border-bottom:1px solid #F5D7A0">${s.qty ?? 1}</td><td style="padding:8px 12px;border-bottom:1px solid #F5D7A0;text-align:right">$${Number(s.price).toFixed(2)}</td></tr>`
      ).join("");
      await resend.emails.send({
        from: `${owner?.name ?? "MarketHub Pro"} <noreply@markethubpromo.com>`,
        to: rest.client_email,
        subject: `Propunere: ${proposal.title}`,
        html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px;color:#292524">
          <h2 style="color:#F59E0B">${proposal.title}</h2>
          <p>Bună ${proposal.client_name},</p>
          <p>Vă prezentăm propunerea noastră pentru serviciile solicitate:</p>
          <table style="width:100%;border-collapse:collapse;margin:24px 0">
            <thead><tr style="background:#FFF8F0"><th style="text-align:left;padding:8px 12px;color:#A8967E;font-size:12px">Serviciu</th><th style="padding:8px 12px;color:#A8967E;font-size:12px">Qty</th><th style="text-align:right;padding:8px 12px;color:#A8967E;font-size:12px">Preț</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
          <div style="text-align:right;font-size:20px;font-weight:bold;color:#F59E0B">Total: $${Number(proposal.total_value).toFixed(2)} ${proposal.currency}</div>
          <p style="margin-top:24px;color:#78614E;font-size:13px">Valabilă ${proposal.valid_days} zile. ${proposal.notes}</p>
          <p style="margin-top:32px;color:#A8967E;font-size:12px">— ${owner?.name ?? "MarketHub Pro"}</p>
        </div>`,
      }).catch(() => {});
      await supa.from("proposals").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", id).eq("user_id", auth.userId);
    }
    return NextResponse.json({ ok: true, sent: true });
  }

  const { data, error } = await supa.from("proposals").update({ ...rest, updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", auth.userId).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ proposal: data });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { id } = await req.json();
  const supa = createServiceClient();
  await supa.from("proposals").delete().eq("id", id).eq("user_id", auth.userId);
  return NextResponse.json({ ok: true });
}
