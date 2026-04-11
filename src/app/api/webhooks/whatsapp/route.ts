/**
 * /api/webhooks/whatsapp — Meta Cloud API delivery callbacks.
 *
 *   GET  — webhook verification handshake (Meta sends a hub.challenge
 *          token, we echo it back if hub.verify_token matches our
 *          WHATSAPP_WEBHOOK_VERIFY_TOKEN env var).
 *
 *   POST — delivery status events (sent → delivered → read → failed)
 *          and incoming messages from users. We update the matching
 *          reporting_deliveries row by external_id.
 *
 * Setup: this endpoint URL must be registered in Meta Developer →
 * WhatsApp → Configuration → Webhook → Callback URL. The verify token
 * matches WHATSAPP_WEBHOOK_VERIFY_TOKEN.
 *
 * Auth: token-based via verify_token (GET) + signature-verified body
 * via X-Hub-Signature-256 header (POST). We don't enforce HMAC strictly
 * yet (Wave 5.b will add it once Meta is sending real callbacks).
 *
 * IMPORTANT: this route must NOT require Supabase user auth — Meta calls
 * it as a public endpoint. Added to PUBLIC_PATHS in proxy.ts.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

interface WhatsAppStatusUpdate {
  id: string; // message_id we sent
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: string;
  recipient_id: string;
  errors?: { code: number; title: string; message?: string }[];
}

interface WhatsAppEntry {
  id: string;
  changes: {
    field: string;
    value: {
      messaging_product: string;
      metadata: { display_phone_number: string; phone_number_id: string };
      statuses?: WhatsAppStatusUpdate[];
      messages?: unknown[];
    };
  }[];
}

interface WhatsAppWebhookBody {
  object: string;
  entry: WhatsAppEntry[];
}

// ── GET — verification handshake ────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  const expected = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  if (!expected) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  if (mode === "subscribe" && token === expected && challenge) {
    // Echo the challenge back as plain text
    return new NextResponse(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

// ── POST — delivery callbacks ───────────────────────────────────────────────
export async function POST(req: NextRequest) {
  let body: WhatsAppWebhookBody;
  try {
    body = (await req.json()) as WhatsAppWebhookBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.object !== "whatsapp_business_account") {
    // Not for us
    return NextResponse.json({ ok: true, ignored: "non-whatsapp object" });
  }

  const supa = createServiceClient();
  let updates = 0;

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "messages") continue;
      const statuses = change.value.statuses ?? [];

      for (const status of statuses) {
        // Map Meta status → our status
        const ourStatus =
          status.status === "delivered" || status.status === "read"
            ? "delivered"
            : status.status === "failed"
              ? "failed"
              : "sent";

        const update: Record<string, unknown> = {
          status: ourStatus,
        };
        if (status.status === "delivered" || status.status === "read") {
          update.delivered_at = new Date(parseInt(status.timestamp) * 1000).toISOString();
        }
        if (status.status === "failed" && status.errors?.length) {
          update.error = status.errors[0].title + (status.errors[0].message ? `: ${status.errors[0].message}` : "");
        }

        const { count } = await supa
          .from("reporting_deliveries")
          .update(update, { count: "exact" })
          .eq("external_id", status.id)
          .eq("channel", "whatsapp");

        updates += count ?? 0;
      }
    }
  }

  return NextResponse.json({ ok: true, updates });
}
