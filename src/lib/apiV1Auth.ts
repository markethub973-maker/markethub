/**
 * Shared auth + plan gate for /api/v1/ai/* endpoints.
 *
 * Every public AI route repeats the same two checks:
 *   1. Bearer API token valid (verifyToken)
 *   2. User's plan allows AI (admins bypass)
 *
 * This helper centralizes both so the per-route file stays short and
 * consistent. Returns a result you can spread into the route, or a
 * NextResponse error to return directly.
 */

import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/apiTokens";
import { createServiceClient } from "@/lib/supabase/service";

export interface V1AuthOk {
  ok: true;
  userId: string;
  plan: string;
  isAdmin: boolean;
}

/**
 * Usage:
 *   const auth = await authorizeV1(req);
 *   if (!auth.ok) return auth.response;
 *   // use auth.userId, auth.plan
 */
export async function authorizeV1(
  req: Request,
): Promise<V1AuthOk | { ok: false; response: NextResponse }> {
  const tok = await verifyToken(
    req.headers.get("authorization"),
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
  );
  if (!tok) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Invalid or missing API token" },
        { status: 401 },
      ),
    };
  }

  const service = createServiceClient();
  const { data: profile } = await service
    .from("profiles")
    .select("plan,subscription_plan,is_admin")
    .eq("id", tok.user_id)
    .maybeSingle();
  const plan = (profile?.plan as string | null)
    ?? (profile?.subscription_plan as string | null)
    ?? "starter";
  const isAdmin = Boolean(profile?.is_admin);

  if (!isAdmin && !["pro", "studio", "agency", "business", "agency"].includes(plan)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "This endpoint requires Pro plan or higher", upgrade_required: true },
        { status: 403 },
      ),
    };
  }

  return { ok: true, userId: tok.user_id, plan, isAdmin };
}
