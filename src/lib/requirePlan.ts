import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { canAccessRoute } from "@/lib/plan-features";

/**
 * Verifies the request has a valid Supabase session AND the user's plan
 * can access the given route. Returns { userId, userPlan } on success,
 * or a ready-to-return 401/403 NextResponse on failure.
 */
export async function requirePlan(
  req: NextRequest,
  route: string
): Promise<{ userId: string; userPlan: string } | NextResponse> {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll(); },
        setAll() {},
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  const userPlan = (profile as any)?.plan ?? "free_test";

  if (!canAccessRoute(userPlan, route)) {
    return NextResponse.json(
      { error: "Upgrade required", requiredPlan: route },
      { status: 403 }
    );
  }

  return { userId: user.id, userPlan };
}
