"use client";

/**
 * Email template preview + test-send panel.
 *
 * Shell around /api/admin/email-preview — Eduard picks a template,
 * tweaks the params, previews rendered HTML inline (iframe-embedded),
 * and optionally sends a test to any email.
 */

import { useMemo, useState } from "react";
import { Mail, Send, Eye, Loader2, Check, AlertTriangle } from "lucide-react";

type TemplateName = "welcome" | "trial-ending" | "notification";

interface TemplateField {
  key: string;
  label: string;
  type: "text" | "number" | "textarea";
  defaultValue: string;
  optional?: boolean;
}

const TEMPLATES: Record<
  TemplateName,
  { label: string; description: string; fields: TemplateField[] }
> = {
  welcome: {
    label: "Welcome",
    description: "Sent after signup. 3-step quickstart + CTA.",
    fields: [{ key: "name", label: "Name", type: "text", defaultValue: "Alex" }],
  },
  "trial-ending": {
    label: "Trial ending",
    description: "Sent 3d and 1d before trial expires.",
    fields: [
      { key: "name", label: "Name", type: "text", defaultValue: "Alex" },
      { key: "daysLeft", label: "Days left", type: "number", defaultValue: "3" },
    ],
  },
  notification: {
    label: "Notification (generic)",
    description: "Flexible transactional. Paragraphs split on double newlines.",
    fields: [
      { key: "title", label: "Title", type: "text", defaultValue: "Test notification" },
      {
        key: "body",
        label: "Body (Markdown-ish; \\n\\n = paragraph)",
        type: "textarea",
        defaultValue:
          "This is a test notification body.\n\nSecond paragraph, to show spacing.",
      },
      {
        key: "cta_label",
        label: "CTA label (optional)",
        type: "text",
        defaultValue: "Open dashboard",
        optional: true,
      },
      {
        key: "cta_url",
        label: "CTA URL (optional)",
        type: "text",
        defaultValue: "/",
        optional: true,
      },
    ],
  },
};

