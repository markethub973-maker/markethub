/**
 * Outbound webhooks — dispatch events to customer-configured URLs.
 *
 * Used internally by event publishers (post.published cron, lead create
 * route, etc.) via dispatchWebhookEvent(userId, event, payload).
 *
 * Each delivery:
 *  - HMAC-SHA256 signs body with the per-webhook secret
 *  - X-MarketHub-Event header for routing on receiver side
 *  - X-MarketHub-Signature: sha256=<hex>
 *  - Records full delivery in webhook_deliveries
 *  - On 4xx/5xx/timeout: bumps consecutive_failures
 *  - Auto-disables webhook after 10 consecutive failures
 *
 * Fire-and-forget (no caller awaits result) — webhooks shouldn't block
 * primary actions. Errors logged in webhook_deliveries for the user
 * to diagnose via /api/user/webhooks/deliveries.
 */

import { createHmac, randomBytes } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/service";

export const SUPPORTED_EVENTS = [
  "post.published",
  "post.failed",
  "post.scheduled",
  "lead.created",
  "lead.status_changed",
  "automation.completed",
  "automation.failed",
  "image.generated",
  "video.generated",
] as const;

export type WebhookEvent = (typeof SUPPORTED_EVENTS)[number];

export function generateWebhookSecret(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Dispatch an event to all enabled webhooks for the user that subscribe
 * to it. Sequential per webhook (so deliveries don't race for the same
 * URL), parallel across webhooks.
 *
 * Fire-and-forget: caller should `void dispatchWebhookEvent(...)`.
 */
export async function dispatchWebhookEvent(
  userId: string,
  event: WebhookEvent,
  payload: Record<string, unknown>,
): Promise<void> {
  if (!userId) return;
  const service = createServiceClient();

  // Find enabled webhooks subscribed to this event
  const { data: webhooks } = await service
    .from("user_webhooks")
    .select("id,url,secret,events,consecutive_failures")
    .eq("user_id", userId)
    .eq("enabled", true)
    .contains("events", [event]);

  if (!webhooks || webhooks.length === 0) return;

  // Dispatch each in parallel; capture all results
  await Promise.all(
    webhooks.map((wh) => deliverOne(service, wh as Webhook, event, payload)),
  );
}

interface Webhook {
  id: string;
  url: string;
  secret: string;
  consecutive_failures: number | null;
}

async function deliverOne(
  service: ReturnType<typeof createServiceClient>,
  wh: Webhook,
  event: WebhookEvent,
  payload: Record<string, unknown>,
): Promise<void> {
  const body = JSON.stringify({
    event,
    delivered_at: new Date().toISOString(),
    data: payload,
  });
  const signature = "sha256=" + createHmac("sha256", wh.secret).update(body).digest("hex");

  const started = Date.now();
  let httpStatus: number | null = null;
  let responseBody: string | null = null;

  try {
    const res = await fetch(wh.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "MarketHub-Webhooks/1.0",
        "X-MarketHub-Event": event,
        "X-MarketHub-Signature": signature,
        "X-MarketHub-Webhook-Id": wh.id,
      },
      body,
      signal: AbortSignal.timeout(8000),
    });
    httpStatus = res.status;
    responseBody = (await res.text().catch(() => "")).slice(0, 1000);
  } catch (e) {
    httpStatus = 0;
    responseBody = e instanceof Error ? e.message : "network error";
  }

  const duration_ms = Date.now() - started;
  const success = httpStatus !== null && httpStatus >= 200 && httpStatus < 300;

  // Log delivery
  await service.from("webhook_deliveries").insert({
    webhook_id: wh.id,
    event,
    payload,
    http_status: httpStatus,
    response_body: responseBody,
    duration_ms,
  });

  // Update webhook state
  const newFailures = success ? 0 : (wh.consecutive_failures ?? 0) + 1;
  const updates: Record<string, unknown> = {
    last_delivery_at: new Date().toISOString(),
    last_delivery_status: httpStatus,
    consecutive_failures: newFailures,
  };
  if (newFailures >= 10) {
    updates.enabled = false; // auto-pause after 10 in a row
  }
  await service.from("user_webhooks").update(updates).eq("id", wh.id);
}
