"use client";
import { useState, useEffect } from "react";
import Header from "@/components/layout/Header";
import { Save, Loader2, Check, Eye, Palette, Globe, Mail, FileText } from "lucide-react";

interface Settings { agency_name: string; agency_logo: string; primary_color: string; accent_color: string; custom_domain: string; support_email: string; footer_text: string; }

const empty: Settings = { agency_name: "", agency_logo: "", primary_color: "#F59E0B", accent_color: "#D97706", custom_domain: "", support_email: "", footer_text: "" };
const inp: React.CSSProperties = { border: "1px solid rgba(245,215,160,0.3)", backgroundColor: "white", color: "#292524", borderRadius: 8, padding: "8px 12px", fontSize: 14, outline: "none", width: "100%" };
const card = { backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", borderRadius: 12 };

export default function WhiteLabelPage() {
  const [settings, setSettings] = useState<Settings>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    fetch("/api/agency-settings").then(r => r.json())
      .then(d => { if (d.settings) setSettings({ ...empty, ...d.settings }); }).finally(() => setLoading(false));
  }, []);

  const f = (k: keyof Settings) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setSettings(p => ({ ...p, [k]: e.target.value }));

  const save = async () => {
    setSaving(true);
    await fetch("/api/agency-settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) });
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "#F59E0B" }} /></div>;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FAFAF8" }}>
      <Header title="White-label Settings" subtitle="Personalizează platforma cu branding-ul agenției tale" />
      <div className="p-4 max-w-2xl mx-auto space-y-4">

        {/* Preview toggle */}
        <button type="button" onClick={() => setPreview(v => !v)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold"
          style={{ ...card, color: "#78614E", boxShadow: "0 1px 3px rgba(120,97,78,0.06)" }}>
          <Eye className="w-4 h-4" /> {preview ? "Editare" : "Preview"}
        </button>

        {preview ? (
          /* White-label preview */
          <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(245,215,160,0.3)", boxShadow: "0 4px 20px rgba(120,97,78,0.1)" }}>
            <div className="px-6 py-4 flex items-center gap-3"
              style={{ backgroundColor: settings.primary_color || "#F59E0B" }}>
              {settings.agency_logo ? (
                <img src={settings.agency_logo} alt="" className="w-8 h-8 rounded-lg object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: "rgba(255,255,255,0.2)" }}>
                  {settings.agency_name?.[0] ?? "A"}
                </div>
              )}
              <span className="font-bold text-white">{settings.agency_name || "Numele Agenției"}</span>
            </div>
            <div className="p-6" style={{ backgroundColor: "#FFFCF7" }}>
              <p className="text-sm" style={{ color: "#78614E" }}>Platforma de marketing personalizată pentru clienții tăi.<br />Acces la analytics, rapoarte și mai mult.</p>
              <div className="mt-4 inline-block px-4 py-2 rounded-lg text-sm font-bold text-white"
                style={{ backgroundColor: settings.accent_color || "#D97706" }}>
                Accesează Dashboard
              </div>
            </div>
            <div className="px-6 py-3 text-xs" style={{ backgroundColor: "rgba(245,215,160,0.1)", borderTop: "1px solid rgba(245,215,160,0.2)", color: "#A8967E" }}>
              {settings.footer_text || `© ${new Date().getFullYear()} ${settings.agency_name || "Agenția Ta"} · ${settings.support_email || "contact@agentie.ro"}`}
            </div>
          </div>
        ) : (
          /* Edit form */
          <div className="space-y-4">
            {/* Branding */}
            <div className="rounded-2xl p-4 space-y-3" style={card}>
              <div className="flex items-center gap-2 mb-1">
                <Palette className="w-4 h-4" style={{ color: "#F59E0B" }} />
                <p className="font-bold text-sm" style={{ color: "#292524" }}>Identitate vizuală</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><label className="block text-xs font-medium mb-1" style={{ color: "#78614E" }}>Numele agenției</label><input value={settings.agency_name} onChange={f("agency_name")} placeholder="Ex: Digital Studio SRL" style={inp} /></div>
                <div className="col-span-2"><label className="block text-xs font-medium mb-1" style={{ color: "#78614E" }}>URL logo (imagine)</label><input value={settings.agency_logo} onChange={f("agency_logo")} placeholder="https://..." style={inp} /></div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "#78614E" }}>Culoare primară</label>
                  <div className="flex gap-2">
                    <input type="color" value={settings.primary_color} onChange={f("primary_color")} className="w-10 h-10 rounded-lg cursor-pointer border-0" />
                    <input value={settings.primary_color} onChange={f("primary_color")} style={{ ...inp, flex: 1 }} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "#78614E" }}>Culoare accent</label>
                  <div className="flex gap-2">
                    <input type="color" value={settings.accent_color} onChange={f("accent_color")} className="w-10 h-10 rounded-lg cursor-pointer border-0" />
                    <input value={settings.accent_color} onChange={f("accent_color")} style={{ ...inp, flex: 1 }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Contact & Domain */}
            <div className="rounded-2xl p-4 space-y-3" style={card}>
              <div className="flex items-center gap-2 mb-1">
                <Globe className="w-4 h-4" style={{ color: "#6366F1" }} />
                <p className="font-bold text-sm" style={{ color: "#292524" }}>Domeniu & Contact</p>
              </div>
              <div><label className="block text-xs font-medium mb-1" style={{ color: "#78614E" }}>Domeniu custom (opțional)</label><input value={settings.custom_domain} onChange={f("custom_domain")} placeholder="ex: portal.agentiatamea.ro" style={inp} /></div>
              <div><label className="block text-xs font-medium mb-1" style={{ color: "#78614E" }}>Email suport</label><input value={settings.support_email} onChange={f("support_email")} placeholder="suport@agentiatamea.ro" style={inp} /></div>
            </div>

            {/* Footer */}
            <div className="rounded-2xl p-4 space-y-3" style={card}>
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-4 h-4" style={{ color: "#10B981" }} />
                <p className="font-bold text-sm" style={{ color: "#292524" }}>Footer custom</p>
              </div>
              <textarea value={settings.footer_text} onChange={f("footer_text")} rows={2}
                placeholder={`© ${new Date().getFullYear()} Agenția Ta · contact@agentie.ro`}
                className="w-full rounded-lg px-3 py-2.5 text-sm outline-none resize-none"
                style={{ border: "1px solid rgba(245,215,160,0.3)", backgroundColor: "white", color: "#292524" }} />
            </div>

            <button type="button" onClick={save} disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold disabled:opacity-40"
              style={{ background: "linear-gradient(135deg,#F59E0B,#D97706)", color: "#1C1814" }}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saved ? "Salvat!" : "Salvează setările"}
            </button>
          </div>
        )}

        {/* Note */}
        <div className="rounded-xl p-3 text-xs" style={{ backgroundColor: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.15)", color: "#78614E" }}>
          💡 Setările de branding se aplică automat în <strong>Client Portal</strong> și rapoartele trimise clienților tăi. Domeniu custom necesită configurare DNS suplimentară.
        </div>
      </div>
    </div>
  );
}
