/**
 * GET /api/user/webhooks/deliveries?webhook_id=... — recent deliveries
 * for one of the user's webhooks (sees own only via RLS).
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const webhookId = req.nextUrl.searchParams.get("webhook_id");
  const limit = Math.min(Math.max(parseInt(req.nextUrl.searchParams.get("limit") ?? "50"), 1), 200);

  let q = supa
    .from("webhook_deliveries")
    .select("id,webhook_id,event,http_status,response_body,duration_ms,delivered_at")
    .order("delivered_at", { ascending: false })
    .limit(limit);
  if (webhookId) q = q.eq("webhook_id", webhookId);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, deliveries: data ?? [] });
}
