import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/route-helpers";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const supa = createServiceClient();
  const { error } = await supa
    .from("profiles")
    .update({ linkedin_access_token: null })
    .eq("id", auth.userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
