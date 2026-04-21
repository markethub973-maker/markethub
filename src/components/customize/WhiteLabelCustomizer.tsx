"use client";

/**
 * White Label Customizer — Tab "White Label" (Agency plan only).
 * Configure branding: logo, name, colors, domain, email sender, footer.
 * Saves to brand_customization table via /api/brand-customization.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { Save, Upload, X, Globe, Mail, Type, Palette } from "lucide-react";

interface BrandConfig {
  logo_url: string;
  brand_name: string;
  primary_color: string;
  accent_color: string;
  custom_domain: string;
  email_sender: string;
  custom_footer: string;
}

const DEFAULT_BRAND: BrandConfig = {
  logo_url: "",
  brand_name: "",
  primary_color: "#F59E0B",
  accent_color: "#D97706",
  custom_domain: "",
  email_sender: "",
  custom_footer: "",
};

export default function WhiteLabelCustomizer() {
  const [config, setConfig] = useState<BrandConfig>(DEFAULT_BRAND);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load saved brand config
  useEffect(() => {
    fetch("/api/brand-customization")
      .then((r) => r.json())
      .then((d) => {
        if (d.brand) {
          setConfig({
            logo_url: d.brand.logo_url || "",
            brand_name: d.brand.brand_name || "",
            primary_color: d.brand.primary_color || "#F59E0B",
            accent_color: d.brand.accent_color || "#D97706",
            custom_domain: d.brand.custom_domain || "",
            email_sender: d.brand.email_sender || "",
            custom_footer: d.brand.custom_footer || "",
          });
          if (d.brand.logo_url) setLogoPreview(d.brand.logo_url);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const update = useCallback((partial: Partial<BrandConfig>) => {
    setConfig((prev) => ({ ...prev, ...partial }));
  }, []);

  const handleLogoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Create local preview
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setLogoPreview(dataUrl);
      // In production, upload to storage and get URL.
      // For now, store the data URL as logo_url.
      update({ logo_url: dataUrl });
    };
    reader.readAsDataURL(file);
  }, [update]);

  const removeLogo = useCallback(() => {
    setLogoPreview(null);
    update({ logo_url: "" });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [update]);

  const save = useCallback(async () => {
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch("/api/brand-customization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        setMsg("Saved!");
      } else {
        const d = await res.json();
        setMsg(d.error || "Error saving");
      }
    } catch {
      setMsg("Error saving");
    }
    setSaving(false);
    setTimeout(() => setMsg(""), 2000);
  }, [config]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center" style={{ background: "#FFFCF7" }}>
        <span className="text-sm" style={{ color: "#A8967E" }}>Loading...</span>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto" style={{ background: "#FFFCF7" }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h2 className="text-lg font-bold" style={{ color: "#2D2620" }}>
            White Label
          </h2>
          <p className="text-xs mt-1" style={{ color: "#A8967E" }}>
            Customize branding for your clients — logo, colors, domain, and more.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {msg && (
            <span className="text-xs font-medium" style={{ color: msg === "Saved!" ? "#16A34A" : "#DC2626" }}>
              {msg}
            </span>
          )}
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white w-full sm:w-auto justify-center"
            style={{ background: "#F59E0B" }}
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <div className="space-y-5">
        {/* Logo upload */}
        <div
          className="rounded-xl border p-4"
          style={{ borderColor: "rgba(200,180,150,0.3)", background: "#FFFFFF" }}
        >
          <label className="text-xs font-bold uppercase tracking-wider block mb-3" style={{ color: "#78614E" }}>
            <Upload className="w-3.5 h-3.5 inline mr-1.5" />
            Logo
          </label>
          {logoPreview ? (
            <div className="flex items-center gap-3">
              <img
                src={logoPreview}
                alt="Logo preview"
                className="w-16 h-16 rounded-xl border object-contain"
                style={{ borderColor: "rgba(200,180,150,0.3)", background: "#FFFCF7" }}
              />
              <button
                onClick={removeLogo}
                className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
                title="Remove logo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-6 border-2 border-dashed rounded-xl text-center hover:bg-amber-50/30 transition-colors"
              style={{ borderColor: "rgba(200,180,150,0.3)" }}
            >
              <Upload className="w-5 h-5 mx-auto mb-1" style={{ color: "#C4AA8A" }} />
              <span className="text-xs block" style={{ color: "#A8967E" }}>
                Click to upload logo (PNG, SVG, JPG)
              </span>
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/svg+xml,image/jpeg,image/webp"
            onChange={handleLogoChange}
            className="hidden"
          />
        </div>

        {/* Brand name */}
        <div
          className="rounded-xl border p-4"
          style={{ borderColor: "rgba(200,180,150,0.3)", background: "#FFFFFF" }}
        >
          <label className="text-xs font-bold uppercase tracking-wider block mb-2" style={{ color: "#78614E" }}>
            <Type className="w-3.5 h-3.5 inline mr-1.5" />
            Brand Name
          </label>
          <input
            type="text"
            value={config.brand_name}
            onChange={(e) => update({ brand_name: e.target.value })}
            placeholder="Your Agency Name"
            className="w-full px-3 py-2 text-sm rounded-lg border"
            style={{ borderColor: "rgba(200,180,150,0.3)", color: "#2D2620", background: "#FFFCF7" }}
          />
        </div>

        {/* Colors */}
        <div
          className="rounded-xl border p-4"
          style={{ borderColor: "rgba(200,180,150,0.3)", background: "#FFFFFF" }}
        >
          <label className="text-xs font-bold uppercase tracking-wider block mb-3" style={{ color: "#78614E" }}>
            <Palette className="w-3.5 h-3.5 inline mr-1.5" />
            Brand Colors
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs block mb-1" style={{ color: "#A8967E" }}>Primary Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={config.primary_color}
                  onChange={(e) => update({ primary_color: e.target.value })}
                  className="w-8 h-8 rounded-lg border cursor-pointer"
                  style={{ borderColor: "rgba(200,180,150,0.3)" }}
                />
                <input
                  type="text"
                  value={config.primary_color}
                  onChange={(e) => {
                    if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) update({ primary_color: e.target.value });
                  }}
                  className="flex-1 px-2 py-1 text-xs rounded-lg border font-mono"
                  style={{ borderColor: "rgba(200,180,150,0.3)", color: "#2D2620" }}
                />
              </div>
            </div>
            <div>
              <label className="text-xs block mb-1" style={{ color: "#A8967E" }}>Accent Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={config.accent_color}
                  onChange={(e) => update({ accent_color: e.target.value })}
                  className="w-8 h-8 rounded-lg border cursor-pointer"
                  style={{ borderColor: "rgba(200,180,150,0.3)" }}
                />
                <input
                  type="text"
                  value={config.accent_color}
                  onChange={(e) => {
                    if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) update({ accent_color: e.target.value });
                  }}
                  className="flex-1 px-2 py-1 text-xs rounded-lg border font-mono"
                  style={{ borderColor: "rgba(200,180,150,0.3)", color: "#2D2620" }}
                />
              </div>
            </div>
          </div>
          {/* Preview swatch */}
          <div className="mt-3 flex items-center gap-2">
            <div className="w-6 h-6 rounded-full" style={{ background: config.primary_color }} />
            <div className="w-6 h-6 rounded-full" style={{ background: config.accent_color }} />
            <span className="text-xs" style={{ color: "#C4AA8A" }}>Preview</span>
          </div>
        </div>

        {/* Custom domain */}
        <div
          className="rounded-xl border p-4"
          style={{ borderColor: "rgba(200,180,150,0.3)", background: "#FFFFFF" }}
        >
          <label className="text-xs font-bold uppercase tracking-wider block mb-2" style={{ color: "#78614E" }}>
            <Globe className="w-3.5 h-3.5 inline mr-1.5" />
            Custom Domain
          </label>
          <input
            type="text"
            value={config.custom_domain}
            onChange={(e) => update({ custom_domain: e.target.value })}
            placeholder="app.youragency.com"
            className="w-full px-3 py-2 text-sm rounded-lg border"
            style={{ borderColor: "rgba(200,180,150,0.3)", color: "#2D2620", background: "#FFFCF7" }}
          />
          <p className="text-xs mt-2 leading-relaxed" style={{ color: "#C4AA8A" }}>
            Point a CNAME record from your subdomain to{" "}
            <code className="px-1 py-0.5 rounded text-xs" style={{ background: "#FFF5E6", color: "#D97706" }}>
              cname.markethubpromo.com
            </code>
            . DNS propagation may take up to 48 hours.
          </p>
        </div>

        {/* Email sender */}
        <div
          className="rounded-xl border p-4"
          style={{ borderColor: "rgba(200,180,150,0.3)", background: "#FFFFFF" }}
        >
          <label className="text-xs font-bold uppercase tracking-wider block mb-2" style={{ color: "#78614E" }}>
            <Mail className="w-3.5 h-3.5 inline mr-1.5" />
            Email Sender Address
          </label>
          <input
            type="email"
            value={config.email_sender}
            onChange={(e) => update({ email_sender: e.target.value })}
            placeholder="hello@youragency.com"
            className="w-full px-3 py-2 text-sm rounded-lg border"
            style={{ borderColor: "rgba(200,180,150,0.3)", color: "#2D2620", background: "#FFFCF7" }}
          />
          <p className="text-xs mt-2" style={{ color: "#C4AA8A" }}>
            Emails to your clients will appear from this address.
          </p>
        </div>

        {/* Custom footer */}
        <div
          className="rounded-xl border p-4"
          style={{ borderColor: "rgba(200,180,150,0.3)", background: "#FFFFFF" }}
        >
          <label className="text-xs font-bold uppercase tracking-wider block mb-2" style={{ color: "#78614E" }}>
            Custom Footer Text
          </label>
          <textarea
            value={config.custom_footer}
            onChange={(e) => update({ custom_footer: e.target.value })}
            placeholder="Powered by Your Agency | Terms of Service | Privacy Policy"
            rows={3}
            className="w-full px-3 py-2 text-sm rounded-lg border resize-none"
            style={{ borderColor: "rgba(200,180,150,0.3)", color: "#2D2620", background: "#FFFCF7" }}
          />
        </div>
      </div>
    </div>
  );
}
