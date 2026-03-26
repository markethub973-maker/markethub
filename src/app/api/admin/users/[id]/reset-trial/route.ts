import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const targetUserId = id;

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
      .select()
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
        .select()
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
  } catch (error) {
    console.error("Reset trial error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
