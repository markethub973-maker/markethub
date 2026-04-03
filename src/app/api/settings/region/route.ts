import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { preferred_region, local_market_enabled } = await req.json();

  const supa = createServiceClient();
  const { error } = await supa
    .from("profiles")
    .update({
      preferred_region: preferred_region ?? null,
      local_market_enabled: local_market_enabled ?? false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    // Columns might not exist yet — return friendly message
    if (error.message.includes("column") || error.message.includes("schema")) {
      return NextResponse.json({
        error: "columns_missing",
        sql: `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_region TEXT DEFAULT NULL;\nALTER TABLE profiles ADD COLUMN IF NOT EXISTS local_market_enabled BOOLEAN DEFAULT false;`,
      }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
