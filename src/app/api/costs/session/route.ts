import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sessionId = req.nextUrl.searchParams.get("session_id");
  if (!sessionId) return NextResponse.json({ error: "session_id required" }, { status: 400 });

  const supa = createServiceClient();

  // Get cost logs for this session (scoped to user)
  const { data: lines, error } = await supa
    .from("api_cost_logs" as any)
    .select("operation, service, model, cost_usd, input_tokens, output_tokens, created_at")
    .eq("user_id", user.id)
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ lines: [], total_usd: 0, markup_percent: 20, total_with_markup_usd: 0, anthropic_usd: 0, apify_usd: 0 });

  // Get markup from platform_settings
  const { data: markupRow } = await supa
    .from("platform_settings" as any)
    .select("value")
    .eq("key", "api_markup_percent")
    .single();

  const markupPercent = parseFloat((markupRow as any)?.value ?? "20");
  const rows = (lines ?? []) as any[];

  const totalUsd = rows.reduce((s: number, r: any) => s + (parseFloat(r.cost_usd) || 0), 0);
  const anthropicUsd = rows.filter((r: any) => r.service === "anthropic").reduce((s: number, r: any) => s + (parseFloat(r.cost_usd) || 0), 0);
  const apifyUsd = rows.filter((r: any) => r.service === "apify").reduce((s: number, r: any) => s + (parseFloat(r.cost_usd) || 0), 0);
  const totalWithMarkup = totalUsd * (1 + markupPercent / 100);

  return NextResponse.json({
    lines: rows,
    total_usd: totalUsd,
    anthropic_usd: anthropicUsd,
    apify_usd: apifyUsd,
    markup_percent: markupPercent,
    total_with_markup_usd: totalWithMarkup,
  });
}
