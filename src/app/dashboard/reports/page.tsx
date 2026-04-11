"use client";

/**
 * Reports — Wave 5 dashboard page.
 *
 * Layout:
 *   Top:    Summary bar (counts by channel/status)
 *   Form:   "Send report" composer (recipient, channel picker, subject, body, link)
 *   List:   Delivery history with status badges + retry button on failures
 *
 * Auth: relies on Supabase user session via cookie.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Send,
  MessageSquare,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
} from "lucide-react";

interface Delivery {
  id: string;
  client_id: string | null;
  report_type: "monthly" | "weekly" | "on_demand" | "custom" | "test";
  format: "pdf" | "link" | "summary_text";
  channel: "whatsapp" | "telegram" | "email";
  recipient: string;
  message_preview: string | null;
  status: "queued" | "sent" | "delivered" | "failed";
  external_id: string | null;
  report_url: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  error: string | null;
  created_at: string;
}

interface ReportsResponse {
  deliveries: Delivery[];
  counts: {
    by_status: Record<string, number>;
    by_channel: Record<string, number>;
    total: number;
  };
}

const STATUS_COLORS: Record<string, string> = {
  queued: "#A8967E",
  sent: "#0EA5E9",
  delivered: "#10B981",
  failed: "#EF4444",
};

const CHANNEL_ICONS: Record<string, string> = {
  whatsapp: "💬",
  telegram: "📨",
  email: "📧",
};

export default function ReportsPage() {
  const [data, setData] = useState<ReportsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Send form state
  const [channel, setChannel] = useState<"whatsapp" | "telegram">("whatsapp");
  const [recipient, setRecipient] = useState("");
  const [subject, setSubject] = useState("");
  const [bodyMsg, setBodyMsg] = useState("");
  const [reportUrl, setReportUrl] = useState("");
  const [reportType, setReportType] = useState<Delivery["report_type"]>("on_demand");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ ok?: boolean; error?: string; hint?: string; message_id?: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/reports", { cache: "no-store" });
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function sendReport() {
    if (!recipient.trim() || sending) return;
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch("/api/reports/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel,
          recipient: recipient.trim(),
          subject: subject.trim() || undefined,
          body: bodyMsg.trim() || undefined,
          report_url: reportUrl.trim() || undefined,
          report_type: reportType,
          format: reportUrl.trim() ? "link" : "summary_text",
        }),
      });
      const d = await res.json();
      setSendResult(d);
      if (res.ok && d.ok) {
        // Reset form on success
        setSubject("");
        setBodyMsg("");
        setReportUrl("");
        await load();
      }
    } catch (e) {
      setSendResult({ ok: false, error: e instanceof Error ? e.message : "Network error" });
    } finally {
      setSending(false);
    }
  }

  const counts = data?.counts;
  const deliveries = data?.deliveries ?? [];

  return (
    <div style={{ minHeight: "100vh", background: "#FAFAF8", color: "#292524" }}>
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "16px 24px",
          borderBottom: "1px solid rgba(245,215,160,0.25)",
          background: "#FFFCF7",
        }}
      >
        <Link
          href="/dashboard"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 12px",
            background: "rgba(245,158,11,0.08)",
            borderRadius: 6,
            color: "#F59E0B",
            textDecoration: "none",
            fontSize: 12,
          }}
        >
          <ArrowLeft size={14} /> Dashboard
        </Link>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: "#A8967E", letterSpacing: 1.5, textTransform: "uppercase" }}>
            CRM & Delivery
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Reports — WhatsApp + Telegram</h1>
        </div>
      </div>

      {/* Summary cards */}
      {counts && counts.total > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 12,
            padding: "20px 24px",
          }}
        >
          {(["queued", "sent", "delivered", "failed"] as const).map((s) => (
            <div
              key={s}
              style={{
                padding: 16,
                background: "#FFFCF7",
                border: `1px solid ${STATUS_COLORS[s]}33`,
                borderLeft: `3px solid ${STATUS_COLORS[s]}`,
                borderRadius: 10,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  color: STATUS_COLORS[s],
                  letterSpacing: 1,
                  textTransform: "uppercase",
                  fontWeight: 700,
                  marginBottom: 4,
                }}
              >
                {s}
              </div>
              <div style={{ fontSize: 28, fontWeight: 900, color: "#292524" }}>
                {counts.by_status[s] ?? 0}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Two-column layout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(360px, 1fr) 2fr",
          gap: 16,
          padding: "0 24px 24px",
        }}
      >
        {/* Send form */}
        <div
          style={{
            background: "#FFFCF7",
            border: "1px solid rgba(245,215,160,0.3)",
            borderRadius: 12,
            padding: 16,
            height: "fit-content",
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: "#A8967E",
              letterSpacing: 1.5,
              textTransform: "uppercase",
              fontWeight: 700,
              marginBottom: 12,
            }}
          >
            <Send size={11} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
            Send report
          </div>

          {/* Channel picker */}
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            <button
              onClick={() => setChannel("whatsapp")}
              style={{
                flex: 1,
                padding: "10px 12px",
                background: channel === "whatsapp" ? "#25D366" : "rgba(37,211,102,0.08)",
                color: channel === "whatsapp" ? "white" : "#25D366",
                border: "none",
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              💬 WhatsApp
            </button>
            <button
              onClick={() => setChannel("telegram")}
              style={{
                flex: 1,
                padding: "10px 12px",
                background: channel === "telegram" ? "#0088CC" : "rgba(0,136,204,0.08)",
                color: channel === "telegram" ? "white" : "#0088CC",
                border: "none",
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              📨 Telegram
            </button>
          </div>

          <Field
            label={channel === "whatsapp" ? "Phone (E.164)" : "Telegram chat_id"}
          >
            <input
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder={channel === "whatsapp" ? "+40735658742" : "123456789"}
              style={inputStyle}
            />
          </Field>
          <Field label="Subject (opțional)">
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Raport săptămânal Instagram — 5 apr 2026"
              style={inputStyle}
            />
          </Field>
          <Field label="Body message">
            <textarea
              value={bodyMsg}
              onChange={(e) => setBodyMsg(e.target.value)}
              rows={4}
              placeholder="Bună, acestea sunt rezultatele săptămânii trecute..."
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </Field>
          <Field label="Link raport (opțional)">
            <input
              value={reportUrl}
              onChange={(e) => setReportUrl(e.target.value)}
              placeholder="https://..."
              style={inputStyle}
            />
          </Field>
          <Field label="Tip raport">
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as Delivery["report_type"])}
              style={inputStyle}
            >
              <option value="on_demand">On demand</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="custom">Custom</option>
              <option value="test">Test</option>
            </select>
          </Field>

          <button
            onClick={sendReport}
            disabled={sending || !recipient.trim() || (!subject.trim() && !bodyMsg.trim() && !reportUrl.trim())}
            style={{
              width: "100%",
              marginTop: 8,
              padding: 12,
              background:
                sending || !recipient.trim() || (!subject.trim() && !bodyMsg.trim() && !reportUrl.trim())
                  ? "#C4AA8A"
                  : "#F59E0B",
              color: "#1C1814",
              border: "none",
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 13,
              cursor:
                sending || !recipient.trim() || (!subject.trim() && !bodyMsg.trim() && !reportUrl.trim())
                  ? "not-allowed"
                  : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            {sending ? "Se trimite..." : "Trimite raportul"}
          </button>

          {sendResult && (
            <div
              style={{
                marginTop: 10,
                padding: 10,
                background: sendResult.ok ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
                border: `1px solid ${sendResult.ok ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
                borderRadius: 6,
                fontSize: 11,
                color: sendResult.ok ? "#065F46" : "#B91C1C",
              }}
            >
              {sendResult.ok ? (
                <>
                  <CheckCircle2 size={11} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
                  Trimis ({sendResult.message_id ? `id: ${sendResult.message_id.slice(0, 16)}...` : "queued"})
                </>
              ) : (
                <>
                  <AlertCircle size={11} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
                  {sendResult.error}
                  {sendResult.hint && (
                    <div style={{ marginTop: 6, fontStyle: "italic" }}>{sendResult.hint}</div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Delivery history */}
        <div
          style={{
            background: "#FFFCF7",
            border: "1px solid rgba(245,215,160,0.3)",
            borderRadius: 12,
            padding: 16,
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: "#A8967E",
              letterSpacing: 1.5,
              textTransform: "uppercase",
              fontWeight: 700,
              marginBottom: 12,
            }}
          >
            <MessageSquare size={11} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
            Istoric livrări
          </div>

          {loading && !data && (
            <div style={{ padding: 30, textAlign: "center", color: "#A8967E" }}>
              <Loader2 size={20} className="animate-spin" style={{ margin: "0 auto 8px" }} />
              Se încarcă...
            </div>
          )}

          {!loading && deliveries.length === 0 && (
            <div style={{ padding: 30, textAlign: "center", color: "#A8967E" }}>
              <MessageSquare size={32} style={{ margin: "0 auto 8px", opacity: 0.3 }} />
              <div style={{ fontWeight: 600, color: "#78614E" }}>Nicio livrare încă</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>
                Trimite primul raport din formul-ul din stânga.
              </div>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {deliveries.map((d) => (
              <div
                key={d.id}
                style={{
                  padding: 12,
                  background: "white",
                  border: "1px solid rgba(245,215,160,0.25)",
                  borderRadius: 8,
                  borderLeft: `3px solid ${STATUS_COLORS[d.status]}`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 4,
                  }}
                >
                  <span style={{ fontSize: 14 }}>{CHANNEL_ICONS[d.channel]}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#292524" }}>
                    {d.recipient}
                  </span>
                  <span
                    style={{
                      fontSize: 9,
                      padding: "1px 8px",
                      borderRadius: 10,
                      background: `${STATUS_COLORS[d.status]}18`,
                      color: STATUS_COLORS[d.status],
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: 0.8,
                    }}
                  >
                    {d.status === "delivered" && <CheckCircle2 size={9} style={{ display: "inline", marginRight: 3 }} />}
                    {d.status === "failed" && <XCircle size={9} style={{ display: "inline", marginRight: 3 }} />}
                    {d.status === "queued" && <Clock size={9} style={{ display: "inline", marginRight: 3 }} />}
                    {d.status}
                  </span>
                  <span style={{ marginLeft: "auto", fontSize: 10, color: "#A8967E" }}>
                    {new Date(d.created_at).toLocaleString("ro-RO", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                {d.message_preview && (
                  <div
                    style={{
                      fontSize: 11,
                      color: "#78614E",
                      lineHeight: 1.4,
                      whiteSpace: "pre-wrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                    }}
                  >
                    {d.message_preview}
                  </div>
                )}
                {d.error && (
                  <div
                    style={{
                      marginTop: 6,
                      padding: 6,
                      background: "rgba(239,68,68,0.06)",
                      borderRadius: 4,
                      fontSize: 10,
                      color: "#B91C1C",
                    }}
                  >
                    ⚠ {d.error}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  border: "1px solid rgba(245,215,160,0.3)",
  borderRadius: 6,
  fontSize: 12,
  outline: "none",
  fontFamily: "inherit",
  background: "white",
  color: "#292524",
  marginBottom: 4,
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label
        style={{
          display: "block",
          fontSize: 9,
          color: "#78614E",
          letterSpacing: 1,
          textTransform: "uppercase",
          fontWeight: 700,
          marginBottom: 4,
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}
