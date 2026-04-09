import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeApify } from "@/lib/serviceGuard";
import { checkAndIncrDailyLimit, limitExceededResponse } from "@/lib/dailyLimits";

const SUPPORTED_COUNTRIES = new Set(["pl", "bg", "ro", "pt", "ua"]);

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("plan").eq("id", user.id).single();
  const userPlan = (profile as any)?.plan ?? "free_test";
  const limitCheck = await checkAndIncrDailyLimit(user.id, userPlan, "research");
  if (!limitCheck.allowed) return NextResponse.json(limitExceededResponse(limitCheck, "research"), { status: 429 });

  if (!process.env.APIFY_TOKEN) return NextResponse.json({ error: "Apify not configured", degraded: true }, { status: 503 });

  const { query, country = "ro", limit = 30, sortBy = "created_at:desc", priceFrom, priceTo } = await req.json();
  if (!query?.trim()) return NextResponse.json({ error: "Search query required" }, { status: 400 });

  const ctry = String(country).toLowerCase();
  if (!SUPPORTED_COUNTRIES.has(ctry)) {
    return NextResponse.json({ error: `Unsupported country '${ctry}'. Supported: ro, pl, bg, pt, ua` }, { status: 400 });
  }

  const input: Record<string, unknown> = {
    country: ctry,
    mode: "search",
    searchQuery: query.trim(),
    maxItems: Math.min(Math.max(Number(limit) || 30, 1), 100),
    sortBy,
    includeDetails: false,
  };
  if (typeof priceFrom === "number" && priceFrom > 0) input.priceFrom = priceFrom;
  if (typeof priceTo === "number" && priceTo > 0) input.priceTo = priceTo;

  const result = await safeApify<any[]>("piotrv1001~olx-listings-scraper", input, {
    timeoutSec: 180,
    retries: 1,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error, service: "apify", degraded: true }, { status: 503 });
  }

  try {
    const data = result.data || [];
    const listings = data.map((it: any) => ({
      id: it.id,
      url: it.url,
      title: it.title,
      description: (it.description || "").slice(0, 400),
      price: it.price,
      currency: it.currency,
      negotiable: it.negotiable,
      condition: it.condition,
      city: it.city,
      district: it.district,
      region: it.region,
      sellerName: it.sellerName,
      sellerId: it.sellerId,
      sellerType: it.sellerType,
      sellerJoined: it.sellerJoined,
      isPromoted: it.isPromoted,
      photo: Array.isArray(it.photos) ? it.photos[0] : null,
      photoCount: Array.isArray(it.photos) ? it.photos.length : 0,
      createdAt: it.createdAt,
      refreshedAt: it.refreshedAt,
    }));

    return NextResponse.json({
      listings,
      total: listings.length,
      country: ctry,
      query: query.trim(),
    });
  } catch {
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}
