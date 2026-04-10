"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft, Plus, Search, X, Edit3, Trash2, Check,
  DollarSign, FileText, Rocket, Loader2, ChevronRight,
  User, Mail, Phone, Calendar, CheckSquare, Square,
  Bell, Download, AlertCircle,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

type View = "home" | "finance" | "contracts" | "onboarding" | "edit_client" | "edit_contract" | "edit_onboarding";

interface Client {
  id: string; name: string; company: string; email: string; phone: string;
  service: string; monthly_value: number; status: string; start_date: string; notes: string;
  payment_status: string; last_invoice_date: string; next_invoice_date: string;
}
interface Contract {
  id: string; client_name: string; type: string; value: number;
  signed: boolean; signed_at: string; expires_at: string; file_url: string; notes: string;
}
interface Onboarding {
  id: string; client_name: string; ig_username: string; ig_password: string;
  fb_email: string; tiktok_user: string; brand_colors: string; target_audience: string;
  content_pillars: string; posting_freq: string; goals: string;
  step_contract: boolean; step_access: boolean; step_briefing: boolean;
  step_calendar: boolean; step_first_post: boolean; notes: string;
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const card = { backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", borderRadius: 12 };
const inp = { border: "1px solid rgba(245,215,160,0.3)", backgroundColor: "white", color: "#292524", borderRadius: 8 };
const STATUS_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  active:   { bg: "rgba(16,185,129,0.1)", color: "#10B981", label: "Activ" },
  paused:   { bg: "rgba(245,158,11,0.1)", color: "#F59E0B", label: "Pauză" },
  ended:    { bg: "rgba(239,68,68,0.08)", color: "#EF4444", label: "Încheiat" },
  prospect: { bg: "rgba(99,102,241,0.1)", color: "#6366F1", label: "Prospect" },
};

function fmtCurrency(n: number) { return "$" + (n || 0).toLocaleString("en-US", { minimumFractionDigits: 0 }); }
function fmtDate(s: string) { return s ? new Date(s).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"; }
function stepsComplete(o: Onboarding) {
  return [o.step_contract, o.step_access, o.step_briefing, o.step_calendar, o.step_first_post].filter(Boolean).length;
}

// ── Search bar ─────────────────────────────────────────────────────────────────

function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2 rounded-xl px-3 mb-3" style={{ ...card, border: "1px solid rgba(245,215,160,0.3)" }}>
      <Search className="w-4 h-4 shrink-0" style={{ color: "#C4AA8A" }} />
      <input value={value} onChange={e => onChange(e.target.value)} placeholder="Caută..."
        className="flex-1 py-2.5 text-sm bg-transparent outline-none" style={{ color: "#292524" }} />
      {value && <button type="button" onClick={() => onChange("")} style={{ color: "#C4AA8A" }}><X className="w-4 h-4" /></button>}
    </div>
  );
}

// ── Finance view ───────────────────────────────────────────────────────────────

const PAYMENT_STATUS: Record<string, { bg: string; color: string; label: string }> = {
  paid:    { bg: "rgba(16,185,129,0.1)", color: "#10B981", label: "Plătit" },
  pending: { bg: "rgba(245,158,11,0.1)", color: "#F59E0B", label: "Pending" },
  overdue: { bg: "rgba(239,68,68,0.08)", color: "#EF4444", label: "Restant" },
};

