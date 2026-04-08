import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendWelcomeEmail, sendOnboarding1_Welcome } from "@/lib/resend";
import { logAudit, getIpFromHeaders } from "@/lib/auditLog";

const VALID_PLANS = ["free_test", "lite", "pro", "business", "enterprise"];

// ── Email normalization (Gmail dot-trick + plus-aliasing) ─────────────────────
function normalizeEmail(email: string): string {
  const [local, domain] = email.toLowerCase().trim().split("@");
  if (!domain) return email.toLowerCase().trim();
  const cleanLocal = local.split("+")[0]; // strip +alias
  if (domain === "gmail.com" || domain === "googlemail.com") {
    return `${cleanLocal.replace(/\./g, "")}@gmail.com`;
  }
  return `${cleanLocal}@${domain}`;
}

// ── Get real client IP ────────────────────────────────────────────────────────
function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, email, password, plan, device_fingerprint } = body;

  if (!name || !email || !password) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const selectedPlan = VALID_PLANS.includes(plan) ? plan : "free_test";
  const trialExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const registrationIp = getClientIp(req);
  const normalizedEmail = normalizeEmail(email);

  // ── Anti-abuse check (only for free_test registrations) ──────────────────
  if (selectedPlan === "free_test") {
    const svc = createServiceClient();

    // Check if same normalized email already has a free account
    const { data: emailDupes } = await svc
      .from("profiles")
      .select("id, email, subscription_plan")
      .eq("normalized_email", normalizedEmail)
      .in("subscription_plan", ["free_test"]);

    if (emailDupes && emailDupes.length > 0) {
      return NextResponse.json(
        {
          error:
            "A free trial already exists for this email address. " +
            "Please use your existing account or upgrade to a paid plan.",
          code: "DUPLICATE_EMAIL",
        },
        { status: 409 }
      );
    }

    // Check same IP — allow up to 2 free accounts per IP (some households share)
    if (registrationIp !== "unknown") {
      const { data: ipDupes } = await svc
        .from("profiles")
        .select("id")
        .eq("registration_ip", registrationIp)
        .in("subscription_plan", ["free_test"]);

      if (ipDupes && ipDupes.length >= 2) {
        // Flag but don't hard-block — admin reviews
        console.warn(
          `[Anti-Abuse] IP ${registrationIp} registering 3rd+ free account. Email: ${email}`
        );
        // Auto-flag will happen after user is created (below)
      }
    }

    // Check device fingerprint
    if (device_fingerprint) {
      const { data: fpDupes } = await svc
        .from("profiles")
        .select("id, email")
        .eq("device_fingerprint", device_fingerprint)
        .in("subscription_plan", ["free_test"]);

      if (fpDupes && fpDupes.length > 0) {
        return NextResponse.json(
          {
            error:
              "A free trial is already active on this device. " +
              "Please use your existing account or choose a paid plan.",
            code: "DUPLICATE_DEVICE",
          },
          { status: 409 }
        );
      }
    }
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, subscription_plan: selectedPlan },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/auth/callback`,
    },
  });

  if (error) {
    // Don't expose internal Supabase error details
    const msg = error.message?.includes("already registered")
      ? "An account with this email already exists."
      : "Registration failed. Please try again.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  // ── Update profile with anti-abuse fields + subscription ─────────────────
  if (data.user) {
    const svc = createServiceClient();

    await svc
      .from("profiles")
      .update({
        subscription_plan: selectedPlan,
        subscription_status: "active",
        trial_expires_at: selectedPlan === "free_test" ? trialExpiresAt : null,
        registration_ip: registrationIp,
        normalized_email: normalizedEmail,
        device_fingerprint: device_fingerprint || null,
      })
      .eq("id", data.user.id);

    // If IP has 2+ free accounts already, auto-flag this new account
    if (selectedPlan === "free_test" && registrationIp !== "unknown") {
      const { data: ipCheck } = await svc
        .from("profiles")
        .select("id")
        .eq("registration_ip", registrationIp)
        .in("subscription_plan", ["free_test"]);

      if (ipCheck && ipCheck.length >= 3) {
        try {
          await svc.from("abuse_flags").upsert({
            user_id: data.user.id,
            reason: `Multiple free accounts from IP ${registrationIp} (${ipCheck.length} total)`,
            severity: "medium",
            resolved: false,
          }, { onConflict: "user_id,reason" });
        } catch { /* ignore */ }
      }
    }
  }

  await logAudit({
    action: "user_registered",
    actor_id: data.user?.id,
    entity_type: "user",
    details: { plan: selectedPlan },
    ip: getIpFromHeaders(req.headers),
  });

  await sendWelcomeEmail(email, name).catch(() => {});
  await sendOnboarding1_Welcome(email, name).catch(() => {});

  return NextResponse.json({
    user: data.user,
    message: "Account created successfully! Check your email to confirm.",
  });
}
