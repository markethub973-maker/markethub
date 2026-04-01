"use client";

import { useEffect, useState } from "react";
import { CheckCircle, XCircle, Save, Trash2, ExternalLink, Eye, EyeOff, RefreshCw, Zap } from "lucide-react";

type Platform = {
  key: string;
  label: string;
  icon: string;
  color: string;
  bg: string;
  fields: Field[];
  guide: string;
  guideUrl: string;
};

type Field = {
  key: string;
  label: string;
  placeholder: string;
  secret?: boolean;
  hint?: string;
};

type SavedConfig = Record<string, { token?: string; extra_data?: Record<string, string>; updated_at?: string }>;

const PLATFORMS: Platform[] = [
  {
    key: "youtube",
    label: "YouTube",
    icon: "▶️",
    color: "#FF0000",
    bg: "rgba(255,0,0,0.06)",
    fields: [
      { key: "channel_id", label: "Your Channel ID", placeholder: "UCxxxxxxxxxxxxxxxxxxxxxx", hint: "youtube.com/channel/UC... sau din Studio → Customization → Channel URL" },
    ],
    guide: "YouTube Studio → Settings → Channel → Advanced settings → Channel ID",
    guideUrl: "https://studio.youtube.com",
  },
  {
    key: "instagram",
    label: "Instagram",
    icon: "📸",
    color: "#E1306C",
    bg: "rgba(225,48,108,0.06)",
    fields: [
      { key: "access_token", label: "Long-lived Access Token", placeholder: "EAAxxxxxxxx...", secret: true, hint: "Meta Graph API Explorer → Get Token → User Token (60 days, refreshable)" },
      { key: "instagram_id", label: "Instagram Business Account ID", placeholder: "17841xxxxxxxxxx", hint: "Graph API: GET /me/accounts → instagram_business_account.id" },
      { key: "username", label: "Instagram Username", placeholder: "@username", hint: "Your Instagram business account username" },
    ],
    guide: "Meta Graph API Explorer → select app → Get User Access Token → exchange for Long-lived Token",
    guideUrl: "https://developers.facebook.com/tools/explorer/",
  },
  {
    key: "tiktok",
    label: "TikTok",
    icon: "🎵",
    color: "#010101",
    bg: "rgba(0,0,0,0.04)",
    fields: [
      { key: "access_token", label: "Access Token", placeholder: "act.xxxxxxxx...", secret: true, hint: "TikTok Developer Portal → My Apps → OAuth → Generate Token (necesită app aprobată)" },
      { key: "open_id", label: "TikTok Open ID", placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", hint: "Returnat la OAuth callback: open_id" },
    ],
    guide: "⚠ TikTok trending & search funcționează via RapidAPI (deja configurat). Acest token este necesar doar pentru analytics cont propriu — necesită aplicație aprobată în TikTok Developer Portal (proces de review 2-4 săptămâni).",
    guideUrl: "https://developers.tiktok.com/apps/",
  },
  {
    key: "facebook",
    label: "Facebook Pages",
    icon: "📘",
    color: "#1877F2",
    bg: "rgba(24,119,242,0.06)",
    fields: [
      { key: "page_token", label: "Page Access Token", placeholder: "EAAxxxxxxxx...", secret: true, hint: "Meta Graph API Explorer → GET /me/accounts → access_token for your page" },
      { key: "page_id", label: "Facebook Page ID", placeholder: "1234567890", hint: "GET /me/accounts → id of your page" },
      { key: "page_name", label: "Page Name", placeholder: "MarketHub Pro", hint: "Your Facebook page name" },
    ],
    guide: "Meta Graph API Explorer → GET /me/accounts → copy page access_token and id",
    guideUrl: "https://developers.facebook.com/tools/explorer/",
  },
];

function maskValue(val: string): string {
  if (!val || val.length < 8) return val;
  return val.slice(0, 6) + "•".repeat(12) + val.slice(-4);
}

export default function AdminPlatformConnect() {
  const [saved, setSaved] = useState<SavedConfig>({});
  const [formData, setFormData] = useState<Record<string, Record<string, string>>>({});
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ platform: string; text: string; ok: boolean } | null>(null);

  const fetchSaved = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/platforms");
      const data = await res.json();
      if (data.success) {
        const map: SavedConfig = {};
        for (const p of data.platforms) {
          map[p.platform] = { token: p.token, extra_data: p.extra_data, updated_at: p.updated_at };
        }
        setSaved(map);
        // Pre-fill form with saved values
        const fd: Record<string, Record<string, string>> = {};
        for (const p of PLATFORMS) {
          fd[p.key] = {};
          const s = map[p.key];
          if (s) {
            const tokenField = p.fields.find(f => f.key === "access_token" || f.key === "page_token" || f.key === "channel_id");
            if (tokenField && s.token) fd[p.key][tokenField.key] = s.token;
            if (s.extra_data) {
              for (const [k, v] of Object.entries(s.extra_data)) {
                fd[p.key][k] = v;
              }
            }
          }
        }
        setFormData(fd);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchSaved(); }, []);

  const handleSave = async (p: Platform) => {
    setSaving(p.key);
    setMsg(null);
    try {
      const fields = formData[p.key] || {};
      // Determine primary token field
      const tokenField = p.fields.find(f => f.key === "access_token" || f.key === "page_token" || f.key === "channel_id");
      const token = tokenField ? fields[tokenField.key] || "" : "";
      // Remaining fields go to extra_data
      const extra_data: Record<string, string> = {};
      for (const f of p.fields) {
        if (f.key !== tokenField?.key && fields[f.key]) {
          extra_data[f.key] = fields[f.key];
        }
      }

      const res = await fetch("/api/admin/platforms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: p.key, token, extra_data }),
      });
      const data = await res.json();
      if (data.success) {
        setMsg({ platform: p.key, text: "Saved successfully!", ok: true });
        fetchSaved();
      } else {
        setMsg({ platform: p.key, text: data.error || "Save failed", ok: false });
      }
    } catch {
      setMsg({ platform: p.key, text: "Connection error", ok: false });
    } finally {
      setSaving(null);
    }
  };

  const handleDisconnect = async (p: Platform) => {
    if (!confirm(`Disconnect ${p.label}?`)) return;
    setSaving(p.key);
    try {
      await fetch("/api/admin/platforms", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: p.key }),
      });
      fetchSaved();
      setFormData(prev => ({ ...prev, [p.key]: {} }));
    } finally { setSaving(null); }
  };

  const isConnected = (key: string) => !!saved[key]?.token || !!saved[key]?.extra_data?.channel_id;

  const connectedCount = PLATFORMS.filter(p => isConnected(p.key)).length;

  return (
    <div className="rounded-2xl p-6"
      style={{ backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" }}>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
            style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)" }}>
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: "#292524" }}>Admin Platform Connect</h2>
            <p className="text-xs" style={{ color: "#A8967E" }}>
              {loading ? "Loading..." : `${connectedCount} / ${PLATFORMS.length} platforms connected`}
            </p>
          </div>
        </div>
        <button onClick={fetchSaved} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
          style={{ backgroundColor: "rgba(245,215,160,0.15)", color: "#78614E", border: "1px solid rgba(245,215,160,0.3)" }}>
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Platforms grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {PLATFORMS.map(p => {
          const connected = isConnected(p.key);
          const isSaving = saving === p.key;
          const feedbackMsg = msg?.platform === p.key ? msg : null;

          return (
            <div key={p.key} className="rounded-xl p-4 flex flex-col gap-3"
              style={{ backgroundColor: p.bg, border: `1.5px solid ${connected ? p.color + "40" : "rgba(245,215,160,0.2)"}` }}>

              {/* Platform header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{p.icon}</span>
                  <span className="font-bold text-sm" style={{ color: "#292524" }}>{p.label}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {connected
                    ? <><CheckCircle className="w-4 h-4" style={{ color: "#16a34a" }} /><span className="text-xs font-semibold" style={{ color: "#16a34a" }}>Connected</span></>
                    : <><XCircle className="w-4 h-4" style={{ color: "#EF4444" }} /><span className="text-xs font-semibold" style={{ color: "#EF4444" }}>Not connected</span></>
                  }
                </div>
              </div>

              {/* Fields */}
              <div className="space-y-2">
                {p.fields.map(field => {
                  const secretKey = `${p.key}_${field.key}`;
                  const isShown = showSecret[secretKey];
                  const val = formData[p.key]?.[field.key] || "";
                  return (
                    <div key={field.key}>
                      <label className="block text-xs font-semibold mb-1" style={{ color: "#5C4A35" }}>
                        {field.label}
                      </label>
                      <div className="relative">
                        <input
                          type={field.secret && !isShown ? "password" : "text"}
                          value={val}
                          onChange={e => setFormData(prev => ({
                            ...prev,
                            [p.key]: { ...(prev[p.key] || {}), [field.key]: e.target.value }
                          }))}
                          placeholder={field.placeholder}
                          className="w-full px-3 py-2 text-xs rounded-lg focus:outline-none pr-8"
                          style={{ backgroundColor: "rgba(255,255,255,0.8)", border: "1px solid rgba(245,215,160,0.35)", color: "#292524", fontFamily: field.secret ? "monospace" : "inherit" }}
                        />
                        {field.secret && val && (
                          <button type="button"
                            onClick={() => setShowSecret(prev => ({ ...prev, [secretKey]: !prev[secretKey] }))}
                            className="absolute right-2 top-1/2 -translate-y-1/2"
                            style={{ color: "#A8967E" }}>
                            {isShown ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                      {field.hint && (
                        <p className="text-xs mt-0.5" style={{ color: "#A8967E" }}>{field.hint}</p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Guide link */}
              <a href={p.guideUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs"
                style={{ color: p.color }}>
                <ExternalLink className="w-3 h-3" />
                {p.guide}
              </a>

              {/* Feedback message */}
              {feedbackMsg && (
                <p className="text-xs font-medium" style={{ color: feedbackMsg.ok ? "#16a34a" : "#EF4444" }}>
                  {feedbackMsg.ok ? "✅" : "❌"} {feedbackMsg.text}
                </p>
              )}

              {/* Last updated */}
              {saved[p.key]?.updated_at && (
                <p className="text-xs" style={{ color: "#C4AA8A" }}>
                  Last saved: {new Date(saved[p.key].updated_at!).toLocaleString("en-GB")}
                </p>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => handleSave(p)}
                  disabled={isSaving}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all"
                  style={{ backgroundColor: p.color, color: "white", opacity: isSaving ? 0.7 : 1 }}>
                  <Save className="w-3.5 h-3.5" />
                  {isSaving ? "Saving..." : connected ? "Update" : "Save & Connect"}
                </button>
                {connected && (
                  <button
                    onClick={() => handleDisconnect(p)}
                    disabled={isSaving}
                    className="px-3 py-2 rounded-lg text-xs font-semibold transition-all"
                    style={{ backgroundColor: "rgba(239,68,68,0.08)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.2)" }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs mt-5 text-center" style={{ color: "#C4AA8A" }}>
        🔐 Tokens stored encrypted in Supabase — only visible to admin
      </p>
    </div>
  );
}
