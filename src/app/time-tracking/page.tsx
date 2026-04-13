"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import Header from "@/components/layout/Header";
import { Plus, Trash2, Clock, Play, Pause, DollarSign, Loader2, Check, X, BarChart3 } from "lucide-react";

interface Entry { id: string; client: string; project: string; description: string; hours: number; rate: number; date: string; billable: boolean; invoiced: boolean; }

const card = { backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", borderRadius: 12 };
const inp: React.CSSProperties = { border: "1px solid rgba(245,215,160,0.3)", backgroundColor: "white", color: "#292524", borderRadius: 8, padding: "8px 12px", fontSize: 14, outline: "none", width: "100%" };
const today = new Date().toISOString().slice(0, 10);
const curMonth = today.slice(0, 7);
const empty = { client: "", project: "", description: "", hours: 1, rate: 50, date: today, billable: true };

function fmtTime(seconds: number) {
  const h = Math.floor(seconds / 3600), m = Math.floor((seconds % 3600) / 60), s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function TimeTrackingPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [month, setMonth] = useState(curMonth);

  // Live timer
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerClient, setTimerClient] = useState("");
  const [timerDesc, setTimerDesc] = useState("");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const load = useCallback(() => {
    fetch(`/api/time-entries?month=${month}`).then(r => r.json())
      .then(d => { if (d.entries) setEntries(d.entries); }).finally(() => setLoading(false));
  }, [month]);
  useEffect(() => { load(); }, [load]);

  const startTimer = () => { setTimerRunning(true); intervalRef.current = setInterval(() => setTimerSeconds(s => s + 1), 1000); };
  const stopTimer = () => {
    setTimerRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timerSeconds > 60) {
      const hours = parseFloat((timerSeconds / 3600).toFixed(2));
      setForm(p => ({ ...p, client: timerClient, description: timerDesc, hours }));
      setShowForm(true);
    }
    setTimerSeconds(0);
  };

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, [k]: e.target.value }));

  const save = async () => {
    setSaving(true);
    const res = await fetch("/api/time-entries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const d = await res.json();
    if (d.entry) setEntries(p => [d.entry, ...p]);
    setShowForm(false); setForm(empty); setSaving(false);
  };

  const del = async (id: string) => {
    await fetch("/api/time-entries", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setEntries(p => p.filter(e => e.id !== id));
  };

  // Stats
  const totalHours = entries.reduce((s, e) => s + Number(e.hours), 0);
  const billableHours = entries.filter(e => e.billable).reduce((s, e) => s + Number(e.hours), 0);
  const totalEarnings = entries.filter(e => e.billable).reduce((s, e) => s + Number(e.hours) * Number(e.rate), 0);
  const clients = [...new Set(entries.map(e => e.client).filter(Boolean))];

  const byClient = clients.map(c => ({
    client: c,
    hours: entries.filter(e => e.client === c).reduce((s, e) => s + Number(e.hours), 0),
    earnings: entries.filter(e => e.client === c && e.billable).reduce((s, e) => s + Number(e.hours) * Number(e.rate), 0),
  }));

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FAFAF8" }}>
      <Header title="Time Tracking" subtitle="Track hours worked per client and generate reports" />
      <div className="p-4 max-w-4xl mx-auto space-y-4">

        {/* Live Timer */}
        <div className="rounded-2xl p-4" style={{ ...card, border: "1px solid rgba(99,102,241,0.2)" }}>
          <p className="text-xs font-semibold mb-3" style={{ color: "#6366F1" }}>⏱ Live timer</p>
          <div className="flex gap-2 flex-wrap items-center">
            <input value={timerClient} onChange={e => setTimerClient(e.target.value)} placeholder="Client" style={{ ...inp, maxWidth: 150 }} />
            <input value={timerDesc} onChange={e => setTimerDesc(e.target.value)} placeholder="What are you working on?" style={{ ...inp, flex: 1 }} />
            <div className="text-2xl font-mono font-bold shrink-0" style={{ color: timerRunning ? "#6366F1" : "#A8967E", minWidth: 90 }}>{fmtTime(timerSeconds)}</div>
            <button type="button" onClick={timerRunning ? stopTimer : startTimer}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold shrink-0"
              style={{ backgroundColor: timerRunning ? "#EF4444" : "#6366F1", color: "white" }}>
              {timerRunning ? <><Pause className="w-4 h-4" />Stop</> : <><Play className="w-4 h-4" />Start</>}
            </button>
          </div>
        </div>

        {/* KPIs + month selector */}
        <div className="flex gap-2 flex-wrap items-center">
          <input type="month" value={month} onChange={e => setMonth(e.target.value)} style={{ ...inp, maxWidth: 150 }} />
          {[
            { label: "Total hours", value: totalHours.toFixed(1) + "h", color: "#6366F1" },
            { label: "Billable", value: billableHours.toFixed(1) + "h", color: "#F59E0B" },
            { label: "Revenue", value: "$" + totalEarnings.toFixed(0), color: "#10B981" },
          ].map(s => (
            <div key={s.label} className="rounded-xl px-4 py-2.5 text-center" style={card}>
              <p className="text-base font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs" style={{ color: "#A8967E" }}>{s.label}</p>
            </div>
          ))}
          <button type="button" onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold ml-auto"
            style={{ background: "linear-gradient(135deg,#F59E0B,#D97706)", color: "#1C1814" }}>
            <Plus className="w-4 h-4" /> Add manual
          </button>
        </div>

        {/* Per client */}
        {byClient.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {byClient.map(c => (
              <div key={c.client} className="rounded-xl p-3" style={card}>
                <p className="font-bold text-sm truncate" style={{ color: "#292524" }}>{c.client}</p>
                <p className="text-xs mt-1" style={{ color: "#A8967E" }}>{c.hours.toFixed(1)}h · <span style={{ color: "#10B981" }}>${c.earnings.toFixed(0)}</span></p>
                <div className="mt-2 h-1.5 rounded-full" style={{ backgroundColor: "rgba(245,215,160,0.3)" }}>
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, (c.hours / totalHours) * 100)}%`, backgroundColor: "#F59E0B" }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Entries */}
        {loading ? <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "#F59E0B" }} /></div>
        : entries.length === 0 ? (
          <div className="rounded-2xl p-12 text-center" style={card}>
            <Clock className="w-8 h-8 mx-auto mb-3" style={{ color: "#C4AA8A" }} />
            <p className="text-sm" style={{ color: "#78614E" }}>No entries for the selected month</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl" style={card}>
            <table className="w-full text-xs min-w-[500px]">
              <thead><tr style={{ borderBottom: "1px solid rgba(245,215,160,0.2)" }}>
                {["Date", "Client", "Description", "Hours", "Rate", "Total", ""].map(h => (
                  <th key={h} className="text-left px-3 py-2.5 font-semibold" style={{ color: "#A8967E" }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {entries.map(e => (
                  <tr key={e.id} style={{ borderBottom: "1px solid rgba(245,215,160,0.1)" }} className="hover:bg-amber-50/30">
                    <td className="px-3 py-2.5" style={{ color: "#A8967E" }}>{e.date}</td>
                    <td className="px-3 py-2.5 font-semibold" style={{ color: "#292524" }}>{e.client || "—"}</td>
                    <td className="px-3 py-2.5 max-w-[200px] truncate" style={{ color: "#78614E" }}>{e.description || e.project || "—"}</td>
                    <td className="px-3 py-2.5 font-semibold" style={{ color: "#6366F1" }}>{Number(e.hours).toFixed(1)}h</td>
                    <td className="px-3 py-2.5" style={{ color: "#A8967E" }}>{e.billable ? `$${e.rate}/h` : "N/A"}</td>
                    <td className="px-3 py-2.5 font-semibold" style={{ color: "#10B981" }}>{e.billable ? `$${(Number(e.hours) * Number(e.rate)).toFixed(0)}` : "—"}</td>
                    <td className="px-3 py-2.5">
                      <button type="button" onClick={() => del(e.id)} className="p-1 rounded-lg" style={{ color: "#EF4444" }}><Trash2 className="w-3.5 h-3.5" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
          onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <div className="w-full md:max-w-md rounded-t-2xl md:rounded-2xl overflow-hidden" style={{ backgroundColor: "#FFFCF7" }}>
            <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: "1px solid rgba(245,215,160,0.3)", backgroundColor: "#FFF8F0" }}>
              <Clock className="w-4 h-4" style={{ color: "#F59E0B" }} />
              <p className="font-bold text-sm flex-1" style={{ color: "#292524" }}>Add entry</p>
              <button type="button" onClick={() => setShowForm(false)} style={{ color: "#78614E" }}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium mb-1" style={{ color: "#78614E" }}>Client</label><input value={form.client} onChange={f("client")} style={inp} /></div>
                <div><label className="block text-xs font-medium mb-1" style={{ color: "#78614E" }}>Date</label><input type="date" value={form.date} onChange={f("date")} style={inp} /></div>
                <div className="col-span-2"><label className="block text-xs font-medium mb-1" style={{ color: "#78614E" }}>Description</label><input value={form.description} onChange={f("description")} placeholder="What did you work on?" style={inp} /></div>
                <div><label className="block text-xs font-medium mb-1" style={{ color: "#78614E" }}>Hours</label><input type="number" step="0.25" value={form.hours} onChange={e => setForm(p => ({ ...p, hours: parseFloat(e.target.value) || 0 }))} style={inp} /></div>
                <div><label className="block text-xs font-medium mb-1" style={{ color: "#78614E" }}>Rate ($/h)</label><input type="number" value={form.rate} onChange={e => setForm(p => ({ ...p, rate: parseFloat(e.target.value) || 0 }))} style={inp} /></div>
                <div className="col-span-2 flex items-center gap-2">
                  <input type="checkbox" id="billable" checked={form.billable} onChange={e => setForm(p => ({ ...p, billable: e.target.checked }))} />
                  <label htmlFor="billable" className="text-sm" style={{ color: "#78614E" }}>Billable</label>
                  {form.billable && <span className="text-sm font-semibold ml-auto" style={{ color: "#10B981" }}>= ${(form.hours * form.rate).toFixed(2)}</span>}
                </div>
              </div>
              <button type="button" onClick={save} disabled={saving}
                className="w-full py-3 rounded-xl text-sm font-bold disabled:opacity-40 flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg,#F59E0B,#D97706)", color: "#1C1814" }}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
