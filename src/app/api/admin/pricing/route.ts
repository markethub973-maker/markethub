import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// In-memory pricing (in production, store in database or environment)
let planPrices = {
  free_test: { price: 0, period: "7_days" },
  lite: { price: 20, period: "monthly" },
  pro: { price: 40, period: "monthly" },
};

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if admin
    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!adminProfile?.is_admin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const plans = [
      {
        id: "free_test",
        name: "Free Test",
        price: planPrices.free_test.price,
        period: planPrices.free_test.period,
      },
      {
        id: "lite",
        name: "Lite",
        price: planPrices.lite.price,
        period: planPrices.lite.period,
      },
      {
        id: "pro",
        name: "Pro",
        price: planPrices.pro.price,
        period: planPrices.pro.period,
      },
    ];

    return NextResponse.json({
      success: true,
      plans,
    });
  } catch (error) {
    console.error("Get pricing error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if admin
    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!adminProfile?.is_admin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const { plan, price } = await request.json();

    if (!plan || price === undefined) {
      return NextResponse.json(
        { error: "Plan and price are required" },
        { status: 400 }
      );
    }

    if (!["free_test", "lite", "pro"].includes(plan)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    if (plan === "free_test" && price !== 0) {
      return NextResponse.json(
        { error: "Free test plan must be free" },
        { status: 400 }
      );
    }

    // Update price
    planPrices[plan as keyof typeof planPrices].price = price;

    return NextResponse.json({
      success: true,
      message: `${plan} plan updated to $${price}/month`,
      updated_plan: {
        id: plan,
        price: price,
        period: planPrices[plan as keyof typeof planPrices].period,
      },
    });
  } catch (error) {
    console.error("Update pricing error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
