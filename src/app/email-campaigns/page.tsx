"use client";
import { useState, useEffect, useCallback } from "react";
import Header from "@/components/layout/Header";
import { Plus, Trash2, Edit3, Send, Loader2, Mail, Check, X, Users } from "lucide-react";

interface Campaign { id: string; name: string; subject: string; body_html: string; recipients: string[]; status: string; sent_count: number; notes: string; created_at: string; sent_at: string | null; }

const card = { backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", borderRadius: 12 };
const inp: React.CSSProperties = { border: "1px solid rgba(245,215,160,0.3)", backgroundColor: "white", color: "#292524", borderRadius: 8, padding: "8px 12px", fontSize: 14, outline: "none", width: "100%" };
const STATUS_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  draft:   { bg: "rgba(100,116,139,0.1)", color: "#64748B", label: "Draft" },
  sending: { bg: "rgba(99,102,241,0.1)",  color: "#6366F1", label: "Sending..." },
  sent:    { bg: "rgba(16,185,129,0.1)",  color: "#10B981", label: "Sent" },
  failed:  { bg: "rgba(239,68,68,0.08)", color: "#EF4444", label: "Error" },
};
const fmtDate = (s: string) => new Date(s).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
const emptyForm = { name: "", subject: "", body_html: "", recipients_text: "", notes: "" };

const TEMPLATES = [
  { label: "Monthly newsletter", subject: "Social media news — {{month}}", body: `<h2>Hi {{name}}!</h2><p>Here are the most important social media updates this month:</p><ul><li>...</li><li>...</li></ul><p>Best regards,<br>MarketHub Pro Team</p>` },
  { label: "Performance report", subject: "Monthly performance report — {{client}}", body: `<h2>Monthly Report</h2><p>Dear {{client}},</p><p>Here are this month's results:</p><ul><li><strong>New followers:</strong> +...</li><li><strong>Total reach:</strong> ...</li><li><strong>Engagement:</strong> ...%</li></ul><p>Best regards,<br>Your social media team</p>` },
  { label: "Promotional offer", subject: "Special offer for you 🎁", body: `<h2>Exclusive Offer</h2><p>Hi,</p><p>We'd like to invite you to take advantage of our special offer:</p><div style="background:#FFF8F0;border-left:4px solid #F59E0B;padding:16px;margin:16px 0"><strong>20% discount</strong> on the Social Media Pro package</div><p>This offer is valid until {{date}}.</p>` },
];

