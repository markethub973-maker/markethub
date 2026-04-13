"use client";

import { useState, useEffect, useCallback } from "react";
import Header from "@/components/layout/Header";
import {
  Plus, Trash2, Edit3, Check, X, ExternalLink, Copy,
  DollarSign, Link2, TrendingUp, Loader2, Search, Tag,
} from "lucide-react";

interface AffiliateLink {
  id: string; name: string; platform: string; product: string;
  url: string; commission: number; category: string; clicks: number;
  active: boolean; notes: string; created_at: string;
}

const PLATFORMS = ["Amazon", "ShareASale", "CJ Affiliate", "ClickBank", "Impact", "Awin", "Rakuten", "Custom", "other"];
const card = { backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", borderRadius: 12 };
const inp = { border: "1px solid rgba(245,215,160,0.3)", backgroundColor: "white", color: "#292524", borderRadius: 8, padding: "8px 12px", fontSize: 14, outline: "none", width: "100%" };

function fmtDate(iso: string) { return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }

const emptyForm = { name: "", platform: "Amazon", product: "", url: "", commission: 0, category: "", notes: "" };

export default function AffiliatePage() {
  const [links, setLinks] = useState<AffiliateLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/affiliate").then(r => r.json())
      .then(d => { if (d.links) setLinks(d.links); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const openEdit = (link: AffiliateLink) => {
    setForm({ name: link.name, platform: link.platform, product: link.product, url: link.url, commission: link.commission, category: link.category, notes: link.notes });
    setEditId(link.id); setShowForm(true);
  };

  const save = async () => {
    if (!form.name.trim() || !form.url.trim()) return;
    setSaving(true);
    const res = await fetch("/api/affiliate", {
      method: editId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editId ? { id: editId, ...form } : form),
    });
    const d = await res.json();
    if (d.link) {
      if (editId) setLinks(p => p.map(l => l.id === editId ? d.link : l));
      else setLinks(p => [d.link, ...p]);
    }
    setShowForm(false); setEditId(null); setForm(emptyForm); setSaving(false);
  };

  const del = async (id: string) => {
    if (!confirm("Delete this link?")) return;
    await fetch("/api/affiliate", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setLinks(p => p.filter(l => l.id !== id));
  };

  const copyTracked = (id: string) => {
    const url = `${window.location.origin}/api/affiliate/click?id=${id}`;
    navigator.clipboard.writeText(url);
    setCopied(id); setTimeout(() => setCopied(null), 2000);
  };

  const filtered = links.filter(l =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.platform.toLowerCase().includes(search.toLowerCase()) ||
    l.product.toLowerCase().includes(search.toLowerCase()) ||
    l.category.toLowerCase().includes(search.toLowerCase())
  );

  const totalCommission = links.filter(l => l.active).reduce((s, l) => s + Number(l.commission), 0);
  const totalClicks = links.reduce((s, l) => s + l.clicks, 0);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FAFAF8" }}>
      <Header title="Affiliate Link Hub" subtitle="Manage affiliate links and track clicks" />

      <div className="p-4 max-w-4xl mx-auto space-y-4">

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total links", value: links.length, icon: Link2, color: "#6366F1" },
            { label: "Average commission", value: `${totalCommission > 0 ? (totalCommission / links.length).toFixed(1) : 0}%`, icon: DollarSign, color: "#F59E0B" },
            { label: "Total clicks", value: totalClicks, icon: TrendingUp, color: "#10B981" },
          ].map(s => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="rounded-xl p-3 text-center" style={card}>
                <Icon className="w-4 h-4 mx-auto mb-1" style={{ color: s.color }} />
                <p className="text-lg font-bold" style={{ color: s.color }}>{s.value}</p>
                <p className="text-xs" style={{ color: "#A8967E" }}>{s.label}</p>
              </div>
            );
          })}
        </div>

        {/* Search + Add */}
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 rounded-xl px-3" style={{ ...card }}>
            <Search className="w-4 h-4 shrink-0" style={{ color: "#C4AA8A" }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search links..."
              className="flex-1 py-2.5 text-sm bg-transparent outline-none" style={{ color: "#292524" }} />
          </div>
          <button type="button" onClick={() => { setShowForm(true); setEditId(null); setForm(emptyForm); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold"
            style={{ background: "linear-gradient(135deg,#F59E0B,#D97706)", color: "#1C1814" }}>
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "#F59E0B" }} /></div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl p-12 text-center" style={card}>
            <Link2 className="w-8 h-8 mx-auto mb-3" style={{ color: "#C4AA8A" }} />
            <p className="text-sm" style={{ color: "#78614E" }}>No affiliate links yet. Add your first one!</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl" style={card}>
            <table className="w-full text-xs min-w-[600px]">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(245,215,160,0.2)" }}>
                  {["Name", "Platform", "Product", "Commission", "Clicks", "Added", ""].map(h => (
                    <th key={h} className="text-left px-3 py-2.5 font-semibold" style={{ color: "#A8967E" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(link => (
                  <tr key={link.id} style={{ borderBottom: "1px solid rgba(245,215,160,0.1)" }}
                    className="hover:bg-amber-50/30 transition-colors">
                    <td className="px-3 py-2.5">
                      <p className="font-semibold" style={{ color: "#292524" }}>{link.name}</p>
                      {link.category && <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "rgba(245,158,11,0.1)", color: "#D97706" }}>{link.category}</span>}
                    </td>
                    <td className="px-3 py-2.5" style={{ color: "#78614E" }}>{link.platform}</td>
                    <td className="px-3 py-2.5" style={{ color: "#78614E" }}>{link.product || "—"}</td>
                    <td className="px-3 py-2.5 font-semibold" style={{ color: "#10B981" }}>{link.commission}%</td>
                    <td className="px-3 py-2.5 font-semibold" style={{ color: "#6366F1" }}>{link.clicks}</td>
                    <td className="px-3 py-2.5" style={{ color: "#A8967E" }}>{fmtDate(link.created_at)}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1 justify-end">
                        <button type="button" onClick={() => copyTracked(link.id)} title="Copy tracked link"
                          className="p-1.5 rounded-lg" style={{ backgroundColor: copied === link.id ? "rgba(16,185,129,0.1)" : "rgba(99,102,241,0.08)", color: copied === link.id ? "#10B981" : "#6366F1" }}>
                          {copied === link.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <a href={link.url} target="_blank" rel="noopener noreferrer"
                          className="p-1.5 rounded-lg" style={{ backgroundColor: "rgba(245,158,11,0.08)", color: "#D97706" }}>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        <button type="button" onClick={() => openEdit(link)}
                          className="p-1.5 rounded-lg" style={{ backgroundColor: "rgba(245,215,160,0.15)", color: "#78614E" }}>
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" onClick={() => del(link.id)}
                          className="p-1.5 rounded-lg" style={{ backgroundColor: "rgba(239,68,68,0.08)", color: "#EF4444" }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
          onClick={e => { if (e.target === e.currentTarget) { setShowForm(false); } }}>
          <div className="w-full md:max-w-lg rounded-t-2xl md:rounded-2xl overflow-hidden" style={{ backgroundColor: "#FFFCF7", maxHeight: "90dvh" }}>
            <div className="flex items-center gap-3 px-4 py-3 shrink-0" style={{ borderBottom: "1px solid rgba(245,215,160,0.3)", backgroundColor: "#FFF8F0" }}>
              <Tag className="w-4 h-4" style={{ color: "#F59E0B" }} />
              <p className="font-bold text-sm flex-1" style={{ color: "#292524" }}>{editId ? "Edit link" : "New affiliate link"}</p>
              <button type="button" onClick={() => setShowForm(false)} style={{ color: "#78614E" }}><X className="w-5 h-5" /></button>
            </div>
            <div className="overflow-y-auto p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium mb-1" style={{ color: "#78614E" }}>Name *</label>
                  <input value={form.name} onChange={f("name")} placeholder="e.g. Amazon Affiliate" style={inp} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "#78614E" }}>Platform</label>
                  <select value={form.platform} onChange={f("platform")} style={inp}>
                    {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "#78614E" }}>Commission (%)</label>
                  <input type="number" value={form.commission || ""} onChange={e => setForm(p => ({ ...p, commission: parseFloat(e.target.value) || 0 }))} placeholder="5" style={inp} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium mb-1" style={{ color: "#78614E" }}>Affiliate URL *</label>
                  <input value={form.url} onChange={f("url")} placeholder="https://..." style={inp} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "#78614E" }}>Product</label>
                  <input value={form.product} onChange={f("product")} placeholder="e.g. Canon Camera" style={inp} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "#78614E" }}>Category</label>
                  <input value={form.category} onChange={f("category")} placeholder="e.g. Tech" style={inp} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium mb-1" style={{ color: "#78614E" }}>Notes</label>
                  <textarea value={form.notes} onChange={f("notes")} rows={2} placeholder="Notes..." style={{ ...inp, resize: "none" } as any} />
                </div>
              </div>
              <button type="button" onClick={save} disabled={saving || !form.name.trim() || !form.url.trim()}
                className="w-full py-3 rounded-xl text-sm font-bold disabled:opacity-40 flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg,#F59E0B,#D97706)", color: "#1C1814" }}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {editId ? "Save" : "Add link"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
