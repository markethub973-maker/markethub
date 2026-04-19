import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendTelegramMessage } from "@/lib/channels/telegram";

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

  // ── Telegram notification ─────────────────────────────────────────────────
  const chatId = process.env.TELEGRAM_ALLOWED_CHAT_ID;
  if (chatId) {
    const dateFormatted = dateObj.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    const msg = [
      `New booking: ${page.business_name}`,
      `${name.trim()} at ${dateFormatted} ${time_slot}`,
      `Email: ${email.trim()}`,
      timezone ? `Timezone: ${timezone}` : "",
      notes?.trim() ? `Notes: ${notes.trim()}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    sendTelegramMessage(chatId, msg).catch((err) => {
      console.error("[booking] telegram notification failed:", err);
    });
  }

  return NextResponse.json({ ok: true, booking_id: booking.id });
}
