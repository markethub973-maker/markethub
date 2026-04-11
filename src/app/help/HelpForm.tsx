"use client";

import { useState } from "react";
import { Send, Loader2, CheckCircle2 } from "lucide-react";

const CATEGORIES = ["Bug report", "Feature request", "Billing question", "Integration help", "Other"] as const;

const card = { backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.4)", borderRadius: 12 };

export default function HelpForm() {
  const [category, setCategory] = useState<string>("Other");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim().length < 10) {
      setError("Message must be at least 10 characters");
      return;
    }
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, subject, message, email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to send. Please email us directly.");
        setSending(false);
        return;
      }
      setSent(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="rounded-xl p-6 text-center" style={card}>
        <CheckCircle2 className="w-10 h-10 mx-auto mb-3" style={{ color: "#10B981" }} />
        <p className="font-bold mb-1" style={{ color: "#292524" }}>Message sent!</p>
        <p className="text-sm" style={{ color: "#78614E" }}>We&apos;ll reply within 24 hours.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-xl p-5 space-y-4" style={card}>
      <div>
        <label className="block text-xs font-semibold mb-1.5" style={{ color: "#78614E" }}>Category</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none"
          style={{ border: "1px solid rgba(245,215,160,0.4)", backgroundColor: "#FFF8F0", color: "#292524" }}
        >
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold mb-1.5" style={{ color: "#78614E" }}>Subject (optional)</label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Brief summary"
          className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none"
          style={{ border: "1px solid rgba(245,215,160,0.4)", backgroundColor: "#FFF8F0", color: "#292524" }}
        />
      </div>

      <div>
        <label className="block text-xs font-semibold mb-1.5" style={{ color: "#78614E" }}>
          Your email <span style={{ color: "#A8967E", fontWeight: 400 }}>(so we can reply)</span>
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none"
          style={{ border: "1px solid rgba(245,215,160,0.4)", backgroundColor: "#FFF8F0", color: "#292524" }}
        />
      </div>

      <div>
        <label className="block text-xs font-semibold mb-1.5" style={{ color: "#78614E" }}>
          Message <span style={{ color: "#EF4444" }}>*</span>
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Describe your question or issue..."
          rows={5}
          required
          className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none resize-none"
          style={{ border: "1px solid rgba(245,215,160,0.4)", backgroundColor: "#FFF8F0", color: "#292524" }}
        />
      </div>

      {error && (
        <p className="text-sm" style={{ color: "#EF4444" }}>{error}</p>
      )}

      <button
        type="submit"
        disabled={sending || message.trim().length < 10}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-bold disabled:opacity-50"
        style={{ backgroundColor: "#F59E0B", color: "#1C1814" }}
      >
        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        {sending ? "Sending..." : "Send message"}
      </button>
    </form>
  );
}
