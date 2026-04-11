/**
 * WhatsApp Cloud API client (Meta Cloud API).
 *
 * Reads credentials from env: WHATSAPP_PHONE_NUMBER_ID + WHATSAPP_ACCESS_TOKEN.
 * The phone number ID is the SENDER (our test/business number).
 *
 * Wraps the two endpoints we use most:
 *   - sendText: free-form text reply (only allowed to users we've messaged
 *     in the last 24h, otherwise must use a template)
 *   - sendTemplate: send a pre-approved template (works at any time)
 *
 * Free-form messages are perfect for our reports use case because the
 * recipient is a CLIENT who explicitly opted in via the agency, AND we
 * use the test phone number which has a relaxed 24h window for approved
 * test recipients.
 */

const GRAPH_VERSION = "v22.0";

interface SendResponse {
  ok: boolean;
  message_id?: string;
  error?: string;
  raw?: unknown;
}

function getCreds(): { phoneNumberId: string; token: string } | null {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!phoneNumberId || !token) return null;
  return { phoneNumberId, token };
}

/**
 * Normalize a phone number to E.164 (digits only, no +, no spaces).
 * Meta accepts both `+40735658742` and `40735658742` but normalizes for safety.
 */
export function normalizePhone(raw: string): string {
  return raw.replace(/[^0-9]/g, "");
}

/**
 * Send a free-form text message. Recipient must be in the 24h conversation
 * window OR (for test phones) must be on the approved test recipients list.
 */
export async function sendWhatsAppText(
  to: string,
  message: string,
): Promise<SendResponse> {
  const creds = getCreds();
  if (!creds) return { ok: false, error: "WhatsApp credentials not configured" };

  const recipient = normalizePhone(to);
  if (recipient.length < 8) return { ok: false, error: "Invalid phone number" };

  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${creds.phoneNumberId}/messages`;
  const body = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: recipient,
    type: "text",
    text: {
      preview_url: true, // unfurl URLs in the message
      body: message.slice(0, 4096), // WhatsApp text limit
    },
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${creds.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });

    const json = (await res.json()) as {
      messages?: { id: string }[];
      error?: { message: string; code: number; error_subcode?: number };
    };

    if (!res.ok || json.error) {
      return {
        ok: false,
        error: json.error?.message ?? `HTTP ${res.status}`,
        raw: json,
      };
    }

    return {
      ok: true,
      message_id: json.messages?.[0]?.id,
      raw: json,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

/**
 * Send a pre-approved template message (required when outside the 24h
 * conversation window). Templates must be pre-registered in Meta's
 * Business Manager and approved by Meta before they can be used.
 *
 * For Wave 5 we ship a "report_delivery" template (to be created in
 * Meta Business Manager) with placeholders for { client_name, report_url }.
 * Until that's set up, sendTemplate is exposed but unused.
 */
export async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  templateLanguage: string,
  bodyParameters: string[],
): Promise<SendResponse> {
  const creds = getCreds();
  if (!creds) return { ok: false, error: "WhatsApp credentials not configured" };

  const recipient = normalizePhone(to);
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${creds.phoneNumberId}/messages`;

  const body = {
    messaging_product: "whatsapp",
    to: recipient,
    type: "template",
    template: {
      name: templateName,
      language: { code: templateLanguage },
      components: [
        {
          type: "body",
          parameters: bodyParameters.map((text) => ({ type: "text", text })),
        },
      ],
    },
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${creds.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });

    const json = (await res.json()) as {
      messages?: { id: string }[];
      error?: { message: string };
    };

    if (!res.ok || json.error) {
      return { ok: false, error: json.error?.message ?? `HTTP ${res.status}`, raw: json };
    }

    return { ok: true, message_id: json.messages?.[0]?.id, raw: json };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Verify the access token is still valid by hitting /me. Used by the
 * settings page health check + by maintenance agents.
 */
export async function verifyWhatsAppToken(): Promise<{
  ok: boolean;
  app_name?: string;
  error?: string;
}> {
  const creds = getCreds();
  if (!creds) return { ok: false, error: "WhatsApp credentials not configured" };

  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/me?access_token=${encodeURIComponent(creds.token)}`,
      { signal: AbortSignal.timeout(10_000) },
    );
    const json = (await res.json()) as { name?: string; error?: { message: string } };
    if (json.error) return { ok: false, error: json.error.message };
    return { ok: true, app_name: json.name };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
