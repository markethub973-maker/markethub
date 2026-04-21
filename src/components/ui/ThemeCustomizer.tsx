"use client";

/**
 * Theme Customizer — floating side panel (WordPress Customizer style).
 *
 * Opens as a sliding panel from the right on ANY page.
 * Changes apply LIVE to the current page via CSS variables.
 * User navigates normally with panel open.
 * Save persists to DB (user_themes table).
 */

import { useState, useCallback, useEffect } from "react";
import { X, Save, RotateCcw, ChevronDown, ChevronRight, Palette } from "lucide-react";

interface ThemeConfig {
  primary: string;
  primaryHover: string;
  bg: string;
  bgSecondary: string;
  text: string;
  border: string;
  surface: string;
  fontFamily: string;
  fontSize: number;
  headingWeight: number;
  buttonRadius: number;
  cardRadius: number;
  cardShadow: string;
  sidebarBg: string;
  sidebarText: string;
}

const DEFAULT: ThemeConfig = {
  primary: "#F59E0B", primaryHover: "#D97706", bg: "#FFFCF7", bgSecondary: "#FFFFFF",
  text: "#2D2620", border: "#F5D7A0", surface: "#FFFFFF", fontFamily: "system-ui",
  fontSize: 16, headingWeight: 700, buttonRadius: 12, cardRadius: 16,
  cardShadow: "0 1px 3px rgba(120,97,78,0.08)", sidebarBg: "#1C1814", sidebarText: "#FFF8F0",
};

const PRESETS: Record<string, { label: string; colors: Partial<ThemeConfig> }> = {
  default: { label: "Cream", colors: {} },
  ocean: { label: "Ocean", colors: { primary: "#0EA5E9", primaryHover: "#0284C7", bg: "#F0F9FF", text: "#0C4A6E", border: "#BAE6FD", surface: "#F8FDFF", sidebarBg: "#0C4A6E" } },
  forest: { label: "Forest", colors: { primary: "#16A34A", primaryHover: "#15803D", bg: "#F0FDF4", text: "#14532D", border: "#BBF7D0", surface: "#F8FFF8", sidebarBg: "#14532D" } },
  midnight: { label: "Dark", colors: { primary: "#8B5CF6", primaryHover: "#7C3AED", bg: "#1E1B2E", bgSecondary: "#2D2A3E", text: "#E8E4F0", border: "#3D3A4E", surface: "#252238", sidebarBg: "#13111F", sidebarText: "#E8E4F0" } },
  rose: { label: "Rose", colors: { primary: "#E11D48", primaryHover: "#BE123C", bg: "#FFF1F2", text: "#4C0519", border: "#FECDD3", surface: "#FFFBFB", sidebarBg: "#4C0519" } },
  lavender: { label: "Lavender", colors: { primary: "#A855F7", primaryHover: "#9333EA", bg: "#FAF5FF", text: "#3B0764", border: "#E9D5FF", surface: "#FDFAFF", sidebarBg: "#3B0764" } },
};

const SHADOWS: Record<string, string> = {
  none: "none", light: "0 1px 3px rgba(120,97,78,0.08)",
  medium: "0 4px 12px rgba(120,97,78,0.12)", heavy: "0 8px 24px rgba(120,97,78,0.18)",
};

const FONTS = ["system-ui", "Inter", "Poppins", "Roboto", "Open Sans", "Montserrat", "Playfair Display"];

function applyToPage(c: ThemeConfig) {
  const r = document.documentElement;
  r.style.setProperty("--color-primary", c.primary);
  r.style.setProperty("--color-primary-hover", c.primaryHover);
  r.style.setProperty("--color-bg", c.bg);
  r.style.setProperty("--color-bg-secondary", c.bgSecondary);
  r.style.setProperty("--color-text", c.text);
  r.style.setProperty("--color-border", c.border);
  r.style.setProperty("--color-surface", c.surface);
  r.style.setProperty("--sidebar-bg", c.sidebarBg);
  r.style.setProperty("--sidebar-text", c.sidebarText);
}

