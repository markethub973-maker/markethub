import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "ANTHROPIC_API_KEY not set" }, { status: 500 });

  try {
    // Anthropic billing/usage API
    const [usageRes, limitsRes] = await Promise.allSettled([
      fetch("https://api.anthropic.com/v1/usage", {
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
      }).then(r => r.json()),
      fetch("https://api.anthropic.com/v1/organizations/limits", {
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
      }).then(r => r.json()),
    ]);

    // Anthropic exposes usage via /v1/usage (beta)
    const usage = usageRes.status === "fulfilled" ? usageRes.value : null;
    const limits = limitsRes.status === "fulfilled" ? limitsRes.value : null;

    // Fallback: try the newer billing endpoint
    let billing: Record<string, unknown> | null = null;
    try {
      const billingRes = await fetch("https://api.anthropic.com/v1/account/balance", {
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
      });
      billing = await billingRes.json();
    } catch { /* ignore */ }

    // Try to get current month token usage
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const today = now.toISOString().split("T")[0];

    let monthlyUsage: Record<string, unknown> | null = null;
    try {
      const monthRes = await fetch(
        `https://api.anthropic.com/v1/usage?start_date=${startOfMonth}&end_date=${today}`,
        {
          headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
        }
      );
      monthlyUsage = await monthRes.json();
    } catch { /* ignore */ }

    return NextResponse.json({
      usage,
      limits,
      billing,
      monthly_usage: monthlyUsage,
      api_key_prefix: apiKey.substring(0, 12) + "...",
      fetched_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[Anthropic Usage]", err);
    return NextResponse.json({ error: "Failed to fetch Anthropic data" }, { status: 500 });
  }
}
