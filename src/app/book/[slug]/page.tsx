"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CalendarDays, Clock, CheckCircle2, Loader2 } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface SlotInfo {
  business_name: string;
  available_slots: string[];
}

// ── Constants ──────────────────────────────────────────────────────────────────

const ALL_SLOTS = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
];

function getNext14Days(): string[] {
  const days: string[] = [];
  const now = new Date();
  for (let i = 1; days.length < 14; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const dow = d.getDay();
    if (dow === 0 || dow === 6) continue; // skip weekends
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

function formatDateLabel(iso: string): { day: string; weekday: string; month: string } {
  const d = new Date(iso + "T12:00:00");
  return {
    day: String(d.getDate()),
    weekday: d.toLocaleDateString("en-US", { weekday: "short" }),
    month: d.toLocaleDateString("en-US", { month: "short" }),
  };
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function BookingPage() {
  const { slug } = useParams<{ slug: string }>();

  const [businessName, setBusinessName] = useState("");
  const [loading, setLoading] = useState(true);
  const [dates] = useState(getNext14Days);
  const [selectedDate, setSelectedDate] = useState("");
  const [availableSlots, setAvailableSlots] = useState<string[]>(ALL_SLOTS);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  // Detect browser timezone
  const [timezone] = useState(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return "Europe/Bucharest";
    }
  });

  // Fetch prospect info on mount
  useEffect(() => {
    if (!slug) return;
    fetch(`/api/booking/slots?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.business_name) setBusinessName(d.business_name);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  // Fetch available slots when date changes
  const fetchSlots = useCallback(
    async (date: string) => {
      if (!slug || !date) return;
      setSlotsLoading(true);
      setSelectedSlot("");
      try {
        const res = await fetch(
          `/api/booking/slots?slug=${encodeURIComponent(slug)}&date=${date}`
        );
        const data: SlotInfo = await res.json();
        setAvailableSlots(data.available_slots ?? ALL_SLOTS);
      } catch {
        setAvailableSlots(ALL_SLOTS);
      } finally {
        setSlotsLoading(false);
      }
    },
    [slug]
  );

  useEffect(() => {
    if (selectedDate) fetchSlots(selectedDate);
  }, [selectedDate, fetchSlots]);

  // Submit booking
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!selectedDate || !selectedSlot || !name.trim() || !email.trim()) {
      setError("Please fill in all required fields.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          date: selectedDate,
          time_slot: selectedSlot,
          name: name.trim(),
          email: email.trim(),
          notes: notes.trim() || undefined,
          timezone,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Something went wrong. Please try again.");
      } else {
        setSubmitted(true);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #0d0b1e 0%, #1a1333 50%, #0d0b1e 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Loader2 className="animate-spin" size={32} color="#F59E0B" />
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0d0b1e 0%, #1a1333 50%, #0d0b1e 100%)",
        color: "rgba(255,255,255,0.95)",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* Background blobs */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        <div
          style={{
            position: "absolute",
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(245,158,11,0.15) 0%, transparent 70%)",
            top: "-10%",
            left: "-5%",
            filter: "blur(80px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 400,
            height: 400,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)",
            bottom: "10%",
            right: "-5%",
            filter: "blur(80px)",
          }}
        />
      </div>

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Header */}
        <header
          className="px-4 sm:px-6 md:px-8 py-4 sm:py-6"
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
        >
          <Link
            href="/"
            style={{ textDecoration: "none", color: "#fff", fontSize: 20, fontWeight: 800 }}
          >
            <span style={{ color: "#F59E0B" }}>&#9679;</span> MarketHub Pro
          </Link>
        </header>

        {/* Main content */}
        <section
          style={{ maxWidth: 720, margin: "0 auto" }}
          className="px-4 md:px-6 pt-8 sm:pt-12 pb-16"
        >
          {submitted ? (
            /* ── Confirmation ── */
            <div
              style={{
                textAlign: "center",
                background: "rgba(255,255,255,0.06)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 20,
                boxShadow: "0 4px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.1)",
              }}
              className="p-8 sm:p-12"
            >
              <CheckCircle2
                size={64}
                color="#22c55e"
                style={{ margin: "0 auto 20px" }}
              />
              <h2
                className="text-2xl sm:text-3xl font-extrabold"
                style={{ marginBottom: 12 }}
              >
                You&apos;re Booked!
              </h2>
              <p
                style={{ color: "rgba(255,255,255,0.65)", fontSize: 16, lineHeight: 1.6, marginBottom: 8 }}
              >
                We&apos;ve confirmed your call for{" "}
                <strong style={{ color: "#F59E0B" }}>
                  {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </strong>{" "}
                at <strong style={{ color: "#F59E0B" }}>{selectedSlot}</strong>.
              </p>
              <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 14, marginTop: 16 }}>
                Check your email for a confirmation. We look forward to speaking with you!
              </p>
            </div>
          ) : (
            /* ── Booking Form ── */
            <>
              <div style={{ textAlign: "center", marginBottom: 40 }}>
                <div
                  style={{
                    fontSize: 13,
                    color: "#F59E0B",
                    fontWeight: 600,
                    marginBottom: 12,
                    letterSpacing: 2,
                    textTransform: "uppercase",
                  }}
                >
                  15-Minute Call
                </div>
                <h1
                  className="text-2xl sm:text-3xl md:text-4xl font-extrabold"
                  style={{ lineHeight: 1.15, marginBottom: 12 }}
                >
                  Book a Free Demo
                  {businessName && (
                    <>
                      {" "}
                      with{" "}
                      <span style={{ color: "#F59E0B" }}>{businessName}</span>
                    </>
                  )}
                </h1>
                <p
                  className="text-sm sm:text-base"
                  style={{ color: "rgba(255,255,255,0.55)", maxWidth: 480, margin: "0 auto" }}
                >
                  Pick a date and time that works for you. No credit card required.
                </p>
              </div>

              <form onSubmit={handleSubmit}>
                <div
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    backdropFilter: "blur(16px)",
                    WebkitBackdropFilter: "blur(16px)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 20,
                    boxShadow:
                      "0 4px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.1)",
                  }}
                  className="p-5 sm:p-8"
                >
                  {/* Step 1: Date picker */}
                  <div style={{ marginBottom: 28 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 14,
                      }}
                    >
                      <CalendarDays size={18} color="#F59E0B" />
                      <span style={{ fontWeight: 700, fontSize: 15 }}>Select a Date</span>
                    </div>
                    <div
                      className="grid grid-cols-4 sm:grid-cols-7 gap-2"
                    >
                      {dates.map((d) => {
                        const { day, weekday, month } = formatDateLabel(d);
                        const active = d === selectedDate;
                        return (
                          <button
                            key={d}
                            type="button"
                            onClick={() => setSelectedDate(d)}
                            style={{
                              padding: "10px 4px",
                              borderRadius: 12,
                              border: active
                                ? "2px solid #F59E0B"
                                : "1px solid rgba(255,255,255,0.12)",
                              background: active
                                ? "rgba(245,158,11,0.15)"
                                : "rgba(255,255,255,0.04)",
                              color: active ? "#F59E0B" : "rgba(255,255,255,0.8)",
                              cursor: "pointer",
                              textAlign: "center",
                              transition: "all 0.15s",
                            }}
                          >
                            <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 2 }}>
                              {weekday}
                            </div>
                            <div style={{ fontSize: 18, fontWeight: 700 }}>{day}</div>
                            <div style={{ fontSize: 10, opacity: 0.6, marginTop: 2 }}>
                              {month}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Step 2: Time slots */}
                  {selectedDate && (
                    <div style={{ marginBottom: 28 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 14,
                        }}
                      >
                        <Clock size={18} color="#F59E0B" />
                        <span style={{ fontWeight: 700, fontSize: 15 }}>Select a Time</span>
                      </div>
                      {slotsLoading ? (
                        <div style={{ textAlign: "center", padding: 20 }}>
                          <Loader2 className="animate-spin" size={20} color="#F59E0B" />
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                          {ALL_SLOTS.map((slot) => {
                            const available = availableSlots.includes(slot);
                            const active = slot === selectedSlot;
                            return (
                              <button
                                key={slot}
                                type="button"
                                disabled={!available}
                                onClick={() => setSelectedSlot(slot)}
                                style={{
                                  padding: "10px 8px",
                                  borderRadius: 10,
                                  border: active
                                    ? "2px solid #F59E0B"
                                    : "1px solid rgba(255,255,255,0.12)",
                                  background: !available
                                    ? "rgba(255,255,255,0.02)"
                                    : active
                                    ? "rgba(245,158,11,0.15)"
                                    : "rgba(255,255,255,0.04)",
                                  color: !available
                                    ? "rgba(255,255,255,0.2)"
                                    : active
                                    ? "#F59E0B"
                                    : "rgba(255,255,255,0.8)",
                                  cursor: available ? "pointer" : "not-allowed",
                                  fontWeight: 600,
                                  fontSize: 14,
                                  textDecoration: !available ? "line-through" : "none",
                                  transition: "all 0.15s",
                                }}
                              >
                                {slot}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step 3: Contact info */}
                  {selectedSlot && (
                    <div style={{ marginBottom: 24 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>
                        Your Details
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" style={{ marginBottom: 12 }}>
                        <input
                          type="text"
                          placeholder="Your Name *"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                          style={{
                            padding: "12px 16px",
                            borderRadius: 10,
                            border: "1px solid rgba(255,255,255,0.15)",
                            background: "rgba(255,255,255,0.06)",
                            color: "#fff",
                            fontSize: 14,
                            outline: "none",
                            width: "100%",
                          }}
                        />
                        <input
                          type="email"
                          placeholder="Email Address *"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          style={{
                            padding: "12px 16px",
                            borderRadius: 10,
                            border: "1px solid rgba(255,255,255,0.15)",
                            background: "rgba(255,255,255,0.06)",
                            color: "#fff",
                            fontSize: 14,
                            outline: "none",
                            width: "100%",
                          }}
                        />
                      </div>
                      <textarea
                        placeholder="Notes (optional)"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                        style={{
                          padding: "12px 16px",
                          borderRadius: 10,
                          border: "1px solid rgba(255,255,255,0.15)",
                          background: "rgba(255,255,255,0.06)",
                          color: "#fff",
                          fontSize: 14,
                          outline: "none",
                          width: "100%",
                          resize: "vertical",
                        }}
                      />
                    </div>
                  )}

                  {/* Timezone note */}
                  {selectedDate && (
                    <p
                      style={{
                        fontSize: 12,
                        color: "rgba(255,255,255,0.35)",
                        marginBottom: selectedSlot ? 20 : 0,
                      }}
                    >
                      Times shown in {timezone}
                    </p>
                  )}

                  {/* Error */}
                  {error && (
                    <div
                      style={{
                        padding: "10px 16px",
                        borderRadius: 10,
                        background: "rgba(239,68,68,0.15)",
                        border: "1px solid rgba(239,68,68,0.3)",
                        color: "#fca5a5",
                        fontSize: 14,
                        marginBottom: 16,
                      }}
                    >
                      {error}
                    </div>
                  )}

                  {/* Submit */}
                  {selectedSlot && (
                    <button
                      type="submit"
                      disabled={submitting || !name.trim() || !email.trim()}
                      className="btn-3d-active w-full"
                      style={{
                        padding: "14px 32px",
                        borderRadius: 14,
                        fontWeight: 700,
                        fontSize: 16,
                        color: "#1C1814",
                        background:
                          "linear-gradient(135deg, rgba(245,158,11,0.9), rgba(217,119,6,0.9))",
                        border: "1px solid rgba(255,255,255,0.35)",
                        boxShadow:
                          "0 6px 30px rgba(245,158,11,0.4), inset 0 1px 0 rgba(255,255,255,0.45)",
                        cursor: submitting ? "wait" : "pointer",
                        opacity: submitting || !name.trim() || !email.trim() ? 0.6 : 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        transition: "all 0.2s",
                      }}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="animate-spin" size={18} /> Booking...
                        </>
                      ) : (
                        "Confirm Booking"
                      )}
                    </button>
                  )}
                </div>
              </form>
            </>
          )}
        </section>

        {/* Footer */}
        <footer
          style={{
            textAlign: "center",
            padding: "40px 24px",
            borderTop: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>
            MarketHub Pro — Social Media Marketing for Businesses
          </p>
        </footer>
      </div>
    </div>
  );
}