export default function ThemeCustomizer() {
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<ThemeConfig>(DEFAULT);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [sections, setSections] = useState<Record<string, boolean>>({ presets: true, colors: true, typography: false, elements: false });

  // Listen for header button toggle
  useEffect(() => {
    const handler = () => setOpen(prev => !prev);
    window.addEventListener("toggle-theme-customizer", handler);
    return () => window.removeEventListener("toggle-theme-customizer", handler);
  }, []);

  useEffect(() => {
    fetch("/api/theme").then(r => r.json()).then(d => {
      if (d.theme?.config) {
        const merged = { ...DEFAULT, ...d.theme.config };
        setConfig(merged);
        applyToPage(merged);
      }
    }).catch(() => {});
  }, []);

  const update = useCallback((partial: Partial<ThemeConfig>) => {
    setConfig(prev => { const next = { ...prev, ...partial }; applyToPage(next); return next; });
  }, []);

  const applyPreset = useCallback((key: string) => {
    const p = PRESETS[key];
    if (p) { const next = { ...DEFAULT, ...p.colors }; setConfig(next); applyToPage(next); }
  }, []);

  const reset = useCallback(() => { setConfig(DEFAULT); applyToPage(DEFAULT); }, []);

  const save = useCallback(async () => {
    setSaving(true); setMsg("");
    try {
      const res = await fetch("/api/theme", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ theme_name: "Custom", config }) });
      setMsg(res.ok ? "Saved!" : "Error");
    } catch { setMsg("Error"); }
    setSaving(false); setTimeout(() => setMsg(""), 2000);
  }, [config]);

  const toggle = (s: string) => setSections(prev => ({ ...prev, [s]: !prev[s] }));

  return (
    <>
      {open && (
        <>
          {/* Backdrop — click to close */}
          <div className="fixed inset-0 z-[99]" style={{ background: "rgba(0,0,0,0.08)" }} onClick={() => setOpen(false)} />

          {/* Panel */}
          <div className="fixed top-0 right-0 h-full z-[100] flex flex-col"
            style={{ width: 300, background: "#FFFFFF", boxShadow: "-4px 0 24px rgba(0,0,0,0.15)" }}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b shrink-0" style={{ borderColor: "rgba(200,180,150,0.25)" }}>
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4" style={{ color: "#F59E0B" }} />
                <span className="text-sm font-bold" style={{ color: "#2D2620" }}>Customize</span>
              </div>
              <div className="flex items-center gap-1.5">
                {msg && <span className="text-xs font-medium" style={{ color: msg === "Saved!" ? "#16A34A" : "#DC2626" }}>{msg}</span>}
                <button onClick={reset} title="Reset" className="p-1.5 rounded-lg hover:bg-gray-100">
                  <RotateCcw className="w-3.5 h-3.5" style={{ color: "#A8967E" }} />
                </button>
                <button onClick={save} disabled={saving} title="Save"
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white" style={{ background: "#F59E0B" }}>
                  <Save className="w-3 h-3" />{saving ? "..." : "Save"}
                </button>
                <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100">
                  <X className="w-4 h-4" style={{ color: "#A8967E" }} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
              <SectionBlock title="Presets" open={sections.presets} onToggle={() => toggle("presets")}>
                <div className="grid grid-cols-3 gap-1.5">
                  {Object.entries(PRESETS).map(([key, p]) => {
                    const c = { ...DEFAULT, ...p.colors };
                    return (
                      <button key={key} onClick={() => applyPreset(key)}
                        className="flex flex-col items-center gap-1 p-2 rounded-lg border text-xs font-medium transition-all hover:scale-105"
                        style={{ borderColor: "rgba(200,180,150,0.25)", background: "white" }}>
                        <div className="flex gap-0.5">
                          <div className="w-4 h-4 rounded-full border border-gray-200" style={{ background: c.primary }} />
                          <div className="w-4 h-4 rounded-full border border-gray-200" style={{ background: c.bg }} />
                          <div className="w-4 h-4 rounded-full border border-gray-200" style={{ background: c.text }} />
                        </div>
                        <span style={{ color: "#78614E" }}>{p.label}</span>
                      </button>
                    );
                  })}
                </div>
              </SectionBlock>

              <SectionBlock title="Colors" open={sections.colors} onToggle={() => toggle("colors")}>
                <ColorRow label="Primary" value={config.primary} onChange={v => update({ primary: v })} />
                <ColorRow label="Primary Hover" value={config.primaryHover} onChange={v => update({ primaryHover: v })} />
                <ColorRow label="Background" value={config.bg} onChange={v => update({ bg: v })} />
                <ColorRow label="Cards" value={config.bgSecondary} onChange={v => update({ bgSecondary: v })} />
                <ColorRow label="Text" value={config.text} onChange={v => update({ text: v })} />
                <ColorRow label="Borders" value={config.border} onChange={v => update({ border: v })} />
                <ColorRow label="Surface" value={config.surface} onChange={v => update({ surface: v })} />
                <ColorRow label="Sidebar" value={config.sidebarBg} onChange={v => update({ sidebarBg: v })} />
                <ColorRow label="Sidebar Text" value={config.sidebarText} onChange={v => update({ sidebarText: v })} />
              </SectionBlock>

              <SectionBlock title="Typography" open={sections.typography} onToggle={() => toggle("typography")}>
                <div className="mb-3">
                  <label className="text-xs font-medium mb-1 block" style={{ color: "#78614E" }}>Font</label>
                  <select value={config.fontFamily} onChange={e => update({ fontFamily: e.target.value })}
                    className="w-full px-2 py-1.5 text-xs rounded-lg border" style={{ borderColor: "rgba(200,180,150,0.3)" }}>
                    {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <SliderRow label="Font Size" value={config.fontSize} min={13} max={18} unit="px" onChange={v => update({ fontSize: v })} />
                <SliderRow label="Heading Weight" value={config.headingWeight} min={500} max={900} step={100} onChange={v => update({ headingWeight: v })} />
              </SectionBlock>

              <SectionBlock title="Buttons & Cards" open={sections.elements} onToggle={() => toggle("elements")}>
                <SliderRow label="Button Radius" value={config.buttonRadius} min={0} max={24} unit="px" onChange={v => update({ buttonRadius: v })} />
                <SliderRow label="Card Radius" value={config.cardRadius} min={0} max={24} unit="px" onChange={v => update({ cardRadius: v })} />
                <div className="mb-2">
                  <label className="text-xs font-medium mb-1 block" style={{ color: "#78614E" }}>Card Shadow</label>
                  <div className="grid grid-cols-4 gap-1">
                    {Object.keys(SHADOWS).map(s => (
                      <button key={s} onClick={() => update({ cardShadow: SHADOWS[s] })}
                        className="px-1.5 py-1 text-xs rounded-lg border capitalize"
                        style={{
                          borderColor: config.cardShadow === SHADOWS[s] ? "#F59E0B" : "rgba(200,180,150,0.3)",
                          background: config.cardShadow === SHADOWS[s] ? "rgba(245,158,11,0.1)" : "white", color: "#78614E",
                        }}>{s}</button>
                    ))}
                  </div>
                </div>
                <div className="mt-3 p-3 rounded-lg" style={{ background: config.bg, border: `1px solid ${config.border}` }}>
                  <p className="text-xs mb-2" style={{ color: "#A8967E" }}>Preview:</p>
                  <button className="px-4 py-2 text-xs font-bold text-white mb-2"
                    style={{ background: config.primary, borderRadius: config.buttonRadius, boxShadow: `0 3px 0 0 ${config.primaryHover}` }}>Button</button>
                  <div className="p-2 text-xs" style={{
                    background: config.surface, border: `1px solid ${config.border}`,
                    borderRadius: config.cardRadius, boxShadow: config.cardShadow, color: config.text,
                  }}>Card preview</div>
                </div>
              </SectionBlock>
            </div>
          </div>
        </>
      )}
    </>
  );
}

