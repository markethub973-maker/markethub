import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

const VALID_SLOTS = new Set([
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
]);

/**
 * POST /api/booking
 *
 * Public endpoint — prospect books a call.
 * Body: { slug, date, time_slot, name, email, notes?, timezone? }
 */
export async function POST(req: NextRequest) {
  let body: {
    slug?: string;
    date?: string;
    time_slot?: string;
    name?: string;
    email?: string;
    notes?: string;
    timezone?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { slug, date, time_slot, name, email, notes, timezone } = body;

  // ── Validation ──────────────────────────────────────────────────────────────
  if (!slug || !date || !time_slot || !name?.trim() || !email?.trim()) {
    return NextResponse.json(
      { ok: false, error: "Missing required fields: slug, date, time_slot, name, email" },
      { status: 400 }
    );
  }

  // Date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ ok: false, error: "Invalid date format" }, { status: 400 });
  }

  // Date must be today or future
  const today = new Date().toISOString().slice(0, 10);
  if (date < today) {
    return NextResponse.json({ ok: false, error: "Date must be in the future" }, { status: 400 });
  }

  // No weekends
  const dateObj = new Date(date + "T12:00:00");
  const dow = dateObj.getDay();
  if (dow === 0 || dow === 6) {
    return NextResponse.json({ ok: false, error: "Weekends are not available" }, { status: 400 });
  }

  // Valid time slot
  if (!VALID_SLOTS.has(time_slot)) {
    return NextResponse.json({ ok: false, error: "Invalid time slot" }, { status: 400 });
  }

  // Email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json({ ok: false, error: "Invalid email format" }, { status: 400 });
  }

  const svc = createServiceClient();

  // Look up prospect page
  const { data: page } = await svc
    .from("prospect_pages")
    .select("id, business_name")
    .eq("slug", slug)
    .maybeSingle();

  if (!page) {
    return NextResponse.json({ ok: false, error: "Invalid booking link" }, { status: 404 });
  }

  // Check slot not already taken
  const { data: existing } = await svc
    .from("bookings")
    .select("id")
    .eq("prospect_page_id", page.id)
    .eq("date", date)
    .eq("time_slot", time_slot)
    .in("status", ["pending", "confirmed"])
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { ok: false, error: "This time slot is no longer available. Please choose another." },
      { status: 409 }
    );
  }

  // ── Insert booking ────────────────────────────────────────────────────────
  const { data: booking, error: insertErr } = await svc
    .from("bookings")
    .insert({
      prospect_page_id: page.id,
      slug,
      prospect_name: name.trim(),
      prospect_email: email.trim().toLowerCase(),
      date,
      time_slot,
      timezone: timezone || "Europe/Bucharest",
      status: "pending",
      notes: notes?.trim() || null,
    })
    .select("id")
    .single();

  if (insertErr || !booking) {
    console.error("[booking] insert error:", insertErr);
    return NextResponse.json(
      { ok: false, error: "Failed to create booking. Please try again." },
      { status: 500 }
    );
  }

  const dateFormatted = dateObj.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  // ── Telegram notification to Eduard ──────────────────────────────────────
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ALLOWED_CHAT_ID;
  if (botToken && chatId) {
    const tgMsg = `📅 New booking!\n\n${page.business_name}\n${name.trim()} — ${dateFormatted} at ${time_slot}\nEmail: ${email.trim()}${notes?.trim() ? `\nNotes: ${notes.trim()}` : ""}`;
    try {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: tgMsg }),
      });
    } catch (e) {
      console.error("[booking] telegram failed:", e);
    }
  }

  // ── Email confirmation to prospect ───────────────────────────────────────
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: "MarketHub Pro <noreply@markethubpromo.com>",
          to: email.trim(),
          subject: `Your call is confirmed — ${dateFormatted} at ${time_slot}`,
          html: `
<div style="font-family:system-ui,sans-serif;max-width:500px;margin:0 auto;padding:32px;background:#111;color:#fff;border-radius:16px;">
  <div style="text-align:center;margin-bottom:24px;">
    <span style="font-size:48px;">✅</span>
  </div>
  <h1 style="font-size:22px;font-weight:800;text-align:center;margin-bottom:8px;">You're Booked!</h1>
  <p style="text-align:center;color:rgba(255,255,255,0.6);font-size:14px;margin-bottom:24px;">
    Your call with MarketHub Pro is confirmed.
  </p>
  <div style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:20px;margin-bottom:24px;">
    <p style="margin:0 0 8px;font-size:13px;color:rgba(255,255,255,0.4);">DATE & TIME</p>
    <p style="margin:0;font-size:18px;font-weight:700;color:#F59E0B;">${dateFormatted} at ${time_slot}</p>
  </div>
  <div style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:20px;margin-bottom:24px;">
    <p style="margin:0 0 8px;font-size:13px;color:rgba(255,255,255,0.4);">REGARDING</p>
    <p style="margin:0;font-size:16px;font-weight:600;">${page.business_name}</p>
  </div>
  <p style="font-size:13px;color:rgba(255,255,255,0.5);text-align:center;">
    Duration: 15 minutes · No commitment<br>
    We'll discuss how we can help grow your social media presence.
  </p>
  <p style="font-size:11px;color:rgba(255,255,255,0.25);text-align:center;margin-top:24px;">
    MarketHub Pro · markethubpromo.com
  </p>
</div>`,
        }),
      });
    } catch (e) {
      console.error("[booking] email confirmation failed:", e);
    }
  }

  return NextResponse.json({ ok: true, booking_id: booking.id });
}
