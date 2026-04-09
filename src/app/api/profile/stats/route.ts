import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("profiles")
    .select("premium_actions_used, premium_actions_reset_at, plan")
    .eq("id", user.id)
    .single();

  return NextResponse.json({
    premium_actions_used: data?.premium_actions_used ?? 0,
    premium_actions_reset_at: data?.premium_actions_reset_at ?? null,
    plan: data?.plan ?? "free_test",
  });
}
