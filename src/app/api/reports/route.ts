/**
 * /api/reports — list reporting_deliveries history.
 *
 * GET — returns the user's recent report deliveries with status, channel,
 *       recipient, and external_id. Used by the /dashboard/reports page
 *       to render the history table.
 *
 * Auth: requireAuth.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/route-helpers";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const limitRaw = parseInt(req.nextUrl.searchParams.get("limit") ?? "50", 10);
  const limit = Math.max(1, Math.min(200, isNaN(limitRaw) ? 50 : limitRaw));

  const supa = createServiceClient();
  const { data, error } = await supa
    .from("reporting_deliveries")
    .select(
      "id, client_id, report_type, format, channel, recipient, message_preview, status, external_id, report_url, sent_at, delivered_at, error, created_at",
    )
    .eq("user_id", auth.userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Aggregate counts for the summary bar
  const counts = {
    by_status: { queued: 0, sent: 0, delivered: 0, failed: 0 } as Record<string, number>,
    by_channel: { whatsapp: 0, telegram: 0, email: 0 } as Record<string, number>,
    total: data?.length ?? 0,
  };
  for (const row of data ?? []) {
    const r = row as { status: string; channel: string };
    if (r.status in counts.by_status) counts.by_status[r.status]++;
    if (r.channel in counts.by_channel) counts.by_channel[r.channel]++;
  }

  return NextResponse.json({
    deliveries: data ?? [],
    counts,
  });
}
