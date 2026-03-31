"use client";

import { useEffect, useState } from "react";
import { CheckCircle, XCircle, RefreshCw, Youtube, Instagram, Key, CreditCard, Database, Bot } from "lucide-react";

type CredField = { label: string; masked: string; configured: boolean };

type Credentials = {
  youtube: { apiKey: CredField };
  instagram: { appId: CredField; appSecret: CredField; redirectUri: CredField };
  anthropic: { apiKey: CredField; apiKeyApp: CredField };
  stripe: { secretKey: CredField; webhookSecret: CredField };
  supabase: { url: CredField; anonKey: CredField; serviceRoleKey: CredField };
  other: { rapidApi: CredField; newsApi: CredField; resend: CredField };
};

const cardStyle = {
  backgroundColor: "#FFFCF7",
  border: "1px solid rgba(245,215,160,0.25)",
  boxShadow: "0 1px 3px rgba(120,97,78,0.08)",
};

const sections = [
  {
    key: "youtube",
    label: "YouTube",
    icon: <Youtube className="w-4 h-4" style={{ color: "#FF0000" }} />,
    color: "#FF0000",
    bg: "rgba(255,0,0,0.07)",
  },
  {
    key: "instagram",
    label: "Instagram",
    icon: <Instagram className="w-4 h-4" style={{ color: "#E1306C" }} />,
    color: "#E1306C",
    bg: "rgba(225,48,108,0.07)",
  },
  {
    key: "anthropic",
    label: "Anthropic AI",
    icon: <Bot className="w-4 h-4" style={{ color: "#D97706" }} />,
    color: "#D97706",
    bg: "rgba(245,158,11,0.08)",
  },
  {
    key: "other",
    label: "Other APIs",
    icon: <Key className="w-4 h-4" style={{ color: "#6366F1" }} />,
    color: "#6366F1",
    bg: "rgba(99,102,241,0.07)",
  },
  {
    key: "stripe",
    label: "Stripe",
    icon: <CreditCard className="w-4 h-4" style={{ color: "#635BFF" }} />,
    color: "#635BFF",
    bg: "rgba(99,91,255,0.07)",
  },
  {
    key: "supabase",
    label: "Supabase",
    icon: <Database className="w-4 h-4" style={{ color: "#3ECF8E" }} />,
    color: "#3ECF8E",
    bg: "rgba(62,207,142,0.07)",
  },
];

export default function AdminCredentials() {
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCredentials = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/credentials");
      const data = await res.json();
      if (data.success) setCredentials(data.credentials);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCredentials(); }, []);

  const allFields = credentials
    ? Object.values(credentials).flatMap(sec => Object.values(sec) as CredField[])
    : [];
  const totalOk = allFields.filter(f => f.configured).length;
  const total = allFields.length;

  return (
    <div className="rounded-2xl p-6" style={cardStyle}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)" }}>
            <Key className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: "#292524" }}>API Credentials</h2>
            <p className="text-xs" style={{ color: "#A8967E" }}>
              {loading ? "Loading..." : `${totalOk} / ${total} configured`}
            </p>
          </div>
        </div>
        <button onClick={fetchCredentials} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          style={{ backgroundColor: "rgba(245,215,160,0.15)", color: "#78614E", border: "1px solid rgba(245,215,160,0.3)" }}>
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Overall health bar */}
      {!loading && (
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs mb-1.5" style={{ color: "#A8967E" }}>
            <span>Configuration health</span>
            <span className="font-semibold" style={{ color: totalOk === total ? "#16a34a" : "#D97706" }}>
              {Math.round((totalOk / total) * 100)}%
            </span>
          </div>
          <div className="w-full h-2 rounded-full" style={{ backgroundColor: "rgba(245,215,160,0.2)" }}>
            <div className="h-2 rounded-full transition-all"
              style={{
                width: `${(totalOk / total) * 100}%`,
                backgroundColor: totalOk === total ? "#16a34a" : "#F59E0B",
              }} />
          </div>
        </div>
      )}

      {/* Sections grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {sections.map(sec => {
          const sectionData = credentials?.[sec.key as keyof Credentials];
          const fields = sectionData ? Object.values(sectionData) as CredField[] : [];
          const allOk = fields.every(f => f.configured);

          return (
            <div key={sec.key} className="rounded-xl p-4"
              style={{ backgroundColor: sec.bg, border: `1px solid ${sec.color}22` }}>
              {/* Section header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {sec.icon}
                  <span className="text-sm font-bold" style={{ color: "#292524" }}>{sec.label}</span>
                </div>
                <div className="flex items-center gap-1">
                  {allOk
                    ? <CheckCircle className="w-4 h-4" style={{ color: "#16a34a" }} />
                    : <XCircle className="w-4 h-4" style={{ color: "#EF4444" }} />
                  }
                  <span className="text-xs font-medium"
                    style={{ color: allOk ? "#16a34a" : "#EF4444" }}>
                    {allOk ? "OK" : "Missing"}
                  </span>
                </div>
              </div>

              {/* Fields */}
              <div className="space-y-2">
                {loading
                  ? [1, 2].map(i => (
                      <div key={i} className="h-10 rounded-lg animate-pulse"
                        style={{ backgroundColor: "rgba(245,215,160,0.2)" }} />
                    ))
                  : fields.map(field => (
                      <div key={field.label} className="rounded-lg px-3 py-2"
                        style={{ backgroundColor: "rgba(255,255,255,0.7)" }}>
                        <p className="text-xs font-medium mb-0.5" style={{ color: "#78614E" }}>
                          {field.label}
                        </p>
                        <div className="flex items-center gap-2">
                          {field.configured
                            ? <CheckCircle className="w-3 h-3 flex-shrink-0" style={{ color: "#16a34a" }} />
                            : <XCircle className="w-3 h-3 flex-shrink-0" style={{ color: "#EF4444" }} />
                          }
                          <code className="text-xs truncate"
                            style={{ color: field.configured ? "#292524" : "#EF4444", fontFamily: "monospace" }}>
                            {field.masked}
                          </code>
                        </div>
                      </div>
                    ))
                }
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs mt-4 text-center" style={{ color: "#C4AA8A" }}>
        🔒 Values are masked for security — manage in Vercel → Environment Variables
      </p>
    </div>
  );
}
