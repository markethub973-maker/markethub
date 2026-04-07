"use client";

import { useState, useEffect } from "react";
import { Users, Plus, Copy, Check, ExternalLink, RefreshCw, ChevronDown, ChevronUp, LogIn, Loader2 } from "lucide-react";

const PLAN_LABELS: Record<string, string> = {
  free_test: "Free Trial",
  starter: "Starter — $14/mo",
  lite: "Lite — $24/mo",
  pro: "Pro — $49/mo",
  business: "Business — $99/mo",
  enterprise: "Enterprise — $249/mo",
};

const PLAN_COLORS: Record<string, string> = {
  free_test: "#78614E",
  starter: "#3B82F6",
  lite: "#F59E0B",
  pro: "#8B5CF6",
  business: "#E1306C",
  enterprise: "#16A34A",
};

const PLAN_FEATURES: Record<string, string[]> = {
  free_test: ["1,000 tokens", "3 channels", "Calendar", "TikTok"],
  starter: ["10,000 tokens", "5 channels", "Email Reports", "Ads Library"],
  lite: ["25,000 tokens", "12 channels", "Link in Bio", "Hashtags", "Marketing Agent", "Clients"],
  pro: ["60,000 tokens", "30 channels", "AI Hub", "Lead Finder", "Leads CRM"],
  business: ["150,000 tokens", "100 channels", "API Access", "Priority Support"],
  enterprise: ["Unlimited tokens", "Unlimited channels", "White Label", "Full API"],
};

interface TestAccount {
  plan: string;
  user: { id: string; email: string; full_name?: string; created_at: string } | null;
}

export default function AdminTestAccounts() {
  const [accounts, setAccounts] = useState<TestAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [newCreds, setNewCreds] = useState<Record<string, { email: string; password: string }>>({});
  const [impersonating, setImpersonating] = useState<string | null>(null);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/test-accounts");
      const data = await res.json();
      setAccounts(data.accounts ?? []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchAccounts(); }, []);

  const createAccount = async (plan: string) => {
    setCreating(plan);
    try {
      const res = await fetch("/api/admin/test-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.email) {
        setNewCreds(prev => ({ ...prev, [plan]: { email: data.email, password: data.password } }));
        await fetchAccounts();
      }
    } catch {}
    setCreating(null);
  };

  const impersonate = async (plan: string) => {
    setImpersonating(plan);
    try {
      const res = await fetch("/api/admin/test-accounts/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) {
        window.open(data.url, "_blank");
      } else {
        alert(data.error ?? "Eroare la generarea linkului");
      }
    } catch {
      alert("Eroare rețea");
    }
    setImpersonating(null);
  };

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const getPassword = (plan: string) => {
    return newCreds[plan]?.password || `Test${plan.charAt(0).toUpperCase() + plan.slice(1)}2026!`;
  };

  const getEmail = (plan: string, user: TestAccount["user"]) => {
    return newCreds[plan]?.email || user?.email || `test.${plan}@markethubpromo.com`;
  };

  return (
    <div className="bg-[#1a1d27] border border-white/10 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Test Accounts per Plan</h3>
            <p className="text-xs text-gray-400">Un cont de test pentru fiecare plan — testează feature-urile</p>
          </div>
        </div>
        <button
          type="button"
          aria-label="Reîncarcă conturile"
          onClick={fetchAccounts}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="space-y-3">
        {Object.entries(PLAN_LABELS).map(([planId, planLabel]) => {
          const account = accounts.find(a => a.plan === planId);
          const hasUser = !!account?.user;
          const color = PLAN_COLORS[planId];
          const isExpanded = expanded === planId;
          const email = getEmail(planId, account?.user ?? null);
          const password = getPassword(planId);

          return (
            <div
              key={planId}
              className="rounded-xl border overflow-hidden"
              style={{ borderColor: hasUser ? `${color}40` : "rgba(255,255,255,0.08)" }}
            >
              {/* Header */}
              <div
                className="flex items-center gap-4 p-4"
                style={{ background: hasUser ? `${color}08` : "transparent" }}
              >
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: hasUser ? color : "#374151" }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white text-sm">{planLabel}</span>
                    {hasUser ? (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: `${color}20`, color }}>
                        ✓ Cont creat
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-800 text-gray-500">
                        Fără cont
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {hasUser ? email : "Apasă + pentru a crea"}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {hasUser && (
                    <>
                      <button
                        type="button"
                        aria-label="Intră ca client"
                        onClick={() => impersonate(planId)}
                        disabled={impersonating === planId}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 disabled:opacity-50"
                      >
                        {impersonating === planId
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <LogIn className="w-3 h-3" />}
                        Intră ca client
                      </button>
                      <button
                        type="button"
                        aria-label="Afișează detalii"
                        onClick={() => setExpanded(isExpanded ? null : planId)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                      >
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => createAccount(planId)}
                    disabled={creating === planId}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: `${color}20`,
                      color,
                      border: `1px solid ${color}40`,
                      opacity: creating === planId ? 0.6 : 1,
                    }}
                  >
                    <Plus className="w-3 h-3" />
                    {hasUser ? "Recreează" : "Creează"}
                  </button>
                </div>
              </div>

              {/* Expanded credentials */}
              {isExpanded && hasUser && (
                <div className="px-4 pb-4 pt-2 border-t border-white/5 space-y-3">
                  {/* Credentials */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#0f1117] rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">Email</p>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm text-white font-mono truncate">{email}</span>
                        <button
                          type="button"
                          onClick={() => copy(email, `email-${planId}`)}
                          className="text-gray-400 hover:text-white flex-shrink-0"
                        >
                          {copied === `email-${planId}` ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                    <div className="bg-[#0f1117] rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">Parolă</p>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm text-white font-mono truncate">{password}</span>
                        <button
                          type="button"
                          onClick={() => copy(password, `pass-${planId}`)}
                          className="text-gray-400 hover:text-white flex-shrink-0"
                        >
                          {copied === `pass-${planId}` ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Copy both button */}
                  <button
                    type="button"
                    onClick={() => copy(`Email: ${email}\nParolă: ${password}`, `both-${planId}`)}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all text-gray-400 hover:text-white border border-white/10 hover:border-white/20"
                  >
                    {copied === `both-${planId}` ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    Copiază ambele credențiale
                  </button>

                  {/* Features included */}
                  <div>
                    <p className="text-xs text-gray-500 mb-2">Feature-uri incluse în acest plan:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(PLAN_FEATURES[planId] || []).map(f => (
                        <span key={f} className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}>
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-600 mt-4 text-center">
        Conturile de test folosesc email-uri @markethubpromo.com și parole standard
      </p>
    </div>
  );
}
