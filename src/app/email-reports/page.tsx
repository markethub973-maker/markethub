"use client";

import { useState } from "react";
import Header from "@/components/layout/Header";
import { Mail, Send, CheckCircle2, AlertCircle, FileText, Clock } from "lucide-react";

const cardStyle = { backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" };
const ACCENT = "#F59E0B";

export default function EmailReportsPage() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

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
              <h2 className="font-bold" style={{ color: "#292524" }}>Send Report Now</h2>
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
                style={{ border: "1px solid rgba(245,215,160,0.3)", backgroundColor: "#FFFCF7", color: "#292524" }} />
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
            <h3 className="font-semibold text-sm" style={{ color: "#292524" }}>What's in the email report</h3>
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
                  <p className="text-xs font-semibold" style={{ color: "#292524" }}>{item.label}</p>
                  <p className="text-xs" style={{ color: "#A8967E" }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Coming soon - scheduled reports */}
        <div className="rounded-xl p-6" style={{ ...cardStyle, opacity: 0.7 }}>
          <div className="flex items-center gap-3 mb-3">
            <Clock className="w-4 h-4" style={{ color: "#A8967E" }} />
            <h3 className="font-semibold text-sm" style={{ color: "#292524" }}>Automated Reports (Coming Soon)</h3>
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: "rgba(245,158,11,0.1)", color: ACCENT }}>
              Coming soon
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {["Weekly — every Monday", "Monthly — first day of month", "Custom — choose day and time"].map(opt => (
              <div key={opt} className="p-3 rounded-lg text-center" style={{ backgroundColor: "rgba(245,215,160,0.08)", border: "1px solid rgba(245,215,160,0.15)" }}>
                <p className="text-xs" style={{ color: "#A8967E" }}>{opt}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-center" style={{ color: "#C4AA8A" }}>
          Emails are sent via <strong>Resend</strong> — guaranteed delivery. Check Spam folder if not in Inbox.
        </p>
      </div>
    </div>
  );
}
