import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/adminAuth";
import { createServiceClient } from "@/lib/supabase/service";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  if (!isAdminAuthorized(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { client_id, type } = await req.json();
  // type: "overdue_reminder" | "invoice"

  const supa = createServiceClient();
  const { data: client, error } = await supa
    .from("agency_clients")
    .select("*")
    .eq("id", client_id)
    .single();

  if (error || !client) return NextResponse.json({ error: "Client not found" }, { status: 404 });
  if (!client.email) return NextResponse.json({ error: "Client has no email" }, { status: 400 });

  const { data: adminProfile } = await supa
    .from("profiles")
    .select("email, name")
    .eq("is_admin", true)
    .limit(1)
    .single();

  const agencyName = adminProfile?.name ?? "MarketHub Pro";
  const agencyEmail = process.env.ADMIN_EMAIL ?? "markethub973@gmail.com";

  if (type === "overdue_reminder") {
    const { data, error: sendErr } = await resend.emails.send({
      from: `${agencyName} <noreply@markethubpromo.com>`,
      to: client.email,
      subject: `Payment Reminder — ${client.service || "Social Media Services"}`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px;color:#292524">
          <h2 style="color:#F59E0B;margin:0 0 16px">Payment Reminder</h2>
          <p>Hi ${client.name},</p>
          <p>This is a friendly reminder that your monthly invoice for <strong>${client.service || "social media management services"}</strong> is pending.</p>
          <div style="background:#FFF8F0;border-left:4px solid #F59E0B;padding:16px;margin:24px 0;border-radius:4px">
            <p style="margin:0;font-size:14px"><strong>Amount due:</strong> $${Number(client.monthly_value).toFixed(2)}/month</p>
            <p style="margin:8px 0 0;font-size:14px"><strong>Status:</strong> <span style="color:#EF4444">Overdue</span></p>
          </div>
          <p>Please arrange payment at your earliest convenience. If you have any questions, reply to this email.</p>
          <p style="margin-top:32px;color:#A8967E;font-size:12px">— ${agencyName}</p>
        </div>
      `,
    });

    if (sendErr) return NextResponse.json({ error: sendErr.message }, { status: 500 });

    // Mark as notified — update payment_status
    await supa.from("agency_clients").update({ payment_status: "overdue" }).eq("id", client_id);

    return NextResponse.json({ ok: true, emailId: data?.id });
  }

  return NextResponse.json({ error: "Unknown notification type" }, { status: 400 });
}
