import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isAdminAuthorized } from "@/lib/adminAuth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Use HMAC admin session cookie — consistent with all other /api/admin/* routes.
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id: targetUserId } = await params;
    const supabase = createServiceClient();

    // Calculate trial expiration (7 days from now)
    const trialExpiresAt = new Date();
    trialExpiresAt.setDate(trialExpiresAt.getDate() + 7);

    // Update subscription with new trial date
    const { data: updatedSub, error: updateError } = await supabase
      .from("subscriptions")
      .update({
        status: "active",
        expires_at: trialExpiresAt.toISOString(),
      })
      .eq("user_id", targetUserId)
      .select("id, user_id, plan, status, expires_at")
      .single();

    if (updateError && updateError.code !== "PGRST116") { // PGRST116 = no rows found
      return NextResponse.json(
        { error: updateError.message },
        { status: 400 }
      );
    }

    // If no subscription exists, create one
    if (!updatedSub) {
      const { data: newSub, error: createError } = await supabase
        .from("subscriptions")
        .insert({
          user_id: targetUserId,
          plan: "free_test",
          status: "active",
          expires_at: trialExpiresAt.toISOString(),
        })
        .select("id, user_id, plan, status, expires_at")
        .single();

      if (createError) {
        return NextResponse.json(
          { error: createError.message },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Trial reset for 7 days",
        subscription: newSub,
        expires_at: trialExpiresAt.toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      message: "Trial reset for 7 days",
      subscription: updatedSub,
      expires_at: trialExpiresAt.toISOString(),
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