function SectionBlock({ title, open, onToggle, children }: { title: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="border-b pb-2 mb-2" style={{ borderColor: "rgba(200,180,150,0.15)" }}>
      <button onClick={onToggle} className="flex items-center justify-between w-full py-2 text-xs font-bold uppercase tracking-wider" style={{ color: "#78614E" }}>
        {title}
        {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
      </button>
      {open && <div className="pt-1">{children}</div>}
    </div>
  );
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <span className="text-xs" style={{ color: "#78614E" }}>{label}</span>
      <div className="flex items-center gap-1.5">
        <input type="text" value={value}
          onChange={e => { if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) onChange(e.target.value); }}
          className="w-16 px-1.5 py-0.5 text-xs rounded border text-center font-mono" style={{ borderColor: "rgba(200,180,150,0.3)" }} />
        <input type="color" value={value.length === 7 ? value : "#000000"}
          onChange={e => onChange(e.target.value)}
          className="w-6 h-6 rounded border cursor-pointer" style={{ borderColor: "rgba(200,180,150,0.3)" }} />
      </div>
    </div>
  );
}

function SliderRow({ label, value, min, max, step = 1, unit, onChange }: {
  label: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (v: number) => void;
}) {
  return (
    <div className="mb-2.5">
      <div className="flex justify-between mb-0.5">
        <span className="text-xs" style={{ color: "#78614E" }}>{label}</span>
        <span className="text-xs font-mono font-bold" style={{ color: "#F59E0B" }}>{value}{unit || ""}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{ background: `linear-gradient(to right, #F59E0B ${((value - min) / (max - min)) * 100}%, rgba(200,180,150,0.2) 0%)` }} />
    </div>
  );
}
