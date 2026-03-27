"use client";
import { useState } from "react";

interface Client {
  id: string;
  name: string;
  igUsername: string;
  tiktokUsername: string;
  notes: string;
}

interface DigestResult {
  subject_line: string;
  headline: string;
  performance_badge: "excellent" | "strong" | "average" | "slow";
  top_3_wins: string[];
  key_metric: { label: string; value: string; context: string };
  content_spotlight: { title: string; why_it_worked: string };
  action_item: string;
  next_week_focus: string;
}

const BADGE_STYLE: Record<string, string> = {
  excellent: "bg-green-100 text-green-700 border-green-200",
  strong: "bg-emerald-100 text-emerald-700 border-emerald-200",
  average: "bg-amber-100 text-amber-700 border-amber-200",
  slow: "bg-red-100 text-red-700 border-red-200",
};

interface Props { clients: Client[] }

export default function WeeklyDigestPanel({ clients }: Props) {
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [customEmail, setCustomEmail] = useState("");
  const [platforms, setPlatforms] = useState<string[]>(["Instagram", "YouTube"]);
  const [week, setWeek] = useState(() => {
    const d = new Date();
    const start = new Date(d); start.setDate(d.getDate() - d.getDay() + 1);
    const end = new Date(start); end.setDate(start.getDate() + 6);
    return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  });
  const [highlights, setHighlights] = useState("");
  const [topContent, setTopContent] = useState("");

  const [digest, setDigest] = useState<DigestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const PLATFORM_OPTIONS = ["Instagram", "YouTube", "TikTok", "Facebook", "LinkedIn"];

  const togglePlatform = (p: string) =>
    setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);

  const toggleClient = (id: string) =>
    setSelectedClients(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const generateDigest = async () => {
    if (!platforms.length) return;
    setLoading(true);
    setError(null);
    setDigest(null);
    try {
      const res = await fetch("/api/ai/weekly-digest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platforms,
          week,
          highlights: highlights.split("\n").filter(Boolean),
          top_content: topContent.split("\n").filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || data.error || "Generation failed");
        return;
      }
      setDigest(data);
    } catch {
      setError("Failed to generate digest");
    } finally {
      setLoading(false);
    }
  };

  const sendDigest = async () => {
    if (!digest) return;
    const recipients = [
      ...selectedClients.map(id => clients.find(c => c.id === id)?.name).filter(Boolean),
      ...(customEmail ? [customEmail] : []),
    ];
    if (!recipients.length) {
      setError("Select at least one client or enter an email address");
      return;
    }
    setSending(true);
    setError(null);
    // In production: call /api/email/send-digest with recipients + digest content
    // For now: simulate send
    await new Promise(r => setTimeout(r, 1200));
    setSending(false);
    setSent(true);
    setTimeout(() => setSent(false), 3000);
  };

  return (
    <div className="space-y-4">
      {/* Config */}
      <div className="bg-white border border-[#E8D9C5] rounded-xl p-5">
        <h3 className="font-semibold text-[#292524] mb-4 flex items-center gap-2">
          <span>⚡</span> Weekly Digest Generator
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs text-[#78614E] block mb-1.5">Week</label>
            <input
              value={week}
              onChange={e => setWeek(e.target.value)}
              className="w-full text-sm px-3 py-2 border border-[#E8D9C5] rounded-lg focus:outline-none focus:border-[#F59E0B] bg-[#FFFCF7] text-[#292524]"
            />
          </div>
          <div>
            <label className="text-xs text-[#78614E] block mb-1.5">Platforms</label>
            <div className="flex flex-wrap gap-1.5">
              {PLATFORM_OPTIONS.map(p => (
                <button key={p} onClick={() => togglePlatform(p)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${platforms.includes(p) ? "bg-[#F59E0B] text-white border-[#F59E0B]" : "bg-white text-[#78614E] border-[#E8D9C5] hover:border-[#F59E0B]"}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs text-[#78614E] block mb-1">Top Highlights (one per line)</label>
            <textarea value={highlights} onChange={e => setHighlights(e.target.value)}
              rows={3} placeholder={"Reel reached 50K views\nInstagram follower growth +8%\nTikTok video went viral"}
              className="w-full text-sm px-3 py-2 border border-[#E8D9C5] rounded-lg focus:outline-none focus:border-[#F59E0B] bg-[#FFFCF7] text-[#292524] placeholder:text-[#C4AA8A] resize-none"
            />
          </div>
          <div>
            <label className="text-xs text-[#78614E] block mb-1">Top Content (one per line)</label>
            <textarea value={topContent} onChange={e => setTopContent(e.target.value)}
              rows={3} placeholder={"\"5 Morning Habits\" — 12K views\n\"Product Review\" — 8K likes"}
              className="w-full text-sm px-3 py-2 border border-[#E8D9C5] rounded-lg focus:outline-none focus:border-[#F59E0B] bg-[#FFFCF7] text-[#292524] placeholder:text-[#C4AA8A] resize-none"
            />
          </div>
        </div>

        <button onClick={generateDigest} disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-[#F59E0B] text-white hover:bg-[#D97706] disabled:opacity-50 transition-colors">
          {loading ? (
            <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>Generating...</>
          ) : "Generate Weekly Digest"}
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3">{error}</div>}

      {/* Digest Preview */}
      {digest && (
        <div className="bg-white border border-[#E8D9C5] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-[#292524]">Digest Preview</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${BADGE_STYLE[digest.performance_badge]}`}>
              {digest.performance_badge} week
            </span>
          </div>

          <div className="bg-[#292524] rounded-xl p-4">
            <p className="text-[#C4AA8A] text-xs mb-1">Subject line:</p>
            <p className="text-white font-semibold text-sm">{digest.subject_line}</p>
          </div>

          <div className="bg-[#FFFCF7] border border-[#F5D7A0]/50 rounded-xl p-4 space-y-3">
            <p className="text-[#292524] font-bold">{digest.headline}</p>

            <div>
              <p className="text-xs font-semibold text-[#292524] mb-1.5">🏆 Top 3 Wins</p>
              <ul className="space-y-1">
                {digest.top_3_wins.map((w, i) => (
                  <li key={i} className="text-xs text-[#78614E] flex gap-1.5">
                    <span className="text-[#F59E0B] shrink-0">{i + 1}.</span>{w}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white border border-[#E8D9C5] rounded-lg p-3">
              <p className="text-xs font-semibold text-[#292524] mb-0.5">📊 Key Metric: {digest.key_metric.label}</p>
              <p className="text-lg font-bold text-[#F59E0B]">{digest.key_metric.value}</p>
              <p className="text-xs text-[#78614E]">{digest.key_metric.context}</p>
            </div>

            {digest.content_spotlight && (
              <div>
                <p className="text-xs font-semibold text-[#292524] mb-1">🌟 Content Spotlight</p>
                <p className="text-xs text-[#78614E]"><strong>{digest.content_spotlight.title}</strong> — {digest.content_spotlight.why_it_worked}</p>
              </div>
            )}

            <div className="border-t border-[#E8D9C5] pt-3">
              <p className="text-xs font-semibold text-[#292524] mb-1">✅ Action this week:</p>
              <p className="text-xs text-[#78614E]">{digest.action_item}</p>
            </div>

            <div>
              <p className="text-xs font-semibold text-[#292524] mb-1">🎯 Next week focus:</p>
              <p className="text-xs text-[#78614E]">{digest.next_week_focus}</p>
            </div>
          </div>

          {/* Send section */}
          <div className="border-t border-[#E8D9C5] pt-4">
            <p className="text-xs font-semibold text-[#292524] mb-2">Send to clients:</p>
            {clients.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {clients.map(c => (
                  <button key={c.id} onClick={() => toggleClient(c.id)}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${selectedClients.includes(c.id) ? "bg-[#F59E0B] text-white border-[#F59E0B]" : "bg-white text-[#78614E] border-[#E8D9C5] hover:border-[#F59E0B]"}`}>
                    {c.name}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#C4AA8A] mb-2">No clients added yet — add clients in the Clients tab first.</p>
            )}

            <div className="flex gap-2">
              <input value={customEmail} onChange={e => setCustomEmail(e.target.value)}
                placeholder="Or enter email manually..."
                className="flex-1 text-sm px-3 py-2 border border-[#E8D9C5] rounded-lg focus:outline-none focus:border-[#F59E0B] bg-[#FFFCF7] text-[#292524]"
              />
              <button onClick={sendDigest} disabled={sending || sent}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${sent ? "bg-green-500 text-white" : "bg-[#292524] text-white hover:bg-[#3D2E1E]"} disabled:opacity-60`}>
                {sent ? "✅ Sent!" : sending ? "Sending..." : "Send Digest"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
