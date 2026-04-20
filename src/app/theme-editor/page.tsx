"use client";

import { useState, useEffect, useCallback } from "react";

// ─── Types & Defaults ──────────────────────────────────────────────────────────

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
  cardShadow: "none" | "light" | "medium" | "heavy";
}

const DEFAULT_CONFIG: ThemeConfig = {
  primary: "#F59E0B",
  primaryHover: "#D97706",
  bg: "#FFFCF7",
  bgSecondary: "#FFFFFF",
  text: "#2D2620",
  border: "#F5D7A0",
  surface: "#FFFFFF",
  fontFamily: "system-ui",
  fontSize: 16,
  headingWeight: 700,
  buttonRadius: 12,
  cardRadius: 16,
  cardShadow: "light",
};

// ─── Preset Themes ──────────────────────────────────────────────────────────────

const PRESETS: Record<string, { label: string; config: ThemeConfig }> = {
  default: {
    label: "Default (Cream/Amber)",
    config: { ...DEFAULT_CONFIG },
  },
  ocean: {
    label: "Ocean",
    config: {
      ...DEFAULT_CONFIG,
      primary: "#0EA5E9",
      primaryHover: "#0284C7",
      bg: "#F0F9FF",
      bgSecondary: "#FFFFFF",
      text: "#0C4A6E",
      border: "#BAE6FD",
      surface: "#F8FDFF",
    },
  },
  forest: {
    label: "Forest",
    config: {
      ...DEFAULT_CONFIG,
      primary: "#16A34A",
      primaryHover: "#15803D",
      bg: "#F0FDF4",
      bgSecondary: "#FFFFFF",
      text: "#14532D",
      border: "#BBF7D0",
      surface: "#F8FFF8",
    },
  },
  midnight: {
    label: "Midnight",
    config: {
      ...DEFAULT_CONFIG,
      primary: "#8B5CF6",
      primaryHover: "#7C3AED",
      bg: "#1E1B2E",
      bgSecondary: "#2D2A3E",
      text: "#E8E4F0",
      border: "#3D3A4E",
      surface: "#252238",
    },
  },
  lavender: {
    label: "Lavender",
    config: {
      ...DEFAULT_CONFIG,
      primary: "#A855F7",
      primaryHover: "#9333EA",
      bg: "#FAF5FF",
      bgSecondary: "#FFFFFF",
      text: "#3B0764",
      border: "#E9D5FF",
      surface: "#FDFAFF",
    },
  },
};

// ─── Helpers ────────────────────────────────────────────────────────────────────

const SHADOW_MAP: Record<string, string> = {
  none: "none",
  light: "0 1px 3px rgba(120,97,78,0.08)",
  medium: "0 4px 12px rgba(120,97,78,0.12)",
  heavy: "0 8px 24px rgba(120,97,78,0.18)",
};

const FONT_OPTIONS = [
  "system-ui",
  "Inter",
  "Poppins",
  "Roboto",
  "Open Sans",
  "Lato",
  "Montserrat",
  "Playfair Display",
];

function buildCSSVars(config: ThemeConfig): string {
  return `
    :root {
      --color-primary: ${config.primary};
      --color-primary-hover: ${config.primaryHover};
      --color-bg: ${config.bg};
      --color-bg-secondary: ${config.bgSecondary};
      --color-text: ${config.text};
      --color-border: ${config.border};
      --color-surface: ${config.surface};
      --font-family-base: ${config.fontFamily};
      --font-size-base: ${config.fontSize}px;
      --heading-weight: ${config.headingWeight};
      --button-radius: ${config.buttonRadius}px;
      --card-radius: ${config.cardRadius}px;
      --card-shadow: ${SHADOW_MAP[config.cardShadow] || SHADOW_MAP.light};
    }
  `;
}

// ─── Component ──────────────────────────────────────────────────────────────────

