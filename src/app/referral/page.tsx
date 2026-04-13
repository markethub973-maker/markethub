"use client";
import { useState, useEffect } from "react";
import Header from "@/components/layout/Header";
import { Copy, Check, Mail, Gift, Users, TrendingUp, Loader2, Plus } from "lucide-react";

interface Referral { id: string; referee_email: string; status: string; reward_value: number; created_at: string; converted_at: string | null; }

const card = { backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", borderRadius: 12 };
const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: "Invited",   color: "#F59E0B", bg: "rgba(245,158,11,0.1)" },
  signed_up: { label: "Signed up", color: "#6366F1", bg: "rgba(99,102,241,0.1)" },
  converted: { label: "Converted", color: "#10B981", bg: "rgba(16,185,129,0.1)" },
};

export default function ReferralPage() {
  const [data, setData] = useState<{ code: string; referrals: Referral[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    fetch("/api/referral").then(r => r.json()).then(d => setData(d)).finally(() => setLoading(false));
  }, []);

  const copyCode = () => {
    if (!data?.code) return;
    navigator.clipboard.writeText(data.code);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const copyLink = () => {
    if (!data?.code) return;
    navigator.clipboard.writeText(`https://markethubpromo.com/register?ref=${data.code}`);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const invite = async () => {
    if (!email.trim()) return;
    setSending(true);
    const res = await fetch("/api/referral", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email.trim() }) });
    const d = await res.json();
    if (d.referral) { setData(prev => prev ? { ...prev, referrals: [d.referral, ...prev.referrals] } : prev); setSent(true); setEmail(""); setTimeout(() => setSent(false), 3000); }
    setSending(false);
  };

  const converted = data?.referrals.filter(r => r.status === "converted").length ?? 0;
  const totalReward = converted * 20;

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "#F59E0B" }} /></div>;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FAFAF8" }}>
      <Header title="Referral Program" subtitle="Invite colleagues and earn subscription discounts" />
      <div className="p-4 max-w-2xl mx-auto space-y-4">

        {/* Your code */}
        <div className="rounded-2xl p-5 text-center space-y-3" style={{ ...card, border: "1px solid rgba(245,158,11,0.25)" }}>
          <Gift className="w-8 h-8 mx-auto" style={{ color: "#F59E0B" }} />
          <p className="font-bold" style={{ color: "#292524" }}>Your referral code</p>
          <div className="flex items-center gap-2 justify-center">
            <code className="text-2xl font-bold tracking-widest px-4 py-2 rounded-xl"
              style={{ backgroundColor: "rgba(245,158,11,0.1)", color: "#D97706" }}>{data?.code}</code>
            <button type="button" onClick={copyCode} className="p-2 rounded-lg" style={{ backgroundColor: "rgba(245,158,11,0.1)", color: "#D97706" }}>
              {copied ? <Check className="w-4 h-4" style={{ color: "#10B981" }} /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <button type="button" onClick={copyLink} className="text-sm underline" style={{ color: "#A8967E" }}>
            Copy full sign-up link
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Invited", value: data?.referrals.length ?? 0, icon: Users, color: "#6366F1" },
            { label: "Converted", value: converted, icon: TrendingUp, color: "#10B981" },
            { label: "Reward total", value: `$${totalReward}`, icon: Gift, color: "#F59E0B" },
          ].map(s => { const Icon = s.icon; return (
            <div key={s.label} className="rounded-xl p-3 text-center" style={card}>
              <Icon className="w-4 h-4 mx-auto mb-1" style={{ color: s.color }} />
              <p className="text-lg font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs" style={{ color: "#A8967E" }}>{s.label}</p>
            </div>
          );})}
        </div>

        {/* How it works */}
        <div className="rounded-2xl p-4 space-y-2" style={{ ...card, border: "1px solid rgba(16,185,129,0.15)" }}>
          <p className="text-xs font-bold" style={{ color: "#10B981" }}>How it works</p>
          {["Share your code with a colleague", "They sign up with your code and get 20% off", "You earn $20 credit for every conversion"].map((s, i) => (
            <div key={i} className="flex items-start gap-2 text-xs" style={{ color: "#78614E" }}>
              <span className="font-bold shrink-0" style={{ color: "#10B981" }}>{i+1}.</span> {s}
            </div>
          ))}
        </div>

        {/* Invite form */}
        <div className="rounded-2xl p-4 space-y-3" style={card}>
          <p className="text-sm font-bold" style={{ color: "#292524" }}>Invite via email</p>
          <div className="flex gap-2">
            <input value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && invite()}
              placeholder="email@example.com"
              className="flex-1 rounded-xl px-3 py-2.5 text-sm outline-none"
              style={{ border: "1px solid rgba(245,215,160,0.3)", backgroundColor: "white", color: "#292524" }} />
            <button type="button" onClick={invite} disabled={sending || !email.trim()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40"
              style={{ background: "linear-gradient(135deg,#F59E0B,#D97706)", color: "#1C1814" }}>
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : sent ? <Check className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
              {sent ? "Sent!" : "Invite"}
            </button>
          </div>
        </div>

        {/* Referrals list */}
        {(data?.referrals.length ?? 0) > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold px-1" style={{ color: "#A8967E" }}>Your invites</p>
            {data?.referrals.map(r => {
              const st = STATUS[r.status] ?? STATUS.pending;
              return (
                <div key={r.id} className="rounded-xl px-4 py-3 flex items-center gap-3" style={card}>
                  <Mail className="w-4 h-4 shrink-0" style={{ color: "#C4AA8A" }} />
                  <p className="text-sm flex-1 truncate" style={{ color: "#292524" }}>{r.referee_email}</p>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0"
                    style={{ backgroundColor: st.bg, color: st.color }}>{st.label}</span>
                  {r.status === "converted" && <span className="text-xs font-bold shrink-0" style={{ color: "#10B981" }}>+$20</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
