/**
 * /api/channels/whatsapp/send — single WhatsApp message send.
 *
 * POST { to, message, report_type?, format?, report_url?, client_id? }
 *
 * 1. Sends via Meta Cloud API (sendWhatsAppText)
 * 2. Logs result to reporting_deliveries (always — both success + failure)
 * 3. Returns { ok, message_id, delivery_id, error? }
 *
 * Auth: requireAuth (Supabase user session).
 * The caller is responsible for already having the recipient as an
 * approved test number (we don't auto-add, that requires Meta's UI flow).
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/route-helpers";
import { createServiceClient } from "@/lib/supabase/service";
import { sendWhatsAppText, normalizePhone } from "@/lib/channels/whatsapp";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const body = (await req.json().catch(() => null)) as {
    to?: string;
    message?: string;
    report_type?: "monthly" | "weekly" | "on_demand" | "custom" | "test";
    format?: "pdf" | "link" | "summary_text";
    report_url?: string;
    client_id?: string;
  } | null;

  if (!body?.to || !body.message?.trim()) {
    return NextResponse.json({ error: "to and message required" }, { status: 400 });
  }

  const recipient = normalizePhone(body.to);
  if (recipient.length < 8) {
    return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
  }

  const supa = createServiceClient();

  // 1. Insert queued delivery row first (so we have a delivery_id even on failure)
  const { data: delivery, error: insErr } = await supa
    .from("reporting_deliveries")
    .insert({
      user_id: auth.userId,
      client_id: body.client_id ?? null,
      report_type: body.report_type ?? "on_demand",
      format: body.format ?? "summary_text",
      channel: "whatsapp",
      recipient,
      message_preview: body.message.slice(0, 200),
      status: "queued",
      report_url: body.report_url ?? null,
    })
    .select("id")
    .single();

  if (insErr || !delivery) {
    return NextResponse.json(
      { error: `Failed to create delivery row: ${insErr?.message ?? "unknown"}` },
      { status: 500 },
    );
  }

  const deliveryId = (delivery as { id: string }).id;

  // 2. Actually send via WhatsApp Cloud API
  const result = await sendWhatsAppText(body.to, body.message);

  // 3. Update delivery row with the result
  if (result.ok) {
    await supa
      .from("reporting_deliveries")
      .update({
        status: "sent",
        external_id: result.message_id ?? null,
        sent_at: new Date().toISOString(),
      })
      .eq("id", deliveryId);

    return NextResponse.json({
      ok: true,
      delivery_id: deliveryId,
      message_id: result.message_id,
    });
  } else {
    await supa
      .from("reporting_deliveries")
      .update({
        status: "failed",
        error: result.error ?? "unknown",
      })
      .eq("id", deliveryId);

    return NextResponse.json(
      {
        ok: false,
        delivery_id: deliveryId,
        error: result.error,
        hint: result.error?.includes("recipient phone number not in allowed list")
          ? "Adaugă numărul ca test recipient pe Meta Developer → API Setup → Step 1 → Manage phone number list."
          : undefined,
      },
      { status: 502 },
    );
  }
}
