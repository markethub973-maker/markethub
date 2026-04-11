import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/route-helpers";
import { createServiceClient } from "@/lib/supabase/service";
import { logAudit, getIpFromHeaders } from "@/lib/auditLog";
import { logSecurityEvent } from "@/lib/siem";

// GDPR Art. 17 — Right to erasure: permanently deletes the user's account
// and all related data via Supabase Auth admin API (CASCADE through FKs).
//
// Requires the user to type their email address as confirmation to avoid
// accidental / CSRF deletion. Cancels Stripe subscription first if active
// so we don't keep billing a deleted account.
export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { confirm_email } = (await req.json().catch(() => ({}))) as { confirm_email?: string };
  if (!confirm_email) {
    return NextResponse.json({ error: "confirm_email required" }, { status: 400 });
  }

  const supa = createServiceClient();

  // Fetch the auth user + profile to compare confirm_email
  const { data: authUser } = await supa.auth.admin.getUserById(auth.userId);
  const realEmail = authUser?.user?.email ?? null;
  if (!realEmail || realEmail.toLowerCase() !== confirm_email.toLowerCase()) {
    void logSecurityEvent({
      event_type: "unusual_activity",
      severity: "medium",
      ip: req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? undefined,
      user_id: auth.userId,
      path: "/api/user/delete-account",
      details: { reason: "delete_account_email_mismatch" },
    });
    return NextResponse.json(
      { error: "Email confirmation doesn't match your account email" },
      { status: 400 },
    );
  }

  // Cancel any active Stripe subscription before deletion
  const { data: profile } = await supa
    .from("profiles")
    .select("stripe_subscription_id")
    .eq("id", auth.userId)
    .single();

  if (profile?.stripe_subscription_id) {
    try {
      // Cancel via Stripe API — best effort, don't block deletion on failure
      const { stripe } = await import("@/lib/stripe");
      await stripe.subscriptions.cancel(profile.stripe_subscription_id);
    } catch (err) {
      console.error("[delete-account] Stripe cancel failed:", err);
    }
  }

  // Delete the Supabase Auth user — FK CASCADE removes profile + all
  // related rows across the ~36 user-owned tables.
  const { error: deleteErr } = await supa.auth.admin.deleteUser(auth.userId);
  if (deleteErr) {
    return NextResponse.json({ error: deleteErr.message }, { status: 500 });
  }

  await logAudit({
    action: "gdpr_account_deleted",
    actor_id: auth.userId,
    entity_type: "user",
    details: { email: realEmail },
    ip: getIpFromHeaders(req.headers),
  });

  return NextResponse.json({
    ok: true,
    message: "Your account and all associated data have been permanently deleted.",
  });
}