export default function ThemeEditorPage() {
  const [config, setConfig] = useState<ThemeConfig>(DEFAULT_CONFIG);
  const [activePreset, setActivePreset] = useState<string>("default");
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Load existing theme on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/theme");
        if (res.ok) {
          const { theme } = await res.json();
          if (theme?.config) {
            setConfig({ ...DEFAULT_CONFIG, ...theme.config });
            setActivePreset("custom");
          }
        }
      } catch {
        // Use defaults
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const updateConfig = useCallback((partial: Partial<ThemeConfig>) => {
    setConfig((prev) => ({ ...prev, ...partial }));
    setActivePreset("custom");
  }, []);

  const applyPreset = useCallback((key: string) => {
    const preset = PRESETS[key];
    if (preset) {
      setConfig(preset.config);
      setActivePreset(key);
    }
  }, []);

  const resetToDefault = useCallback(() => {
    setConfig(DEFAULT_CONFIG);
    setActivePreset("default");
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setSaveMessage("");
    try {
      const res = await fetch("/api/theme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme_name: activePreset === "custom" ? "Custom Theme" : PRESETS[activePreset]?.label || "Custom Theme", config }),
      });
      if (res.ok) {
        setSaveMessage("Theme saved successfully!");
      } else {
        setSaveMessage("Failed to save theme.");
      }
    } catch {
      setSaveMessage("Error saving theme.");
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(""), 3000);
    }
  }, [config, activePreset]);

  // Generate CSS string for iframes
  const cssVars = buildCSSVars(config);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#FFFCF7" }}>
        <div className="animate-pulse text-lg" style={{ color: "#2D2620" }}>Loading Theme Editor...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#FFFCF7", color: "#2D2620" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-50 border-b px-4 md:px-6 py-3 flex items-center justify-between gap-4 flex-wrap"
        style={{
          background: "#FFFFFF",
          borderColor: "rgba(245,215,160,0.25)",
          boxShadow: "0 1px 3px rgba(120,97,78,0.08)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
            style={{ background: "#F59E0B" }}
          >
            T
          </div>
          <h1 className="text-lg md:text-xl font-bold" style={{ color: "#2D2620" }}>
            Theme Editor
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {saveMessage && (
            <span className="text-sm font-medium" style={{ color: saveMessage.includes("success") ? "#16A34A" : "#DC2626" }}>
              {saveMessage}
            </span>
          )}
          <button
            onClick={resetToDefault}
            className="px-4 py-2 text-sm font-medium rounded-lg border transition-colors hover:opacity-80"
            style={{ borderColor: "rgba(245,215,160,0.4)", color: "#2D2620" }}
          >
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-bold rounded-lg text-white transition-opacity disabled:opacity-50"
            style={{ background: "#F59E0B" }}
          >
            {isSaving ? "Saving..." : "Save Theme"}
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex flex-col lg:flex-row">
        {/* Left Sidebar — Controls */}
        <aside
          className="w-full lg:w-[380px] lg:min-w-[380px] overflow-y-auto p-4 md:p-6 border-b lg:border-b-0 lg:border-r"
          style={{
            borderColor: "rgba(245,215,160,0.25)",
            maxHeight: "calc(100vh - 60px)",
          }}
        >
          {/* Preset Themes */}
          <Section title="Preset Themes">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-2">
              {Object.entries(PRESETS).map(([key, preset]) => (
                <button
                  key={key}
                  onClick={() => applyPreset(key)}
                  className="p-3 rounded-xl border text-left transition-all text-xs font-medium"
                  style={{
                    borderColor: activePreset === key ? "#F59E0B" : "rgba(245,215,160,0.25)",
                    background: activePreset === key ? "rgba(245,158,11,0.08)" : "#FFFFFF",
                    boxShadow: activePreset === key ? "0 0 0 2px rgba(245,158,11,0.3)" : "none",
                  }}
                >
                  <div className="flex gap-1 mb-1.5">
                    <div className="w-4 h-4 rounded-full" style={{ background: preset.config.primary }} />
                    <div className="w-4 h-4 rounded-full" style={{ background: preset.config.bg, border: "1px solid #ddd" }} />
                    <div className="w-4 h-4 rounded-full" style={{ background: preset.config.text }} />
                  </div>
                  {preset.label}
                </button>
              ))}
            </div>
          </Section>

          {/* Color Pickers */}
          <Section title="Colors">
            <ColorPicker label="Primary" value={config.primary} onChange={(v) => updateConfig({ primary: v })} />
            <ColorPicker label="Primary Hover" value={config.primaryHover} onChange={(v) => updateConfig({ primaryHover: v })} />
            <ColorPicker label="Background" value={config.bg} onChange={(v) => updateConfig({ bg: v })} />
            <ColorPicker label="Background Secondary" value={config.bgSecondary} onChange={(v) => updateConfig({ bgSecondary: v })} />
            <ColorPicker label="Text" value={config.text} onChange={(v) => updateConfig({ text: v })} />
            <ColorPicker label="Border" value={config.border} onChange={(v) => updateConfig({ border: v })} />
            <ColorPicker label="Surface" value={config.surface} onChange={(v) => updateConfig({ surface: v })} />
          </Section>

          {/* Typography */}
          <Section title="Typography">
            <div className="mb-3">
              <label className="block text-xs font-medium mb-1 opacity-70">Font Family</label>
              <select
                value={config.fontFamily}
                onChange={(e) => updateConfig({ fontFamily: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{ borderColor: "rgba(245,215,160,0.4)", background: "#FFFFFF" }}
              >
                {FONT_OPTIONS.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
            <SliderControl
              label="Base Font Size"
              value={config.fontSize}
              min={14}
              max={18}
              step={1}
              unit="px"
              onChange={(v) => updateConfig({ fontSize: v })}
            />
            <SliderControl
              label="Heading Weight"
              value={config.headingWeight}
              min={600}
              max={800}
              step={100}
              onChange={(v) => updateConfig({ headingWeight: v })}
            />
          </Section>

          {/* Buttons */}
          <Section title="Buttons">
            <SliderControl
              label="Border Radius"
              value={config.buttonRadius}
              min={0}
              max={20}
              step={1}
              unit="px"
              onChange={(v) => updateConfig({ buttonRadius: v })}
            />
            {/* Button Preview */}
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                className="px-4 py-2 text-sm font-bold text-white transition-transform active:scale-95"
                style={{
                  background: config.primary,
                  borderRadius: `${config.buttonRadius}px`,
                  boxShadow: `0 4px 0 0 ${config.primaryHover}, 0 6px 12px rgba(0,0,0,0.15)`,
                  transform: "translateY(-2px)",
                }}
              >
                btn-3d
              </button>
              <button
                className="px-4 py-2 text-sm font-bold text-white"
                style={{
                  background: config.primaryHover,
                  borderRadius: `${config.buttonRadius}px`,
                  boxShadow: `0 2px 0 0 ${config.primaryHover}`,
                }}
              >
                btn-3d-active
              </button>
            </div>
          </Section>

          {/* Cards */}
          <Section title="Cards">
            <SliderControl
              label="Border Radius"
              value={config.cardRadius}
              min={8}
              max={24}
              step={1}
              unit="px"
              onChange={(v) => updateConfig({ cardRadius: v })}
            />
            <div className="mb-3">
              <label className="block text-xs font-medium mb-1 opacity-70">Shadow Intensity</label>
              <div className="grid grid-cols-4 gap-1">
                {(["none", "light", "medium", "heavy"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => updateConfig({ cardShadow: s })}
                    className="px-2 py-1.5 rounded-lg border text-xs font-medium capitalize transition-all"
                    style={{
                      borderColor: config.cardShadow === s ? "#F59E0B" : "rgba(245,215,160,0.3)",
                      background: config.cardShadow === s ? "rgba(245,158,11,0.1)" : "#FFFFFF",
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            {/* Card Preview */}
            <div
              className="p-4 border mt-2"
              style={{
                borderRadius: `${config.cardRadius}px`,
                borderColor: config.border,
                background: config.surface,
                boxShadow: SHADOW_MAP[config.cardShadow],
              }}
            >
              <div className="text-sm font-semibold mb-1" style={{ color: config.text }}>Card Preview</div>
              <div className="text-xs opacity-60" style={{ color: config.text }}>This is how cards will look with current settings.</div>
            </div>
          </Section>
        </aside>

        {/* Right Area — Live Preview */}
        <main className="flex-1 p-4 md:p-6 overflow-x-auto">
          <h2 className="text-sm font-bold mb-4 uppercase tracking-wide opacity-60">Live Preview</h2>
          <div className="flex flex-col xl:flex-row gap-4">
            <PreviewFrame label="Mobile (375px)" width={375} config={config} cssVars={cssVars} />
            <PreviewFrame label="Tablet (768px)" width={768} config={config} cssVars={cssVars} />
            <PreviewFrame label="Desktop (1280px)" width={1280} config={config} cssVars={cssVars} />
          </div>
        </main>
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="text-xs font-bold uppercase tracking-wider mb-3 opacity-60">{title}</h3>
      {children}
    </div>
  );
}

function ColorPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between mb-2.5">
      <label className="text-sm font-medium" style={{ color: "#2D2620" }}>{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) onChange(v);
          }}
          className="w-20 px-2 py-1 text-xs rounded border text-center font-mono"
          style={{ borderColor: "rgba(245,215,160,0.4)" }}
        />
        <input
          type="color"
          value={value.length === 7 ? value : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded-lg border cursor-pointer"
          style={{ borderColor: "rgba(245,215,160,0.4)" }}
        />
      </div>
    </div>
  );
}

function SliderControl({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-medium opacity-70">{label}</label>
        <span className="text-xs font-mono font-bold" style={{ color: "#F59E0B" }}>
          {value}{unit || ""}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer"
        style={{ background: `linear-gradient(to right, #F59E0B ${((value - min) / (max - min)) * 100}%, rgba(245,215,160,0.3) 0%)` }}
      />
    </div>
  );
}

function PreviewFrame({
  label,
  width,
  config,
  cssVars,
}: {
  label: string;
  width: number;
  config: ThemeConfig;
  cssVars: string;
}) {
  const scale = width > 768 ? 0.4 : width > 375 ? 0.5 : 0.7;
  const displayWidth = width * scale;
  const displayHeight = 600 * scale;

  return (
    <div className="flex-shrink-0">
      <div className="text-xs font-medium mb-2 opacity-60">{label}</div>
      <div
        className="overflow-hidden border rounded-xl"
        style={{
          width: `${displayWidth}px`,
          height: `${displayHeight}px`,
          borderColor: "rgba(245,215,160,0.3)",
          boxShadow: "0 2px 8px rgba(120,97,78,0.08)",
        }}
      >
        <iframe
          srcDoc={generatePreviewHTML(config, width)}
          style={{
            width: `${width}px`,
            height: "600px",
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            border: "none",
          }}
          title={`Preview ${label}`}
          sandbox="allow-same-origin"
        />
      </div>
    </div>
  );
}

function generatePreviewHTML(config: ThemeConfig, _width: number): string {
  const shadow = SHADOW_MAP[config.cardShadow] || SHADOW_MAP.light;
  return `<!DOCTYPE html>
<html>
<head>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: ${config.fontFamily}, -apple-system, sans-serif;
    font-size: ${config.fontSize}px;
    background: ${config.bg};
    color: ${config.text};
    padding: 20px;
  }
  h1 { font-weight: ${config.headingWeight}; font-size: 1.5em; margin-bottom: 12px; }
  h2 { font-weight: ${config.headingWeight}; font-size: 1.2em; margin-bottom: 8px; }
  .card {
    background: ${config.surface};
    border: 1px solid ${config.border};
    border-radius: ${config.cardRadius}px;
    padding: 16px;
    margin-bottom: 12px;
    box-shadow: ${shadow};
  }
  .btn {
    display: inline-block;
    padding: 10px 20px;
    font-size: 0.875em;
    font-weight: 700;
    color: white;
    background: ${config.primary};
    border: none;
    border-radius: ${config.buttonRadius}px;
    box-shadow: 0 4px 0 0 ${config.primaryHover}, 0 6px 12px rgba(0,0,0,0.15);
    transform: translateY(-2px);
    cursor: pointer;
    margin-right: 8px;
    margin-bottom: 8px;
  }
  .btn-outline {
    display: inline-block;
    padding: 10px 20px;
    font-size: 0.875em;
    font-weight: 600;
    color: ${config.primary};
    background: transparent;
    border: 2px solid ${config.primary};
    border-radius: ${config.buttonRadius}px;
    cursor: pointer;
    margin-right: 8px;
    margin-bottom: 8px;
  }
  .nav {
    display: flex;
    gap: 12px;
    align-items: center;
    padding: 12px 16px;
    background: ${config.bgSecondary};
    border: 1px solid ${config.border};
    border-radius: ${config.cardRadius}px;
    margin-bottom: 16px;
  }
  .nav-item {
    font-size: 0.8em;
    font-weight: 600;
    opacity: 0.7;
  }
  .nav-item.active {
    color: ${config.primary};
    opacity: 1;
  }
  .stat { font-size: 1.8em; font-weight: ${config.headingWeight}; color: ${config.primary}; }
  .stat-label { font-size: 0.75em; opacity: 0.6; margin-top: 2px; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px; }
  .badge {
    display: inline-block;
    padding: 3px 10px;
    font-size: 0.7em;
    font-weight: 600;
    border-radius: 999px;
    background: ${config.primary}22;
    color: ${config.primary};
  }
  .text-muted { opacity: 0.6; font-size: 0.85em; line-height: 1.5; }
  .divider { height: 1px; background: ${config.border}; margin: 12px 0; }
</style>
</head>
<body>
  <div class="nav">
    <strong style="color:${config.primary}; font-size:0.9em;">MarketHub</strong>
    <span class="nav-item active">Dashboard</span>
    <span class="nav-item">Calendar</span>
    <span class="nav-item">Leads</span>
    <span class="nav-item">Analytics</span>
  </div>

  <h1>Dashboard</h1>

  <div class="grid">
    <div class="card">
      <div class="stat">2.4k</div>
      <div class="stat-label">Total Followers</div>
    </div>
    <div class="card">
      <div class="stat">87%</div>
      <div class="stat-label">Engagement</div>
    </div>
    <div class="card">
      <div class="stat">142</div>
      <div class="stat-label">Posts This Week</div>
    </div>
  </div>

  <div class="card">
    <h2>Recent Activity</h2>
    <div class="divider"></div>
    <p class="text-muted">Campaign "Spring Launch" reached 12.5k impressions across 3 platforms.</p>
    <div style="margin-top:8px;">
      <span class="badge">Instagram</span>
      <span class="badge">LinkedIn</span>
      <span class="badge">TikTok</span>
    </div>
  </div>

  <div class="card">
    <h2>Quick Actions</h2>
    <div class="divider"></div>
    <div style="margin-top:8px;">
      <button class="btn">Create Post</button>
      <button class="btn-outline">Schedule</button>
    </div>
  </div>

  <div class="card">
    <h2>Content Calendar</h2>
    <div class="divider"></div>
    <p class="text-muted">You have 5 posts scheduled for this week. Next publish: Tomorrow at 9:00 AM.</p>
  </div>
</body>
</html>`;
}
