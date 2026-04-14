/**
 * GET /api/v1/me — returns the authenticated user's profile summary.
 *
 * Auth: Authorization: Bearer mkt_live_<secret>
 *
 * Example:
 *   curl -H "Authorization: Bearer mkt_live_xxx" \
 *     https://markethubpromo.com/api/v1/me
 *
 * Used by customers to verify their token is working end-to-end before
 * building anything on top. Common "hello world" for SaaS APIs.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/apiTokens";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await verifyToken(
    req.headers.get("authorization"),
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
  );
  if (!auth) {
    return NextResponse.json(
      {
        error: "Invalid or missing API token",
        docs: "https://markethubpromo.com/api/docs",
      },
      { status: 401 },
    );
  }

  const service = createServiceClient();
  const { data: profile } = await service
    .from("profiles")
    .select("id,email,name,plan,subscription_plan,created_at")
    .eq("id", auth.user_id)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    user: {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      plan: profile.plan ?? profile.subscription_plan,
      created_at: profile.created_at,
    },
    auth: {
      token_id: auth.token_id,
      scopes: auth.scopes,
    },
  });
}
