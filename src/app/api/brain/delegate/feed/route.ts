/**
 * GET /api/brain/delegate/feed — returns the active session + last approvals.
 * Used by the boardroom page to show proxy activity in real time.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (req.cookies.get("brain_admin")?.value !== "1") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const svc = createServiceClient();
  const { data } = await svc
    .from("delegate_sessions")
    .select("id, ends_at, approvals")
    .eq("active", true)
    .gt("ends_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return NextResponse.json({
    ok: true,
    session: data,
    approvals: (data?.approvals as unknown[]) ?? [],
  });
}