function FinanceView({ onEdit }: { onEdit: (c: Client | null) => void }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [notifying, setNotifying] = useState<string | null>(null);
  const [generatingInvoice, setGeneratingInvoice] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/business/clients").then(r => r.json())
      .then(d => { if (d.clients) setClients(d.clients); }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const del = async (id: string) => {
    if (!confirm("Ștergi clientul?")) return;
    await fetch("/api/admin/business/clients", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setClients(prev => prev.filter(c => c.id !== id));
  };

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.company.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  const totalMRR = clients.filter(c => c.status === "active").reduce((s, c) => s + Number(c.monthly_value), 0);
  const overdueCount = clients.filter(c => c.payment_status === "overdue").length;

  const sendReminder = async (clientId: string) => {
    setNotifying(clientId);
    await fetch("/api/admin/business/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: clientId, type: "overdue_reminder" }),
    });
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, payment_status: "overdue" } : c));
    setNotifying(null);
  };

  const downloadInvoice = async (clientId: string, clientName: string) => {
    setGeneratingInvoice(clientId);
    const res = await fetch(`/api/admin/business/invoice?client_id=${clientId}`);
    const { invoice } = await res.json();
    // Generate printable HTML invoice
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Invoice ${invoice.number}</title>
    <style>body{font-family:Arial,sans-serif;max-width:700px;margin:40px auto;padding:40px;color:#292524}
    h1{color:#F59E0B;margin:0}.header{display:flex;justify-content:space-between;margin-bottom:40px}
    .agency{text-align:right;font-size:13px;color:#78614E}table{width:100%;border-collapse:collapse;margin:24px 0}
    th{text-align:left;padding:8px 12px;background:#FFF8F0;font-size:12px;color:#A8967E;border-bottom:2px solid #F5D7A0}
    td{padding:8px 12px;border-bottom:1px solid rgba(245,215,160,0.3);font-size:13px}
    .total{text-align:right;margin-top:16px;font-size:18px;font-weight:bold;color:#F59E0B}
    .badge{display:inline-block;padding:2px 8px;border-radius:20px;background:rgba(245,158,11,0.1);color:#D97706;font-size:11px}</style>
    </head><body>
    <div class="header">
      <div><h1>INVOICE</h1><p class="badge">${invoice.number}</p></div>
      <div class="agency">
        <strong>${invoice.agency.name}</strong><br>${invoice.agency.email}<br>${invoice.agency.website}
      </div>
    </div>
    <div style="display:flex;justify-content:space-between;margin-bottom:32px">
      <div><strong>Bill to:</strong><br>${invoice.client.name}${invoice.client.company ? `<br>${invoice.client.company}` : ""}${invoice.client.email ? `<br>${invoice.client.email}` : ""}</div>
      <div style="text-align:right;font-size:13px;color:#78614E">
        <strong>Invoice date:</strong> ${invoice.date}<br>
        <strong>Due date:</strong> ${invoice.due_date}
      </div>
    </div>
    <table><thead><tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
    <tbody>${invoice.items.map((i: any) => `<tr><td>${i.description}</td><td>${i.quantity}</td><td>$${i.unit_price.toFixed(2)}</td><td>$${i.total.toFixed(2)}</td></tr>`).join("")}
    </tbody></table>
    <div class="total">Total: $${invoice.total.toFixed(2)} ${invoice.currency}</div>
    <p style="margin-top:32px;font-size:12px;color:#A8967E">${invoice.notes}</p>
    </body></html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${invoice.number}_${clientName.replace(/\s+/g, "_")}.html`;
    a.click(); URL.revokeObjectURL(url);
    setGeneratingInvoice(null);
  };

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { label: "Clienți activi", value: clients.filter(c => c.status === "active").length, color: "#10B981" },
          { label: "MRR total", value: fmtCurrency(totalMRR), color: "#F59E0B" },
          { label: "Restanți", value: overdueCount, color: overdueCount > 0 ? "#EF4444" : "#A8967E" },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-3 text-center" style={card}>
            <p className="text-lg font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs" style={{ color: "#A8967E" }}>{s.label}</p>
          </div>
        ))}
      </div>

      <SearchBar value={search} onChange={setSearch} />

      <button type="button" onClick={() => onEdit(null)}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold mb-3"
        style={{ background: "linear-gradient(135deg,#F59E0B,#D97706)", color: "#1C1814" }}>
        <Plus className="w-4 h-4" /> Client nou
      </button>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "#F59E0B" }} /></div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-center py-8" style={{ color: "#A8967E" }}>Niciun client găsit</p>
      ) : (
        <div className="overflow-x-auto rounded-xl" style={card}>
          <table className="w-full text-xs min-w-[480px]">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(245,215,160,0.2)" }}>
                {["Client", "Serviciu", "MRR", "Status", ""].map(h => (
                  <th key={h} className="text-left px-3 py-2.5 font-semibold" style={{ color: "#A8967E" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const st = STATUS_COLORS[c.status] ?? STATUS_COLORS.active;
                return (
                  <tr key={c.id} style={{ borderBottom: "1px solid rgba(245,215,160,0.1)" }}
                    className="hover:bg-amber-50/30 transition-colors">
                    <td className="px-3 py-2.5">
                      <p className="font-semibold" style={{ color: "#292524" }}>{c.name}</p>
                      {c.company && <p className="text-[10px]" style={{ color: "#A8967E" }}>{c.company}</p>}
                    </td>
                    <td className="px-3 py-2.5" style={{ color: "#78614E" }}>{c.service || "—"}</td>
                    <td className="px-3 py-2.5 font-semibold" style={{ color: "#F59E0B" }}>{fmtCurrency(c.monthly_value)}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-col gap-0.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold w-fit"
                          style={{ backgroundColor: st.bg, color: st.color }}>{st.label}</span>
                        {c.payment_status && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold w-fit"
                            style={{ backgroundColor: PAYMENT_STATUS[c.payment_status]?.bg, color: PAYMENT_STATUS[c.payment_status]?.color }}>
                            {PAYMENT_STATUS[c.payment_status]?.label ?? c.payment_status}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1 justify-end">
                        <button type="button" onClick={() => downloadInvoice(c.id, c.name)}
                          disabled={generatingInvoice === c.id} title="Download Invoice"
                          className="p-1.5 rounded-lg" style={{ backgroundColor: "rgba(99,102,241,0.08)", color: "#6366F1" }}>
                          {generatingInvoice === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                        </button>
                        {c.email && (
                          <button type="button" onClick={() => sendReminder(c.id)}
                            disabled={notifying === c.id} title="Send payment reminder"
                            className="p-1.5 rounded-lg"
                            style={{ backgroundColor: c.payment_status === "overdue" ? "rgba(239,68,68,0.08)" : "rgba(245,158,11,0.08)", color: c.payment_status === "overdue" ? "#EF4444" : "#F59E0B" }}>
                            {notifying === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5" />}
                          </button>
                        )}
                        <button type="button" onClick={() => onEdit(c)}
                          className="p-1.5 rounded-lg" style={{ backgroundColor: "rgba(245,158,11,0.1)", color: "#D97706" }}>
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" onClick={() => del(c.id)}
                          className="p-1.5 rounded-lg" style={{ backgroundColor: "rgba(239,68,68,0.08)", color: "#EF4444" }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Contracts view ─────────────────────────────────────────────────────────────

function ContractsView({ onEdit }: { onEdit: (c: Contract | null) => void }) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/admin/business/contracts").then(r => r.json())
      .then(d => { if (d.contracts) setContracts(d.contracts); }).finally(() => setLoading(false));
  }, []);

  const del = async (id: string) => {
    if (!confirm("Ștergi contractul?")) return;
    await fetch("/api/admin/business/contracts", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setContracts(prev => prev.filter(c => c.id !== id));
  };

  const filtered = contracts.filter(c =>
    c.client_name.toLowerCase().includes(search.toLowerCase()) ||
    c.type.toLowerCase().includes(search.toLowerCase())
  );

  const TYPE_LABELS: Record<string, string> = { retainer: "Retainer", project: "Proiect", "one-time": "One-time", nda: "NDA", other: "Altul" };

  return (
    <div>
      <SearchBar value={search} onChange={setSearch} />
      <button type="button" onClick={() => onEdit(null)}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold mb-3"
        style={{ background: "linear-gradient(135deg,#F59E0B,#D97706)", color: "#1C1814" }}>
        <Plus className="w-4 h-4" /> Contract nou
      </button>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "#F59E0B" }} /></div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-center py-8" style={{ color: "#A8967E" }}>Niciun contract</p>
      ) : (
        <div className="overflow-x-auto rounded-xl" style={card}>
          <table className="w-full text-xs min-w-[480px]">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(245,215,160,0.2)" }}>
                {["Client", "Tip", "Valoare", "Semnat", "Expiră", ""].map(h => (
                  <th key={h} className="text-left px-3 py-2.5 font-semibold" style={{ color: "#A8967E" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} style={{ borderBottom: "1px solid rgba(245,215,160,0.1)" }}
                  className="hover:bg-amber-50/30 transition-colors">
                  <td className="px-3 py-2.5 font-semibold" style={{ color: "#292524" }}>{c.client_name}</td>
                  <td className="px-3 py-2.5" style={{ color: "#78614E" }}>{TYPE_LABELS[c.type] ?? c.type}</td>
                  <td className="px-3 py-2.5 font-semibold" style={{ color: "#F59E0B" }}>{fmtCurrency(c.value)}</td>
                  <td className="px-3 py-2.5">
                    {c.signed
                      ? <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: "rgba(16,185,129,0.1)", color: "#10B981" }}>✓ Da</span>
                      : <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: "rgba(239,68,68,0.08)", color: "#EF4444" }}>✗ Nu</span>}
                  </td>
                  <td className="px-3 py-2.5" style={{ color: "#78614E" }}>{fmtDate(c.expires_at)}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-1 justify-end">
                      {c.file_url && (
                        <a href={c.file_url} target="_blank" rel="noopener noreferrer"
                          className="p-1.5 rounded-lg" style={{ backgroundColor: "rgba(99,102,241,0.08)", color: "#6366F1" }}>
                          <FileText className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <button type="button" onClick={() => onEdit(c)}
                        className="p-1.5 rounded-lg" style={{ backgroundColor: "rgba(245,158,11,0.1)", color: "#D97706" }}>
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" onClick={() => del(c.id)}
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
  );
}

// ── Onboarding view ────────────────────────────────────────────────────────────

function OnboardingView({ onEdit }: { onEdit: (o: Onboarding | null) => void }) {
  const [items, setItems] = useState<Onboarding[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/admin/business/onboarding").then(r => r.json())
      .then(d => { if (d.onboarding) setItems(d.onboarding); }).finally(() => setLoading(false));
  }, []);

  const del = async (id: string) => {
    if (!confirm("Ștergi onboarding-ul?")) return;
    await fetch("/api/admin/business/onboarding", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const toggleStep = async (item: Onboarding, step: keyof Onboarding) => {
    const updated = { ...item, [step]: !item[step] };
    setItems(prev => prev.map(i => i.id === item.id ? updated : i));
    await fetch("/api/admin/business/onboarding", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, [step]: !item[step] }),
    });
  };

  const STEPS: { key: keyof Onboarding; label: string }[] = [
    { key: "step_contract",   label: "Contract" },
    { key: "step_access",     label: "Accese" },
    { key: "step_briefing",   label: "Briefing" },
    { key: "step_calendar",   label: "Calendar" },
    { key: "step_first_post", label: "1st Post" },
  ];

  const filtered = items.filter(i => i.client_name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <SearchBar value={search} onChange={setSearch} />
      <button type="button" onClick={() => onEdit(null)}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold mb-3"
        style={{ background: "linear-gradient(135deg,#F59E0B,#D97706)", color: "#1C1814" }}>
        <Plus className="w-4 h-4" /> Client nou
      </button>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "#F59E0B" }} /></div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-center py-8" style={{ color: "#A8967E" }}>Niciun client în onboarding</p>
      ) : (
        <div className="space-y-3">
          {filtered.map(item => {
            const done = stepsComplete(item);
            const pct = Math.round((done / 5) * 100);
            return (
              <div key={item.id} className="rounded-xl p-4" style={card}>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <p className="font-bold text-sm" style={{ color: "#292524" }}>{item.client_name}</p>
                    {item.ig_username && (
                      <p className="text-[10px] mt-0.5" style={{ color: "#A8967E" }}>@{item.ig_username}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-xs font-bold" style={{ color: pct === 100 ? "#10B981" : "#F59E0B" }}>{pct}%</span>
                    <button type="button" onClick={() => onEdit(item)}
                      className="p-1.5 rounded-lg" style={{ backgroundColor: "rgba(245,158,11,0.1)", color: "#D97706" }}>
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" onClick={() => del(item.id)}
                      className="p-1.5 rounded-lg" style={{ backgroundColor: "rgba(239,68,68,0.08)", color: "#EF4444" }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 rounded-full mb-3" style={{ backgroundColor: "rgba(245,215,160,0.3)" }}>
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: pct === 100 ? "#10B981" : "#F59E0B" }} />
                </div>

                {/* Steps */}
                <div className="flex flex-wrap gap-1.5">
                  {STEPS.map(({ key, label }) => {
                    const checked = item[key] as boolean;
                    return (
                      <button key={key} type="button" onClick={() => toggleStep(item, key)}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition-all"
                        style={checked
                          ? { backgroundColor: "rgba(16,185,129,0.1)", color: "#10B981" }
                          : { backgroundColor: "rgba(245,215,160,0.15)", color: "#A8967E" }}>
                        {checked ? <CheckSquare className="w-3 h-3" /> : <Square className="w-3 h-3" />}
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Edit forms ─────────────────────────────────────────────────────────────────

function EditClientForm({ client, onSave, onCancel }: { client: Client | null; onSave: () => void; onCancel: () => void }) {
  const empty = { name: "", company: "", email: "", phone: "", service: "", monthly_value: 0, status: "active", start_date: "", notes: "", payment_status: "paid", last_invoice_date: "", next_invoice_date: "" };
  const [form, setForm] = useState<Omit<Client, "id">>(client ? { ...client } : empty);
  const [saving, setSaving] = useState(false);

  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    await fetch("/api/admin/business/clients", {
      method: client ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(client ? { id: client.id, ...form } : form),
    });
    onSave();
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {([["name", "Nume *"], ["company", "Companie"], ["email", "Email"], ["phone", "Telefon"], ["service", "Serviciu"]] as [keyof typeof form, string][]).map(([k, label]) => (
          <div key={k} className={k === "email" || k === "service" ? "col-span-2" : ""}>
            <label className="block text-xs font-medium mb-1" style={{ color: "#78614E" }}>{label}</label>
            <input value={form[k] as string} onChange={f(k)} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={inp} />
          </div>
        ))}
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "#78614E" }}>MRR (USD)</label>
          <input type="number" value={form.monthly_value || ""} onChange={e => setForm(p => ({ ...p, monthly_value: parseFloat(e.target.value) || 0 }))}
            className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={inp} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "#78614E" }}>Status</label>
          <select value={form.status} onChange={f("status")} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={inp}>
            <option value="active">Activ</option>
            <option value="paused">Pauză</option>
            <option value="ended">Încheiat</option>
            <option value="prospect">Prospect</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "#78614E" }}>Data start</label>
          <input type="date" value={form.start_date} onChange={f("start_date")} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={inp} />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: "#78614E" }}>Note</label>
        <textarea value={form.notes} onChange={f("notes")} rows={2}
          className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none" style={inp} />
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={save} disabled={saving || !form.name.trim()}
          className="flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40 flex items-center justify-center gap-2"
          style={{ background: "linear-gradient(135deg,#F59E0B,#D97706)", color: "#1C1814" }}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {client ? "Salvează" : "Adaugă"}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2.5 rounded-xl text-sm" style={{ color: "#78614E", border: "1px solid rgba(245,215,160,0.3)" }}>
          Anulează
        </button>
      </div>
    </div>
  );
}

function EditContractForm({ contract, onSave, onCancel }: { contract: Contract | null; onSave: () => void; onCancel: () => void }) {
  const empty = { client_name: "", type: "retainer", value: 0, signed: false, signed_at: "", expires_at: "", file_url: "", notes: "" };
  const [form, setForm] = useState<Omit<Contract, "id">>(contract ?? empty);
  const [saving, setSaving] = useState(false);
  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  const save = async () => {
    if (!form.client_name.trim()) return;
    setSaving(true);
    await fetch("/api/admin/business/contracts", {
      method: contract ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(contract ? { id: contract.id, ...form } : form),
    });
    onSave();
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-medium mb-1" style={{ color: "#78614E" }}>Client *</label>
          <input value={form.client_name} onChange={f("client_name")} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={inp} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "#78614E" }}>Tip</label>
          <select value={form.type} onChange={f("type")} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={inp}>
            <option value="retainer">Retainer</option>
            <option value="project">Proiect</option>
            <option value="one-time">One-time</option>
            <option value="nda">NDA</option>
            <option value="other">Altul</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "#78614E" }}>Valoare (USD)</label>
          <input type="number" value={form.value || ""} onChange={e => setForm(p => ({ ...p, value: parseFloat(e.target.value) || 0 }))}
            className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={inp} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "#78614E" }}>Data semnare</label>
          <input type="date" value={form.signed_at} onChange={f("signed_at")} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={inp} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "#78614E" }}>Expiră la</label>
          <input type="date" value={form.expires_at} onChange={f("expires_at")} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={inp} />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium mb-1" style={{ color: "#78614E" }}>Link fișier (Drive, etc.)</label>
          <input value={form.file_url} onChange={f("file_url")} placeholder="https://..." className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={inp} />
        </div>
        <div className="col-span-2 flex items-center gap-2">
          <input type="checkbox" id="signed" checked={form.signed}
            onChange={e => setForm(p => ({ ...p, signed: e.target.checked }))} className="rounded" />
          <label htmlFor="signed" className="text-sm" style={{ color: "#78614E" }}>Contract semnat</label>
        </div>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={save} disabled={saving || !form.client_name.trim()}
          className="flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40 flex items-center justify-center gap-2"
          style={{ background: "linear-gradient(135deg,#F59E0B,#D97706)", color: "#1C1814" }}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {contract ? "Salvează" : "Adaugă"}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2.5 rounded-xl text-sm" style={{ color: "#78614E", border: "1px solid rgba(245,215,160,0.3)" }}>
          Anulează
        </button>
      </div>
    </div>
  );
}

function EditOnboardingForm({ item, onSave, onCancel }: { item: Onboarding | null; onSave: () => void; onCancel: () => void }) {
  const empty: Omit<Onboarding, "id"> = {
    client_name: "", ig_username: "", ig_password: "", fb_email: "", tiktok_user: "",
    brand_colors: "", target_audience: "", content_pillars: "", posting_freq: "", goals: "", notes: "",
    step_contract: false, step_access: false, step_briefing: false, step_calendar: false, step_first_post: false,
  };
  const [form, setForm] = useState<Omit<Onboarding, "id">>(item ? { ...item } : empty);
  const [saving, setSaving] = useState(false);
  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  const save = async () => {
    if (!form.client_name.trim()) return;
    setSaving(true);
    await fetch("/api/admin/business/onboarding", {
      method: item ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item ? { id: item.id, ...form } : form),
    });
    onSave();
  };

  const fields: [keyof typeof form, string, string?][] = [
    ["client_name", "Nume client *"],
    ["ig_username", "Instagram username"],
    ["ig_password", "Instagram parolă"],
    ["fb_email", "Facebook email"],
    ["tiktok_user", "TikTok username"],
    ["brand_colors", "Culori brand (HEX)"],
    ["target_audience", "Target audience"],
    ["content_pillars", "Content pillars"],
    ["posting_freq", "Frecvență postare"],
    ["goals", "Obiective"],
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {fields.map(([k, label]) => (
          <div key={k} className={k === "client_name" || k === "target_audience" || k === "content_pillars" || k === "goals" ? "col-span-2" : ""}>
            <label className="block text-xs font-medium mb-1" style={{ color: "#78614E" }}>{label}</label>
            <input value={form[k] as string} onChange={f(k)}
              type={k === "ig_password" ? "password" : "text"}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={inp} />
          </div>
        ))}
        <div className="col-span-2">
          <label className="block text-xs font-medium mb-1" style={{ color: "#78614E" }}>Note</label>
          <textarea value={form.notes} onChange={f("notes")} rows={2}
            className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none" style={inp} />
        </div>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={save} disabled={saving || !form.client_name.trim()}
          className="flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40 flex items-center justify-center gap-2"
          style={{ background: "linear-gradient(135deg,#F59E0B,#D97706)", color: "#1C1814" }}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {item ? "Salvează" : "Adaugă"}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2.5 rounded-xl text-sm" style={{ color: "#78614E", border: "1px solid rgba(245,215,160,0.3)" }}>
          Anulează
        </button>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function AdminBusinessPanel() {
  const [view, setView] = useState<View>("home");
  const [editClient, setEditClient] = useState<Client | null | undefined>(undefined);
  const [editContract, setEditContract] = useState<Contract | null | undefined>(undefined);
  const [editOnboarding, setEditOnboarding] = useState<Onboarding | null | undefined>(undefined);

  const SECTIONS = [
    { id: "finance",    label: "Finanțe",   emoji: "💰", icon: DollarSign, color: "#10B981", bg: "rgba(16,185,129,0.1)", desc: "Clienți, MRR, status contracte" },
    { id: "contracts",  label: "Contracte", emoji: "📄", icon: FileText,   color: "#6366F1", bg: "rgba(99,102,241,0.1)",  desc: "Documente legale, semnături" },
    { id: "onboarding", label: "Onboarding",emoji: "🚀", icon: Rocket,     color: "#F59E0B", bg: "rgba(245,158,11,0.1)",  desc: "Acces clienți noi, checklist" },
  ];

  const viewTitle: Record<string, string> = {
    home: "Administrare Business", finance: "💰 Finanțe",
    contracts: "📄 Contracte", onboarding: "🚀 Onboarding",
    edit_client: editClient ? "Editează client" : "Client nou",
    edit_contract: editContract ? "Editează contract" : "Contract nou",
    edit_onboarding: editOnboarding ? "Editează onboarding" : "Onboarding nou",
  };

  const back = () => {
    if (view === "edit_client") { setEditClient(undefined); setView("finance"); return; }
    if (view === "edit_contract") { setEditContract(undefined); setView("contracts"); return; }
    if (view === "edit_onboarding") { setEditOnboarding(undefined); setView("onboarding"); return; }
    setView("home");
  };

  const handleEditClient = (c: Client | null) => { setEditClient(c); setView("edit_client"); };
  const handleEditContract = (c: Contract | null) => { setEditContract(c); setView("edit_contract"); };
  const handleEditOnboarding = (o: Onboarding | null) => { setEditOnboarding(o); setView("edit_onboarding"); };

  return (
    <div>
      {/* Header cu Back */}
      {view !== "home" && (
        <div className="flex items-center gap-3 mb-4 pb-3" style={{ borderBottom: "1px solid rgba(245,215,160,0.2)" }}>
          <button type="button" onClick={back}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all active:scale-95"
            style={{ backgroundColor: "rgba(245,215,160,0.15)", color: "#78614E" }}>
            <ArrowLeft className="w-4 h-4" />
            Înapoi
          </button>
          <p className="font-bold text-sm" style={{ color: "#292524" }}>{viewTitle[view]}</p>
        </div>
      )}

      {/* Views */}
      {view === "home" && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {SECTIONS.map(s => {
            const Icon = s.icon;
            return (
              <button key={s.id} type="button" onClick={() => setView(s.id as View)}
                className="flex flex-col items-start gap-3 p-4 rounded-2xl text-left transition-all active:scale-95"
                style={{ backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 2px 8px rgba(120,97,78,0.08)" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                  style={{ backgroundColor: s.bg }}>
                  {s.emoji}
                </div>
                <div>
                  <p className="font-bold text-sm" style={{ color: "#292524" }}>{s.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: "#A8967E" }}>{s.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 self-end" style={{ color: "#C4AA8A" }} />
              </button>
            );
          })}
        </div>
      )}

      {view === "finance"    && <FinanceView onEdit={handleEditClient} />}
      {view === "contracts"  && <ContractsView onEdit={handleEditContract} />}
      {view === "onboarding" && <OnboardingView onEdit={handleEditOnboarding} />}

      {view === "edit_client" && editClient !== undefined && (
        <EditClientForm client={editClient} onCancel={back}
          onSave={() => { back(); }} />
      )}
      {view === "edit_contract" && editContract !== undefined && (
        <EditContractForm contract={editContract} onCancel={back} onSave={() => { back(); }} />
      )}
      {view === "edit_onboarding" && editOnboarding !== undefined && (
        <EditOnboardingForm item={editOnboarding} onCancel={back} onSave={() => { back(); }} />
      )}
    </div>
  );
}
