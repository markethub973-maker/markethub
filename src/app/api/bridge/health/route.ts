import { NextRequest, NextResponse } from "next/server";
import { bridgeAuth } from "@/lib/bridgeAuth";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * GET /api/bridge/health — Bridge connectivity test
 * Zurio calls this to verify the bridge is working.
 */
export async function GET(req: NextRequest) {
  const auth = bridgeAuth(req);
  if (!auth.ok) return auth.response;

  // Quick DB ping
  const supa = createServiceClient();
  const { count } = await supa.from("profiles").select("id", { count: "exact", head: true });

  return NextResponse.json({
    status: "ok",
    service: "markethub-bridge",
    db_connected: true,
    users_count: count ?? 0,
    timestamp: Date.now(),
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) || "dev",
  });
}
