/**
 * POST /api/brain/mark-replied — manual reply flagging from the pipeline UI.
 *
 * Body: { id: number, replied?: boolean }
 * Used until the inbound Resend webhook is configured. Sets replied_at
 * so the follow-up cron stops chasing and the pipeline shows REPLIED.
 *
 * Auth: brain_admin cookie only.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (req.cookies.get("brain_admin")?.value !== "1") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as { id?: number; replied?: boolean };
  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const svc = createServiceClient();
  const replied_at = body.replied === false ? null : new Date().toISOString();
  const { error } = await svc
    .from("outreach_log")
    .update({ replied_at })
    .eq("id", body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
