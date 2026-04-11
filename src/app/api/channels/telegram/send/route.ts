/**
 * /api/channels/telegram/send — single Telegram message send.
 *
 * POST { chat_id, message, parse_mode?, report_type?, format?, report_url?, client_id? }
 *
 * 1. Sends via Telegram Bot API (sendTelegramMessage)
 * 2. Logs result to reporting_deliveries
 * 3. Returns { ok, message_id, delivery_id, error? }
 *
 * Auth: requireAuth.
 *
 * Note: chat_id must be a number that the user has obtained from
 * @userinfobot or by interacting with the bot first. We can't auto-discover
 * a user's chat_id — Telegram requires the user to message the bot at
 * least once before the bot can message them.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/route-helpers";
import { createServiceClient } from "@/lib/supabase/service";
import { sendTelegramMessage } from "@/lib/channels/telegram";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const body = (await req.json().catch(() => null)) as {
    chat_id?: string | number;
    message?: string;
    parse_mode?: "MarkdownV2" | "HTML";
    report_type?: "monthly" | "weekly" | "on_demand" | "custom" | "test";
    format?: "pdf" | "link" | "summary_text";
    report_url?: string;
    client_id?: string;
  } | null;

  if (!body?.chat_id || !body.message?.trim()) {
    return NextResponse.json({ error: "chat_id and message required" }, { status: 400 });
  }

  const supa = createServiceClient();

  const { data: delivery, error: insErr } = await supa
    .from("reporting_deliveries")
    .insert({
      user_id: auth.userId,
      client_id: body.client_id ?? null,
      report_type: body.report_type ?? "on_demand",
      format: body.format ?? "summary_text",
      channel: "telegram",
      recipient: String(body.chat_id),
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

  const result = await sendTelegramMessage(body.chat_id, body.message, {
    parseMode: body.parse_mode,
    disablePreview: false,
  });

  if (result.ok) {
    await supa
      .from("reporting_deliveries")
      .update({
        status: "sent",
        external_id: String(result.message_id ?? ""),
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
        hint: result.error?.includes("chat not found")
          ? "Trebuie ca destinatarul să trimită cel puțin un mesaj bot-ului @markethub_reports_bot înainte ca bot-ul să-i poată trimite mesaje."
          : undefined,
      },
      { status: 502 },
    );
  }
}
