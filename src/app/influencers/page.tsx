"use client";
import { useState, useEffect, useCallback } from "react";
import Header from "@/components/layout/Header";
import { Plus, Trash2, Edit3, Search, ExternalLink, Loader2, Users, Instagram, Zap, RefreshCw, X, Check, Mail } from "lucide-react";

interface Influencer { id: string; name: string; ig_username: string; tt_username: string; niche: string; followers_ig: number; followers_tt: number; engagement_ig: number; email: string; location: string; price_post: number; status: string; tags: string[]; notes: string; }

const card = { backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", borderRadius: 12 };
const inp: React.CSSProperties = { border: "1px solid rgba(245,215,160,0.3)", backgroundColor: "white", color: "#292524", borderRadius: 8, padding: "8px 12px", fontSize: 14, outline: "none", width: "100%" };
const STATUS_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  prospect: { bg: "rgba(99,102,241,0.1)", color: "#6366F1", label: "Prospect" },
  contacted: { bg: "rgba(245,158,11,0.1)", color: "#F59E0B", label: "Contacted" },
  partner: { bg: "rgba(16,185,129,0.1)", color: "#10B981", label: "Partner" },
  inactive: { bg: "rgba(100,116,139,0.1)", color: "#64748B", label: "Inactive" },
};
const fmt = (n: number) => n >= 1e6 ? (n/1e6).toFixed(1)+"M" : n >= 1e3 ? (n/1e3).toFixed(1)+"K" : String(n);
const empty = { name: "", ig_username: "", tt_username: "", niche: "", email: "", location: "", price_post: 0, status: "prospect", notes: "" };

