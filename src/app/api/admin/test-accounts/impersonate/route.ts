import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/adminAuth";
import { createServiceClient } from "@/lib/supabase/service";

const PLAN_ORDER = ["free_test", "starter", "lite", "pro", "business", "enterprise"];

export async function POST(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { plan } = await req.json();
  if (!PLAN_ORDER.includes(plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const email = `test.${plan}@markethubpromo.com`;

  // Generate magic link so admin can log in as this test user instantly
  const { data, error } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://markethubpromo.com"}/dashboard`,
    },
  });

  if (error || !data?.properties?.action_link) {
    return NextResponse.json({ error: error?.message ?? "Could not generate link" }, { status: 500 });
  }

  return NextResponse.json({ url: data.properties.action_link });
}
