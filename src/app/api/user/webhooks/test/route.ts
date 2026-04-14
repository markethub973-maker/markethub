/**
 * POST /api/user/webhooks/test?id=... — fire a synthetic test event
 * to one of the user's webhooks.
 *
 * Lets the user verify their endpoint:
 *  - Receives the POST
 *  - Verifies the HMAC signature
 *  - Returns 2xx
 *
 * Sends a "webhook.test" event with a recognizable payload + a
 * timestamp so receivers know it's a test, not a real event.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createHmac } from "node:crypto";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

export async function POST(req: NextRequest) {
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const service = createServiceClient();
  const { data: wh } = await service
    .from("user_webhooks")
    .select("id,url,secret,user_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!wh) return NextResponse.json({ error: "Webhook not found" }, { status: 404 });

  const payload = {
    event: "webhook.test",
    delivered_at: new Date().toISOString(),
    data: {
      message: "If you can verify this signature, your integration is wired correctly.",
      sent_by: "MarketHub Pro test endpoint",
      verification_recipe: "HMAC-SHA256(secret, raw_body) → compare to X-MarketHub-Signature",
    },
  };
  const body = JSON.stringify(payload);
  const signature = "sha256=" + createHmac("sha256", wh.secret as string).update(body).digest("hex");

  const started = Date.now();
  let httpStatus: number | null = null;
  let responseBody: string | null = null;

  try {
    const res = await fetch(wh.url as string, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "MarketHub-Webhooks/1.0",
        "X-MarketHub-Event": "webhook.test",
        "X-MarketHub-Signature": signature,
        "X-MarketHub-Webhook-Id": wh.id as string,
        "X-MarketHub-Test": "true",
      },
      body,
      signal: AbortSignal.timeout(10000),
    });
    httpStatus = res.status;
    responseBody = (await res.text().catch(() => "")).slice(0, 1000);
  } catch (e) {
    httpStatus = 0;
    responseBody = e instanceof Error ? e.message : "network error";
  }

  const duration_ms = Date.now() - started;
  const success = httpStatus !== null && httpStatus >= 200 && httpStatus < 300;

  await service.from("webhook_deliveries").insert({
    webhook_id: wh.id,
    event: "webhook.test",
    payload: payload.data,
    http_status: httpStatus,
    response_body: responseBody,
    duration_ms,
  });

  return NextResponse.json({
    ok: success,
    http_status: httpStatus,
    response_body: responseBody,
    duration_ms,
    sent: {
      url: wh.url,
      headers: {
        "X-MarketHub-Event": "webhook.test",
        "X-MarketHub-Signature": signature.slice(0, 16) + "...",
        "X-MarketHub-Webhook-Id": wh.id,
      },
      body: payload,
    },
  });
}
