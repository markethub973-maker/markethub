"use client";

import { useEffect, useState } from "react";
import { Shield, Loader2, X } from "lucide-react";

interface Session {
  id: number;
  ends_at: string;
  rules: Record<string, boolean>;
}

export default function DelegateButton() {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [hours, setHours] = useState(2);
  const [loading, setLoading] = useState(false);
  const [rules, setRules] = useState({
    no_spending: true,
    approve_small_outreach: true,
    approve_content_drafts: true,
    block_pricing_changes: true,
    block_pivots: true,
  });

  const refresh = async () => {
    try {
      const r = await fetch("/api/brain/delegate");
      const d = await r.json();
      setSession(d.session ?? null);
    } catch { /* no-op */ }
  };
  useEffect(() => {
    void refresh();
    const iv = setInterval(refresh, 30000);
    return () => clearInterval(iv);
  }, []);

  const start = async () => {
    setLoading(true);
    await fetch("/api/brain/delegate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start", hours, rules }),
    });
    await refresh();
    setLoading(false);
    setOpen(false);
  };
  const stop = async () => {
    setLoading(true);
    await fetch("/api/brain/delegate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "stop" }),
    });
    await refresh();
    setLoading(false);
  };

  if (session) {
    const endsAt = new Date(session.ends_at);
    const mins = Math.max(0, Math.round((endsAt.getTime() - Date.now()) / 60000));
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold"
        style={{ backgroundColor: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.4)", color: "#10B981" }}>
        <Shield className="w-3.5 h-3.5" />
        Delegate activ · {Math.floor(mins / 60)}h {mins % 60}min rămase
        <button onClick={stop} disabled={loading} className="ml-2 opacity-70 hover:opacity-100">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "oprește"}
        </button>
      </div>
    );
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold"
        style={{ backgroundColor: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.4)", color: "#a78bfa" }}>
        <Shield className="w-3.5 h-3.5" /> Intră în Delegate Mode
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.7)" }}>
          <div className="max-w-md w-full rounded-2xl p-5" style={{ backgroundColor: "#14141B", border: "1px solid rgba(139,92,246,0.3)" }}>
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-5 h-5" style={{ color: "#a78bfa" }} />
              <p className="font-bold text-sm flex-1">Delegate Mode</p>
              <button onClick={() => setOpen(false)} className="opacity-60 hover:opacity-100"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-xs mb-4" style={{ color: "#aaa", lineHeight: 1.5 }}>
              AI-proxy-ul răspunde lui Alex în numele tău pentru perioada setată, folosind regulile de mai jos. Tot ce se întâmplă e logat. La întoarcere primești raport.
            </p>
            <label className="text-xs font-bold block mb-1" style={{ color: "#ccc" }}>Durată</label>
            <div className="flex gap-2 mb-4">
              {[0.5, 1, 2, 4, 8].map((h) => (
                <button key={h} type="button" onClick={() => setHours(h)}
                  className="text-xs px-3 py-1.5 rounded-md"
                  style={{
                    backgroundColor: hours === h ? "rgba(139,92,246,0.25)" : "rgba(255,255,255,0.05)",
                    border: `1px solid ${hours === h ? "rgba(139,92,246,0.5)" : "rgba(255,255,255,0.1)"}`,
                    color: hours === h ? "#a78bfa" : "#aaa",
                  }}>
                  {h < 1 ? "30min" : h === 1 ? "1h" : `${h}h`}
                </button>
              ))}
            </div>
            <label className="text-xs font-bold block mb-2" style={{ color: "#ccc" }}>Reguli</label>
            <div className="space-y-2 mb-4">
              {[
                { key: "no_spending", label: "BLOCHEAZĂ orice cheltuială (€0 buget)", critical: true },
                { key: "approve_small_outreach", label: "Aprobă outreach batch ≤25 domenii" },
                { key: "approve_content_drafts", label: "Aprobă copy/posts generate de Iris/Marcus" },
                { key: "block_pricing_changes", label: "Blochează orice modificare preț", critical: true },
                { key: "block_pivots", label: "Blochează schimbări de target market", critical: true },
              ].map((r) => (
                <label key={r.key} className="flex items-start gap-2 text-xs cursor-pointer" style={{ color: "#ddd" }}>
                  <input type="checkbox" checked={rules[r.key as keyof typeof rules]}
                    onChange={(e) => setRules((p) => ({ ...p, [r.key]: e.target.checked }))}
                    className="mt-0.5" />
                  <span style={{ color: r.critical ? "#F87171" : undefined }}>
                    {r.label}{r.critical ? " 🔒" : ""}
                  </span>
                </label>
              ))}
            </div>
            <p className="text-[10px] mb-3" style={{ color: "#888" }}>
              Deciziile mari (oferte {">"} €10K, pricing, hiring) → Alex te contactează pe Telegram oricum, nu proxy decide pentru tine.
            </p>
            <button type="button" onClick={start} disabled={loading}
              className="w-full py-2.5 rounded-lg font-bold text-sm disabled:opacity-60"
              style={{ backgroundColor: "#8B5CF6", color: "white" }}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : `Activează pentru ${hours < 1 ? "30min" : hours === 1 ? "1h" : hours + "h"}`}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
