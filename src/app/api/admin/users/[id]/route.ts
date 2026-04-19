import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isAdminAuthorized } from "@/lib/adminAuth";

const VALID_PLANS = ["free_test", "lite", "pro", "business", "agency"];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Use HMAC admin session cookie — same as all other /api/admin/* routes.
  // The old approach (is_admin DB flag via user session) could be bypassed
  // by any authenticated user who managed to set is_admin=true on their profile.
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id: targetUserId } = await params;
    const { plan } = await request.json();

    if (!plan) {
      return NextResponse.json({ error: "Plan is required" }, { status: 400 });
    }

    if (!VALID_PLANS.includes(plan)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const supa = createServiceClient();

    // Return only safe fields — never include tokens or hashes
    const { data: updatedUser, error: updateError } = await supa
      .from("profiles")
      .update({ plan, subscription_plan: plan })
      .eq("id", targetUserId)
      .select("id, email, name, plan, subscription_plan, subscription_status, created_at")
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `User plan updated to ${plan}`,
      user: updatedUser,
    });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