export default function AdminEmailPreview() {
  const [tpl, setTpl] = useState<TemplateName>("welcome");
  const [fields, setFields] = useState<Record<string, string>>(
    Object.fromEntries(TEMPLATES.welcome.fields.map((f) => [f.key, f.defaultValue])),
  );
  const [testEmail, setTestEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sentMsg, setSentMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const previewUrl = useMemo(() => {
    const params = new URLSearchParams({ template: tpl, ...fields });
    return `/api/admin/email-preview?${params.toString()}`;
  }, [tpl, fields]);

  const switchTemplate = (name: TemplateName) => {
    setTpl(name);
    setFields(
      Object.fromEntries(TEMPLATES[name].fields.map((f) => [f.key, f.defaultValue])),
    );
    setSentMsg(null);
    setErr(null);
  };

  const setField = (key: string, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }));
    setSentMsg(null);
  };

  const sendTest = async () => {
    if (!testEmail) return;
    setSending(true);
    setSentMsg(null);
    setErr(null);
    try {
      // Build data object matching what the API expects per template
      const data: Record<string, unknown> = {};
      for (const f of TEMPLATES[tpl].fields) {
        const v = fields[f.key];
        if (!v && f.optional) continue;
        data[f.key] = f.type === "number" ? Number(v) : v;
      }
      // CTA gets rebuilt for notification
      if (tpl === "notification" && fields.cta_label) {
        data.cta = { label: fields.cta_label, url: fields.cta_url || "/" };
        delete data.cta_label;
        delete data.cta_url;
      }
      // daysLeft field name aligns with template data key
      const res = await fetch("/api/admin/email-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template: tpl, data, send_to: testEmail }),
      });
      const r = await res.json();
      if (r.ok) {
        setSentMsg(`Sent to ${testEmail} (id: ${r.id?.slice(0, 10) ?? "?"})`);
      } else {
        setErr(r.error || "Failed");
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Template picker */}
      <div className="flex items-center gap-2 flex-wrap">
        {(Object.keys(TEMPLATES) as TemplateName[]).map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => switchTemplate(name)}
            className="px-3 py-2 rounded-lg text-xs font-bold transition-all"
            style={{
              backgroundColor: tpl === name ? "#292524" : "rgba(0,0,0,0.04)",
              color: tpl === name ? "white" : "#292524",
            }}
          >
            {TEMPLATES[name].label}
          </button>
        ))}
      </div>

      <p className="text-xs" style={{ color: "#78614E" }}>
        {TEMPLATES[tpl].description}
      </p>

      {/* Fields */}
      <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: "white", border: "1px solid rgba(0,0,0,0.06)" }}>
        {TEMPLATES[tpl].fields.map((f) => (
          <div key={f.key}>
            <label
              className="block text-[10px] font-bold mb-1 uppercase tracking-wider"
              style={{ color: "#78614E" }}
            >
              {f.label}
            </label>
            {f.type === "textarea" ? (
              <textarea
                value={fields[f.key] ?? ""}
                onChange={(e) => setField(f.key, e.target.value)}
                rows={4}
                className="w-full rounded-lg px-3 py-2 text-sm resize-none"
                style={{
                  backgroundColor: "#FFF8F0",
                  border: "1px solid rgba(245,215,160,0.4)",
                  color: "#292524",
                  outline: "none",
                }}
              />
            ) : (
              <input
                type={f.type === "number" ? "number" : "text"}
                value={fields[f.key] ?? ""}
                onChange={(e) => setField(f.key, e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{
                  backgroundColor: "#FFF8F0",
                  border: "1px solid rgba(245,215,160,0.4)",
                  color: "#292524",
                  outline: "none",
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Preview */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(0,0,0,0.08)" }}>
        <div
          className="flex items-center justify-between px-3 py-2"
          style={{ backgroundColor: "#1C1814", color: "white" }}
        >
          <div className="flex items-center gap-2">
            <Eye className="w-3 h-3" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Preview</span>
          </div>
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener"
            className="text-[10px] underline"
            style={{ color: "#F59E0B" }}
          >
            Open in new tab
          </a>
        </div>
        <iframe
          key={previewUrl}
          src={previewUrl}
          title="Email preview"
          className="w-full"
          style={{ height: 520, background: "white", border: "none" }}
        />
      </div>

      {/* Test send */}
      <div className="rounded-xl p-4" style={{ backgroundColor: "white", border: "1px solid rgba(0,0,0,0.06)" }}>
        <div className="flex items-center gap-2 mb-3">
          <Mail className="w-4 h-4" style={{ color: "#F59E0B" }} />
          <p className="text-sm font-bold" style={{ color: "#292524" }}>
            Send a real test
          </p>
        </div>
        <p className="text-xs mb-3" style={{ color: "#78614E" }}>
          Uses Resend with live delivery — arrives in the real inbox.
          Good for checking spam scoring + client-specific rendering.
        </p>
        <div className="flex gap-2">
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="you@example.com"
            className="flex-1 rounded-lg px-3 py-2 text-sm"
            style={{
              backgroundColor: "#FFF8F0",
              border: "1px solid rgba(245,215,160,0.4)",
              color: "#292524",
              outline: "none",
            }}
          />
          <button
            type="button"
            onClick={sendTest}
            disabled={sending || !testEmail}
            className="px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 disabled:opacity-40"
            style={{
              background: "linear-gradient(135deg, #F59E0B, #D97706)",
              color: "#1C1814",
            }}
          >
            {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
            Send
          </button>
        </div>
        {sentMsg && (
          <p
            className="text-xs mt-3 flex items-center gap-1"
            style={{ color: "#10B981" }}
          >
            <Check className="w-3 h-3" />
            {sentMsg}
          </p>
        )}
        {err && (
          <p
            className="text-xs mt-3 flex items-center gap-1"
            style={{ color: "#EF4444" }}
          >
            <AlertTriangle className="w-3 h-3" />
            {err}
          </p>
        )}
      </div>
    </div>
  );
}
