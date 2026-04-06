import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import crypto from "crypto";

/**
 * Apify webhook receiver — verifies HMAC-SHA256 signature before processing.
 *
 * In Apify dashboard: set webhook URL to /api/apify/webhook
 * and set the "Secret" field to the value of APIFY_WEBHOOK_SECRET env var.
 *
 * Apify sends the signature in the `X-Apify-Webhook-Signature` header
 * as HMAC-SHA256(rawBody, secret) in hex.
 */

const APIFY_WEBHOOK_SECRET = process.env.APIFY_WEBHOOK_SECRET ?? "";

function verifySignature(rawBody: string, signature: string | null): boolean {
  if (!APIFY_WEBHOOK_SECRET || !signature) return false;
  const expected = crypto
    .createHmac("sha256", APIFY_WEBHOOK_SECRET)
    .update(rawBody, "utf8")
    .digest("hex");
  // Constant-time comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expected, "hex")
    );
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-apify-webhook-signature");

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { eventType, actorRunId, actorId, userId, createdAt, status } = payload as any;

  // Log webhook event to Supabase for audit trail
  const supabase = createServiceClient();
  try { await supabase.from("apify_webhook_logs").insert({
    event_type: eventType ?? "unknown",
    actor_run_id: actorRunId ?? null,
    actor_id: actorId ?? null,
    apify_user_id: userId ?? null,
    run_status: status ?? null,
    received_at: new Date().toISOString(),
    created_at: createdAt ?? null,
  }); } catch {}

  // Handle run completion — update any pending lead-finder / marketing jobs
  if (eventType === "ACTOR.RUN.SUCCEEDED" && actorRunId) {
    try {
      await supabase
        .from("apify_jobs")
        .update({ status: "done", finished_at: new Date().toISOString() })
        .eq("run_id", actorRunId);
    } catch {}
  }

  if (eventType === "ACTOR.RUN.FAILED" && actorRunId) {
    try {
      await supabase
        .from("apify_jobs")
        .update({ status: "failed", finished_at: new Date().toISOString() })
        .eq("run_id", actorRunId);
    } catch {}
  }

  return NextResponse.json({ ok: true });
}