export default function EmailCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState(false);

  const load = useCallback(() => {
    fetch("/api/email-campaigns").then(r => r.json()).then(d => { if (d.campaigns) setCampaigns(d.campaigns); }).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(p => ({ ...p, [k]: e.target.value }));

  const parseRecipients = (text: string) => text.split(/[\n,;]+/).map(e => e.trim()).filter(e => e.includes("@"));

  const save = async () => {
    setSaving(true);
    const payload = { name: form.name, subject: form.subject, body_html: form.body_html, recipients: parseRecipients(form.recipients_text), notes: form.notes };
    const res = await fetch("/api/email-campaigns", { method: editId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editId ? { id: editId, ...payload } : payload) });
    const d = await res.json();
    if (d.campaign) editId ? setCampaigns(p => p.map(x => x.id === editId ? d.campaign : x)) : setCampaigns(p => [d.campaign, ...p]);
    setShowForm(false); setEditId(null); setForm(emptyForm); setSaving(false);
  };

  const send = async (camp: Campaign) => {
    if (!camp.recipients?.length) { alert("Add recipients before sending"); return; }
    if (!confirm(`Send campaign to ${camp.recipients.length} recipients?`)) return;
    setSendingId(camp.id);
    const res = await fetch("/api/email-campaigns", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: camp.id, action: "send" }) });
    const d = await res.json();
    if (d.ok) setCampaigns(p => p.map(x => x.id === camp.id ? { ...x, status: "sent", sent_count: d.sent } : x));
    setSendingId(null);
  };

  const del = async (id: string) => {
    if (!confirm("Delete this campaign?")) return;
    await fetch("/api/email-campaigns", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setCampaigns(p => p.filter(x => x.id !== id));
  };

  const openEdit = (c: Campaign) => {
    setForm({ name: c.name, subject: c.subject, body_html: c.body_html, recipients_text: c.recipients.join("\n"), notes: c.notes });
    setEditId(c.id); setShowForm(true);
  };

  const applyTemplate = (tpl: typeof TEMPLATES[0]) => setForm(p => ({ ...p, subject: tpl.subject, body_html: tpl.body }));

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FAFAF8" }}>
      <Header title="Email Campaigns" subtitle="Create and send email campaigns directly from the platform" />
      <div className="p-4 max-w-4xl mx-auto space-y-4">

        <button type="button" onClick={() => { setShowForm(true); setEditId(null); setForm(emptyForm); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold"
          style={{ background: "linear-gradient(135deg,#F59E0B,#D97706)", color: "#1C1814" }}>
          <Plus className="w-4 h-4" /> New campaign
        </button>

        {loading ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "#F59E0B" }} /></div>
        : campaigns.length === 0 ? (
          <div className="rounded-2xl p-12 text-center" style={card}>
            <Mail className="w-8 h-8 mx-auto mb-3" style={{ color: "#C4AA8A" }} />
            <p className="text-sm" style={{ color: "#78614E" }}>No email campaigns created yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {campaigns.map(c => {
              const st = STATUS_COLORS[c.status] ?? STATUS_COLORS.draft;
              return (
                <div key={c.id} className="rounded-xl p-4 flex items-center gap-3" style={card}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-sm" style={{ color: "#292524" }}>{c.name}</p>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: st.bg, color: st.color }}>{st.label}</span>
                    </div>
                    <p className="text-xs mt-0.5 truncate" style={{ color: "#78614E" }}>{c.subject}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: "#A8967E" }}>
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" />{c.recipients?.length ?? 0} recipients</span>
                      {c.status === "sent" && <span style={{ color: "#10B981" }}>✓ {c.sent_count} trimise</span>}
                      {c.sent_at && <span>{fmtDate(c.sent_at)}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {c.status === "draft" && (
                      <button type="button" onClick={() => send(c)} disabled={sendingId === c.id} title="Send"
                        className="p-1.5 rounded-lg" style={{ backgroundColor: "rgba(16,185,129,0.08)", color: "#10B981" }}>
                        {sendingId === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      </button>
                    )}
                    <button type="button" onClick={() => openEdit(c)} className="p-1.5 rounded-lg" style={{ backgroundColor: "rgba(245,158,11,0.08)", color: "#D97706" }}><Edit3 className="w-3.5 h-3.5" /></button>
                    <button type="button" onClick={() => del(c.id)} className="p-1.5 rounded-lg" style={{ backgroundColor: "rgba(239,68,68,0.08)", color: "#EF4444" }}><Trash2 className="w-3.5 h-3.5" /></button>
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
          <div className="w-full md:max-w-2xl rounded-t-2xl md:rounded-2xl overflow-hidden" style={{ backgroundColor: "#FFFCF7", maxHeight: "92dvh" }}>
            <div className="flex items-center gap-3 px-4 py-3 shrink-0" style={{ borderBottom: "1px solid rgba(245,215,160,0.3)", backgroundColor: "#FFF8F0" }}>
              <Mail className="w-4 h-4" style={{ color: "#F59E0B" }} />
              <p className="font-bold text-sm flex-1" style={{ color: "#292524" }}>{editId ? "Edit campaign" : "New campaign"}</p>
              <button type="button" onClick={() => setPreviewHtml(v => !v)} className="text-xs px-2 py-1 rounded-lg" style={{ color: "#6366F1", backgroundColor: "rgba(99,102,241,0.08)" }}>
                {previewHtml ? "Editor" : "Preview"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} style={{ color: "#78614E" }}><X className="w-5 h-5" /></button>
            </div>
            <div className="overflow-y-auto p-4 space-y-3">
              {/* Templates */}
              {!editId && (
                <div>
                  <p className="text-xs font-medium mb-2" style={{ color: "#78614E" }}>Template-uri rapide</p>
                  <div className="flex gap-2 flex-wrap">
                    {TEMPLATES.map(t => (
                      <button key={t.label} type="button" onClick={() => applyTemplate(t)}
                        className="text-xs px-3 py-1.5 rounded-lg transition-all"
                        style={{ backgroundColor: "rgba(245,158,11,0.1)", color: "#D97706", border: "1px solid rgba(245,158,11,0.2)" }}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div><label className="block text-xs font-medium mb-1" style={{ color: "#78614E" }}>Nume campanie *</label><input value={form.name} onChange={f("name")} placeholder="ex: Newsletter Aprilie 2026" style={inp} /></div>
              <div><label className="block text-xs font-medium mb-1" style={{ color: "#78614E" }}>Subiect email *</label><input value={form.subject} onChange={f("subject")} placeholder="Subiectul emailului" style={inp} /></div>

              {previewHtml ? (
                <div>
                  <p className="text-xs font-medium mb-1" style={{ color: "#78614E" }}>Preview HTML</p>
                  <div className="rounded-xl overflow-hidden border" style={{ borderColor: "rgba(245,215,160,0.3)", height: 300 }}>
                    <iframe srcDoc={form.body_html} className="w-full h-full" title="Email preview" />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "#78614E" }}>Conținut HTML *</label>
                  <textarea value={form.body_html} onChange={f("body_html")} rows={8}
                    placeholder="<h2>Bună,</h2><p>Conținutul emailului...</p>"
                    className="w-full rounded-lg px-3 py-2.5 text-xs outline-none resize-none font-mono"
                    style={{ border: "1px solid rgba(245,215,160,0.3)", backgroundColor: "white", color: "#292524" }} />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "#78614E" }}>Destinatari (email-uri separate prin Enter sau virgulă)</label>
                <textarea value={form.recipients_text} onChange={f("recipients_text")} rows={3}
                  placeholder="email1@exemplu.com&#10;email2@exemplu.com"
                  className="w-full rounded-lg px-3 py-2.5 text-sm outline-none resize-none"
                  style={{ border: "1px solid rgba(245,215,160,0.3)", backgroundColor: "white", color: "#292524" }} />
                <p className="text-[10px] mt-1" style={{ color: "#A8967E" }}>{parseRecipients(form.recipients_text).length} recipients detected</p>
              </div>

              <button type="button" onClick={save} disabled={saving || !form.name.trim() || !form.subject.trim()}
                className="w-full py-3 rounded-xl text-sm font-bold disabled:opacity-40 flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg,#F59E0B,#D97706)", color: "#1C1814" }}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {editId ? "Save" : "Create campaign"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
