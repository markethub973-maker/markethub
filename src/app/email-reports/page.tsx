"use client";

import { useState, useEffect, useCallback } from "react";
import Header from "@/components/layout/Header";
import { Mail, Send, CheckCircle2, AlertCircle, FileText, Clock, Trash2, Power } from "lucide-react";

const cardStyle = { backgroundColor: "var(--color-bg-secondary)", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" };
const ACCENT = "var(--color-primary)";

export default function EmailReportsPage() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Scheduled reports
  interface ScheduledReport { id: string; email: string; frequency: string; active: boolean; last_sent_at: string | null; }
  const [schedules, setSchedules] = useState<ScheduledReport[]>([]);
  const [schedEmail, setSchedEmail] = useState("");
  const [schedFreq, setSchedFreq] = useState<"weekly" | "monthly" | "custom">("weekly");
  const [schedSaving, setSchedSaving] = useState(false);

  const loadSchedules = useCallback(async () => {
    try {
      const res = await fetch("/api/email/scheduled-reports");
      const data = await res.json();
      setSchedules(data.reports ?? []);
    } catch { /* no-op */ }
  }, []);

  useEffect(() => { loadSchedules(); }, [loadSchedules]);

  const saveSchedule = async () => {
    if (!schedEmail.trim()) return;
    setSchedSaving(true);
    await fetch("/api/email/scheduled-reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: schedEmail.trim(), frequency: schedFreq }),
    });
    setSchedSaving(false);
    setSchedEmail("");
    loadSchedules();
  };

  const deleteSchedule = async (id: string) => {
    await fetch("/api/email/scheduled-reports", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    loadSchedules();
  };

  const sendReport = async () => {
    if (!email.trim()) { setError("Enter an email address"); return; }
    setSending(true);
    setError("");
    setSuccess("");
    const res = await fetch("/api/email/send-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim() }),
    });
    const data = await res.json();
    setSending(false);
    if (data.error) setError(data.error);
    else setSuccess(`Report successfully sent to ${data.sentTo}`);
  };

  return (
    <div>
      <Header title="Email Reports" subtitle="Send Instagram performance reports directly to email" />
      <div className="p-6 space-y-5">

        {/* Send report card */}
        <div className="rounded-xl p-6" style={cardStyle}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${ACCENT}15` }}>
              <Mail className="w-5 h-5" style={{ color: ACCENT }} />
            </div>
            <div>
              <h2 className="font-bold" style={{ color: "var(--color-text)" }}>Send Report Now</h2>
              <p className="text-xs" style={{ color: "#A8967E" }}>Complete report with Instagram data from the last 30 days</p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#A8967E" }} />
              <input type="email" placeholder="email@client.com"
                value={email} onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendReport()}
                className="w-full pl-9 pr-4 py-3 text-sm rounded-xl focus:outline-none"
                style={{ border: "1px solid rgba(245,215,160,0.3)", backgroundColor: "var(--color-bg-secondary)", color: "var(--color-text)" }} />
            </div>
            <button type="button" onClick={sendReport} disabled={sending || !email.trim()}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold"
              style={{ backgroundColor: ACCENT, color: "#1C1814", opacity: sending ? 0.7 : 1 }}>
              <Send className="w-4 h-4" />
              {sending ? "Sending..." : "Send"}
            </button>
          </div>

          {success && (
            <div className="mt-3 flex items-center gap-2 p-3 rounded-lg" style={{ backgroundColor: "rgba(29,185,84,0.08)", border: "1px solid rgba(29,185,84,0.2)" }}>
              <CheckCircle2 className="w-4 h-4" style={{ color: "#1DB954" }} />
              <p className="text-sm font-semibold" style={{ color: "#1DB954" }}>{success}</p>
            </div>
          )}
          {error && (
            <div className="mt-3 flex items-start gap-2 p-3 rounded-lg" style={{ backgroundColor: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#EF4444" }} />
              <p className="text-sm" style={{ color: "#EF4444" }}>{error}</p>
            </div>
          )}
        </div>

        {/* What's in the report */}
        <div className="rounded-xl p-6" style={cardStyle}>
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-4 h-4" style={{ color: ACCENT }} />
            <h3 className="font-semibold text-sm" style={{ color: "var(--color-text)" }}>What's in the email report</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { label: "Total Followers", desc: "Current number of followers" },
              { label: "Engagement Rate", desc: "Average from last 20 posts" },
              { label: "Reach 30 days", desc: "Unique people who saw content" },
              { label: "Impressions 30 days", desc: "Total post views" },
              { label: "Best Post", desc: "Post with highest engagement" },
              { label: "Full Report Link", desc: "Direct dashboard access" },
            ].map(item => (
              <div key={item.label} className="flex items-start gap-2.5 p-3 rounded-lg" style={{ backgroundColor: "rgba(245,215,160,0.08)" }}>
                <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: ACCENT }} />
                <div>
                  <p className="text-xs font-semibold" style={{ color: "var(--color-text)" }}>{item.label}</p>
                  <p className="text-xs" style={{ color: "#A8967E" }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Automated scheduled reports */}
        <div className="rounded-xl p-6" style={cardStyle}>
          <div className="flex items-center gap-3 mb-4">
            <Clock className="w-4 h-4" style={{ color: ACCENT }} />
            <h3 className="font-semibold text-sm" style={{ color: "var(--color-text)" }}>Automated Reports</h3>
          </div>

          {/* Create new schedule */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <input type="email" placeholder="Recipient email"
              value={schedEmail} onChange={e => setSchedEmail(e.target.value)}
              className="flex-1 px-3 py-2.5 text-sm rounded-lg focus:outline-none"
              style={{ border: "1px solid rgba(200,180,150,0.25)", backgroundColor: "white", color: "#2D2620" }} />
            <div className="flex gap-2">
              {(["weekly", "monthly", "custom"] as const).map(f => (
                <button key={f} type="button" onClick={() => setSchedFreq(f)}
                  className={`px-3 py-2 text-xs font-semibold rounded-lg transition-all ${schedFreq === f ? "btn-3d-active" : "btn-3d"}`}>
                  {f === "weekly" ? "Weekly" : f === "monthly" ? "Monthly" : "Custom"}
                </button>
              ))}
            </div>
            <button type="button" onClick={saveSchedule} disabled={schedSaving || !schedEmail.trim()}
              className="btn-3d-active px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-40 flex items-center gap-2">
              <Power className="w-3.5 h-3.5" />
              {schedSaving ? "Saving..." : "Activate"}
            </button>
          </div>

          {/* Active schedules */}
          {schedules.length > 0 ? (
            <div className="space-y-2">
              {schedules.map(s => (
                <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg"
                  style={{ backgroundColor: "rgba(245,215,160,0.08)", border: "1px solid rgba(245,215,160,0.15)" }}>
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: s.active ? "#10B981" : "#A8967E" }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold" style={{ color: "var(--color-text)" }}>{s.email}</p>
                    <p className="text-xs" style={{ color: "#A8967E" }}>
                      {s.frequency === "weekly" ? "Every Monday at 09:00" : s.frequency === "monthly" ? "1st of each month" : "Custom schedule"}
                      {s.last_sent_at ? ` · Last sent: ${new Date(s.last_sent_at).toLocaleDateString()}` : ""}
                    </p>
                  </div>
                  <button type="button" onClick={() => deleteSchedule(s.id)}
                    className="p-1.5 rounded-lg transition-colors hover:bg-red-50" style={{ color: "#EF4444" }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-center py-3" style={{ color: "#A8967E" }}>
              No automated reports scheduled yet. Set one up above.
            </p>
          )}
        </div>

        <p className="text-xs text-center" style={{ color: "#C4AA8A" }}>
          Emails are sent via <strong>Resend</strong> — guaranteed delivery. Check Spam folder if not in Inbox.
        </p>
      </div>
    </div>
  );
}
