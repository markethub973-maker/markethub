import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/route-helpers";
import { getAppAnthropicClient } from "@/lib/anthropic-client";

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { brand, ig_data, ads_count } = await req.json();
  if (!brand) return NextResponse.json({ error: "brand required" }, { status: 400 });

  const anthropic = getAppAnthropicClient();

  const prompt = `You are a monetization strategy analyst. Analyze the following data about brand "${brand}" and identify their monetization strategies.

Instagram data: ${ig_data ? JSON.stringify(ig_data) : "Not available"}
Active Meta ads count: ${ads_count ?? "Unknown"}
Brand name: ${brand}

Based on this data, provide a JSON response with this exact structure:
{
  "primary_monetization": "string (e.g. E-commerce, Affiliate Marketing, SaaS, Services, etc.)",
  "revenue_streams": ["stream1", "stream2", "stream3"],
  "ad_strategy": "string describing their ad approach",
  "price_range": "string (e.g. $10-$50, $100+, Free with upsell, etc.)",
  "funnel_type": "string (e.g. Direct sale, Lead gen, Free trial, Content → Product)",
  "affiliate_indicators": ["indicator1", "indicator2"],
  "content_pillars": ["pillar1", "pillar2", "pillar3"],
  "opportunities": ["opportunity1", "opportunity2", "opportunity3"],
  "threat_level": "low|medium|high",
  "threat_reason": "string"
}

Respond ONLY with the JSON object, no other text.`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 800,
      messages: [{ role: "user", content: prompt }],
    });

    const text = (message.content[0] as any)?.text ?? "{}";
    const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
    const analysis = JSON.parse(cleaned);

    return NextResponse.json({ analysis, brand });
  } catch (err) {
    return NextResponse.json({ error: "Analysis failed", details: String(err) }, { status: 500 });
  }
}
