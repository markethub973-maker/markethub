import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/route-helpers";

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const user = { id: auth.userId };
  const supabase = await createClient();

  const { data } = await supabase
    .from("profiles")
    .select("premium_actions_used, premium_actions_reset_at, plan")
    .eq("id", auth.userId)
    .single();

  return NextResponse.json({
    premium_actions_used: data?.premium_actions_used ?? 0,
    premium_actions_reset_at: data?.premium_actions_reset_at ?? null,
    plan: data?.plan ?? "free_test",
  });
}
