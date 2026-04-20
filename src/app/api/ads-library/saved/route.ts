import { NextRequest, NextResponse } from "next/server";
import { requirePlan } from "@/lib/requirePlan";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(req: NextRequest) {
  const check = await requirePlan(req, "/ads-library");
  if (check instanceof NextResponse) return check;

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("saved_ads")
    .select("*")
    .eq("user_id", check.userId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch saved ads" }, { status: 500 });
  }

  return NextResponse.json({ saved: data || [] });
}

export async function POST(req: NextRequest) {
  const check = await requirePlan(req, "/ads-library");
  if (check instanceof NextResponse) return check;

  const body = await req.json();
  const { page_name, creative_text, platform, country, ad_data } = body;

  if (!page_name) {
    return NextResponse.json({ error: "page_name is required" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("saved_ads")
    .insert({
      user_id: check.userId,
      page_name,
      creative_text: creative_text || "",
      platform: platform || "facebook",
      country: country || "ALL",
      ad_data: ad_data || {},
    })
    .select()
    .single();

  if (error) {
    // If table doesn't exist, return a helpful message
    if (error.code === "42P01") {
      return NextResponse.json(
        { error: "Saved ads table not yet created. Please run the migration." },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: "Failed to save ad" }, { status: 500 });
  }

  return NextResponse.json({ saved: data });
}

export async function DELETE(req: NextRequest) {
  const check = await requirePlan(req, "/ads-library");
  if (check instanceof NextResponse) return check;

  const { id } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("saved_ads")
    .delete()
    .eq("id", id)
    .eq("user_id", check.userId);

  if (error) {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
