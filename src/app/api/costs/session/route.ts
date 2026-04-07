import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

// Currency conversion to USD (approximate)
const TO_USD: Record<string, number> = { USD: 1, EUR: 1.08, RON: 0.22 };

const MARKUP_DEFAULTS = {
  markup_percent:    20,
  value_fee_percent: 10,
  value_fee_min_usd: 5,
  value_fee_max_usd: 500,
  value_fee_enabled: true,
};

function calcValueFee(params: {
  campaignValue: number;
  currency: string;
  feePercent: number;
  minUsd: number;
  maxUsd: number;
  enabled: boolean;
}): { fee_usd: number; fee_percent: number; value_usd: number; capped: boolean } {
  if (!params.enabled || params.campaignValue <= 0) {
    return { fee_usd: 0, fee_percent: params.feePercent, value_usd: 0, capped: false };
  }
  const rate = TO_USD[params.currency] ?? 1;
  const valueUsd = params.campaignValue * rate;
  const rawFee = valueUsd * (params.feePercent / 100);
  const clampedFee = Math.max(params.minUsd, Math.min(params.maxUsd, rawFee));
  return {
    fee_usd:    clampedFee,
    fee_percent: params.feePercent,
    value_usd:  valueUsd,
    capped:     rawFee !== clampedFee,
  };
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const sessionId     = searchParams.get("session_id");
  const campaignValue = parseFloat(searchParams.get("campaign_value") || "0") || 0;
  const currency      = searchParams.get("currency") || "EUR";

  if (!sessionId) return NextResponse.json({ error: "session_id required" }, { status: 400 });

  const supa = createServiceClient();

  // Get API cost logs for this session (graceful — table may not exist yet)
  const { data: lines } = await supa
    .from("api_cost_logs" as any)
    .select("operation, service, model, cost_usd, input_tokens, output_tokens, created_at")
    .eq("user_id", user.id)
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  // Load markup settings from admin_platform_config
  const { data: configRow } = await supa
    .from("admin_platform_config" as any)
    .select("extra_data")
    .eq("platform", "markup_settings")
    .maybeSingle();

  const cfg = (configRow?.extra_data as Record<string, any>) ?? {};
  const markupPercent   = typeof cfg.markup_percent    === "number" ? cfg.markup_percent    : MARKUP_DEFAULTS.markup_percent;
  const valueFeePercent = typeof cfg.value_fee_percent === "number" ? cfg.value_fee_percent : MARKUP_DEFAULTS.value_fee_percent;
  const valueFeeMinUsd  = typeof cfg.value_fee_min_usd === "number" ? cfg.value_fee_min_usd : MARKUP_DEFAULTS.value_fee_min_usd;
  const valueFeeMaxUsd  = typeof cfg.value_fee_max_usd === "number" ? cfg.value_fee_max_usd : MARKUP_DEFAULTS.value_fee_max_usd;
  const valueFeeEnabled = typeof cfg.value_fee_enabled === "boolean" ? cfg.value_fee_enabled : MARKUP_DEFAULTS.value_fee_enabled;

  const rows = (lines ?? []) as any[];
  const apiCostUsd   = rows.reduce((s: number, r: any) => s + (parseFloat(r.cost_usd) || 0), 0);
  const apiMarkupUsd = apiCostUsd * (markupPercent / 100);
  const anthropicUsd = rows.filter((r: any) => r.service === "anthropic").reduce((s: number, r: any) => s + (parseFloat(r.cost_usd) || 0), 0);
  const apifyUsd     = rows.filter((r: any) => r.service === "apify").reduce((s: number, r: any) => s + (parseFloat(r.cost_usd) || 0), 0);

  const valueFee = calcValueFee({
    campaignValue, currency,
    feePercent: valueFeePercent,
    minUsd:     valueFeeMinUsd,
    maxUsd:     valueFeeMaxUsd,
    enabled:    valueFeeEnabled,
  });

  const totalUsd = apiCostUsd + apiMarkupUsd + valueFee.fee_usd;

  return NextResponse.json({
    lines: rows,
    api_cost_usd:        apiCostUsd,
    api_markup_usd:      apiMarkupUsd,
    markup_percent:      markupPercent,
    anthropic_usd:       anthropicUsd,
    apify_usd:           apifyUsd,
    campaign_value_usd:  valueFee.value_usd,
    campaign_value_orig: campaignValue,
    campaign_currency:   currency,
    value_fee_usd:       valueFee.fee_usd,
    value_fee_percent:   valueFee.fee_percent,
    value_fee_min_usd:   valueFeeMinUsd,
    value_fee_max_usd:   valueFeeMaxUsd,
    value_fee_enabled:   valueFeeEnabled,
    value_fee_capped:    valueFee.capped,
    total_usd:           totalUsd,
    settings: {
      markup_percent:    markupPercent,
      value_fee_percent: valueFeePercent,
      value_fee_min_usd: valueFeeMinUsd,
      value_fee_max_usd: valueFeeMaxUsd,
      value_fee_enabled: valueFeeEnabled,
    },
  });
}