export default function InfluencersPage() {
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [enriching, setEnriching] = useState(false);

  const load = useCallback(() => {
    fetch("/api/influencers").then(r => r.json()).then(d => { if (d.influencers) setInfluencers(d.influencers); }).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const save = async () => {
    setSaving(true);
    const res = await fetch("/api/influencers", { method: editId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editId ? { id: editId, ...form } : form) });
    const d = await res.json();
    if (d.influencer) { editId ? setInfluencers(p => p.map(x => x.id === editId ? d.influencer : x)) : setInfluencers(p => [d.influencer, ...p]); }
    setShowForm(false); setEditId(null); setForm(empty); setSaving(false);
  };

  const del = async (id: string) => {
    if (!confirm("Delete this influencer?")) return;
    await fetch("/api/influencers", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setInfluencers(p => p.filter(x => x.id !== id));
  };

  const openEdit = (inf: Influencer) => {
    setForm({ name: inf.name, ig_username: inf.ig_username, tt_username: inf.tt_username, niche: inf.niche, email: inf.email, location: inf.location, price_post: inf.price_post, status: inf.status, notes: inf.notes });
    setEditId(inf.id); setShowForm(true);
  };

  const filtered = influencers.filter(inf =>
    inf.name.toLowerCase().includes(search.toLowerCase()) ||
    inf.niche.toLowerCase().includes(search.toLowerCase()) ||
    inf.ig_username.toLowerCase().includes(search.toLowerCase())
  );

  const NICHES = ["Fashion", "Beauty", "Fitness", "Food", "Travel", "Tech", "Business", "Lifestyle", "Entertainment", "Education", "Gaming", "Parenting"];

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FAFAF8" }}>
      <Header title="Influencer Database" subtitle="Find and manage influencers for campaigns" />
      <div className="p-4 max-w-5xl mx-auto space-y-4">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total influencers", value: influencers.length, color: "#6366F1" },
            { label: "Active partners", value: influencers.filter(i => i.status === "partner").length, color: "#10B981" },
            { label: "Prospects", value: influencers.filter(i => i.status === "prospect").length, color: "#F59E0B" },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-3 text-center" style={card}>
              <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs" style={{ color: "#A8967E" }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Search + Add */}
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 rounded-xl px-3" style={card}>
            <Search className="w-4 h-4 shrink-0" style={{ color: "#C4AA8A" }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, niche, username..."
              className="flex-1 py-2.5 text-sm bg-transparent outline-none" style={{ color: "#292524" }} />
          </div>
          <button type="button" onClick={() => { setShowForm(true); setEditId(null); setForm(empty); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold"
            style={{ background: "linear-gradient(135deg,#F59E0B,#D97706)", color: "#1C1814" }}>
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>

        {/* Grid */}
        {loading ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "#F59E0B" }} /></div>
        : filtered.length === 0 ? (
          <div className="rounded-2xl p-12 text-center" style={card}>
            <Users className="w-8 h-8 mx-auto mb-3" style={{ color: "#C4AA8A" }} />
            <p className="text-sm" style={{ color: "#78614E" }}>No influencers added yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {filtered.map(inf => {
              const st = STATUS_COLORS[inf.status] ?? STATUS_COLORS.prospect;
              return (
                <div key={inf.id} className="rounded-xl p-4 space-y-3" style={card}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold text-sm" style={{ color: "#292524" }}>{inf.name}</p>
                      {inf.niche && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(245,158,11,0.1)", color: "#D97706" }}>{inf.niche}</span>}
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0" style={{ backgroundColor: st.bg, color: st.color }}>{st.label}</span>
                  </div>

                  {/* Social stats */}
                  <div className="flex gap-3">
                    {inf.ig_username && (
                      <div className="flex items-center gap-1">
                        <Instagram className="w-3 h-3" style={{ color: "#E1306C" }} />
                        <span className="text-xs font-semibold" style={{ color: "#292524" }}>{fmt(inf.followers_ig)}</span>
                        {inf.engagement_ig > 0 && <span className="text-[10px]" style={{ color: "#A8967E" }}>{inf.engagement_ig.toFixed(1)}%</span>}
                      </div>
                    )}
                    {inf.tt_username && (
                      <div className="flex items-center gap-1">
                        <Zap className="w-3 h-3" style={{ color: "#00F2EA" }} />
                        <span className="text-xs font-semibold" style={{ color: "#292524" }}>{fmt(inf.followers_tt)}</span>
                      </div>
                    )}
                    {inf.price_post > 0 && (
                      <span className="text-xs ml-auto font-semibold" style={{ color: "#10B981" }}>${inf.price_post}/post</span>
                    )}
                  </div>

                  {inf.location && <p className="text-xs" style={{ color: "#A8967E" }}>📍 {inf.location}</p>}

                  {/* Actions */}
                  <div className="flex gap-1 pt-1">
                    {inf.ig_username && (
                      <a href={`https://instagram.com/${inf.ig_username}`} target="_blank" rel="noopener noreferrer"
                        className="p-1.5 rounded-lg" style={{ backgroundColor: "rgba(225,48,108,0.08)", color: "#E1306C" }}>
                        <Instagram className="w-3.5 h-3.5" />
                      </a>
                    )}
                    {inf.email && (
                      <a href={`mailto:${inf.email}`} className="p-1.5 rounded-lg" style={{ backgroundColor: "rgba(99,102,241,0.08)", color: "#6366F1" }}>
                        <Mail className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button type="button" onClick={() => openEdit(inf)} className="p-1.5 rounded-lg ml-auto" style={{ backgroundColor: "rgba(245,158,11,0.08)", color: "#D97706" }}><Edit3 className="w-3.5 h-3.5" /></button>
                    <button type="button" onClick={() => del(inf.id)} className="p-1.5 rounded-lg" style={{ backgroundColor: "rgba(239,68,68,0.08)", color: "#EF4444" }}><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
          onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <div className="w-full md:max-w-lg rounded-t-2xl md:rounded-2xl overflow-hidden" style={{ backgroundColor: "#FFFCF7", maxHeight: "92dvh" }}>
            <div className="flex items-center gap-3 px-4 py-3 shrink-0" style={{ borderBottom: "1px solid rgba(245,215,160,0.3)", backgroundColor: "#FFF8F0" }}>
              <Users className="w-4 h-4" style={{ color: "#F59E0B" }} />
              <p className="font-bold text-sm flex-1" style={{ color: "#292524" }}>{editId ? "Edit influencer" : "New influencer"}</p>
              <button type="button" onClick={() => setShowForm(false)} style={{ color: "#78614E" }}><X className="w-5 h-5" /></button>
            </div>
            <div className="overflow-y-auto p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><label className="block text-xs font-medium mb-1" style={{ color: "#78614E" }}>Name *</label><input value={form.name} onChange={f("name")} style={inp} /></div>
                <div><label className="block text-xs font-medium mb-1" style={{ color: "#E1306C" }}>IG username</label><input value={form.ig_username} onChange={f("ig_username")} placeholder="@username" style={inp} /></div>
                <div><label className="block text-xs font-medium mb-1" style={{ color: "#00F2EA" }}>TikTok username</label><input value={form.tt_username} onChange={f("tt_username")} placeholder="@username" style={inp} /></div>
                <div><label className="block text-xs font-medium mb-1" style={{ color: "#78614E" }}>Niche</label>
                  <select value={form.niche} onChange={f("niche")} style={inp}>
                    <option value="">Select...</option>
                    {NICHES.map(n => <option key={n}>{n}</option>)}
                  </select>
                </div>
                <div><label className="block text-xs font-medium mb-1" style={{ color: "#78614E" }}>Status</label>
                  <select value={form.status} onChange={f("status")} style={inp}>
                    {Object.entries(STATUS_COLORS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div><label className="block text-xs font-medium mb-1" style={{ color: "#78614E" }}>Email</label><input value={form.email} onChange={f("email")} style={inp} /></div>
                <div><label className="block text-xs font-medium mb-1" style={{ color: "#78614E" }}>Location</label><input value={form.location} onChange={f("location")} placeholder="e.g. Bucharest" style={inp} /></div>
                <div><label className="block text-xs font-medium mb-1" style={{ color: "#10B981" }}>Price/post ($)</label><input type="number" value={form.price_post || ""} onChange={e => setForm(p => ({ ...p, price_post: parseFloat(e.target.value) || 0 }))} style={inp} /></div>
                <div className="col-span-2"><label className="block text-xs font-medium mb-1" style={{ color: "#78614E" }}>Notes</label><textarea value={form.notes} onChange={f("notes")} rows={2} style={{ ...inp, resize: "none" } as any} /></div>
              </div>
              {form.ig_username && !editId && <p className="text-xs" style={{ color: "#A8967E" }}>💡 IG data (followers, engagement) will be imported automatically on save</p>}
              <button type="button" onClick={save} disabled={saving || !form.name.trim()}
                className="w-full py-3 rounded-xl text-sm font-bold disabled:opacity-40 flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg,#F59E0B,#D97706)", color: "#1C1814" }}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {editId ? "Save" : "Add influencer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
