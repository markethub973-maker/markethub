import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

const ALL_SLOTS = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
];

/**
 * GET /api/booking/slots?slug=XXX&date=2026-04-20
 *
 * Public endpoint — no auth required.
 *
 * If `date` is provided: returns available time slots for that date.
 * If no `date`: returns the prospect's business name.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");
  const date = searchParams.get("date");

  if (!slug) {
    return NextResponse.json({ error: "slug is required" }, { status: 400 });
  }

  const svc = createServiceClient();

  // Look up the prospect page to get the business name
  const { data: page } = await svc
    .from("prospect_pages")
    .select("id, business_name")
    .eq("slug", slug)
    .maybeSingle();

  if (!page) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // If no date, just return business info
  if (!date) {
    return NextResponse.json({
      business_name: page.business_name,
      available_slots: ALL_SLOTS,
    });
  }

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
  }

  // Check for already-booked slots on this date for this prospect
  const { data: booked } = await svc
    .from("bookings")
    .select("time_slot")
    .eq("prospect_page_id", page.id)
    .eq("date", date)
    .in("status", ["pending", "confirmed"]);

  const bookedSlots = new Set((booked ?? []).map((b: { time_slot: string }) => b.time_slot));
  const available = ALL_SLOTS.filter((s) => !bookedSlots.has(s));

  return NextResponse.json({
    business_name: page.business_name,
    available_slots: available,
  });
}
