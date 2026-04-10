import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/route-helpers";
import { createServiceClient } from "@/lib/supabase/service";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(_req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const supa = createServiceClient();
  const { data, error } = await supa.from("email_campaigns").select("*").eq("user_id", auth.userId).order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ campaigns: data });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const body = await req.json();
  const supa = createServiceClient();
  const { data, error } = await supa.from("email_campaigns").insert({
    user_id: auth.userId,
    name: body.name,
    subject: body.subject,
    body_html: body.body_html,
    recipients: body.recipients ?? [],
    notes: body.notes ?? "",
    status: "draft",
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ campaign: data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { id, action, ...rest } = await req.json();
  const supa = createServiceClient();

  // Send action
  if (action === "send") {
    const { data: camp } = await supa.from("email_campaigns").select("*").eq("id", id).eq("user_id", auth.userId).single();
    if (!camp) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    if (!camp.recipients?.length) return NextResponse.json({ error: "No recipients" }, { status: 400 });

    await supa.from("email_campaigns").update({ status: "sending" }).eq("id", id);

    let sent = 0;
    const errors: string[] = [];

    // Send in batches of 10
    const batches = [];
    for (let i = 0; i < camp.recipients.length; i += 10) batches.push(camp.recipients.slice(i, i + 10));

    for (const batch of batches) {
      const results = await Promise.allSettled(batch.map((to: string) =>
        resend.emails.send({
          from: "MarketHub Pro <noreply@markethubpromo.com>",
          to,
          subject: camp.subject,
          html: camp.body_html,
        })
      ));
      results.forEach(r => { if (r.status === "fulfilled") sent++; else errors.push(String(r.reason)); });
    }

    await supa.from("email_campaigns").update({ status: "sent", sent_count: sent, sent_at: new Date().toISOString() }).eq("id", id);
    return NextResponse.json({ ok: true, sent, errors: errors.slice(0, 5) });
  }

  const { data, error } = await supa.from("email_campaigns").update({ ...rest, updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", auth.userId).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ campaign: data });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { id } = await req.json();
  const supa = createServiceClient();
  await supa.from("email_campaigns").delete().eq("id", id).eq("user_id", auth.userId);
  return NextResponse.json({ ok: true });
}
