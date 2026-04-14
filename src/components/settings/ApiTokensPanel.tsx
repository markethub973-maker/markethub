"use client";

/**
 * User API Tokens panel — Pro+ feature.
 *
 * - Lists existing tokens (prefix + last used + expiry + status)
 * - Creates new tokens (name + optional expiry in days)
 * - Shows plaintext ONCE with copy-to-clipboard + download-to-file
 * - Revokes tokens with confirmation
 * - Plan-gates via the POST endpoint response; shows upgrade nudge
 *   if current plan doesn't allow
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Key, Plus, Trash2, Copy, Check, Download, Loader2,
  AlertTriangle, Shield, X, ExternalLink,
} from "lucide-react";

interface Token {
  id: string;
  name: string;
  token_prefix: string;
  scopes: string[];
  last_used_at: string | null;
  last_used_ip: string | null;
  created_at: string;
  expires_at: string | null;
  revoked_at: string | null;
}

export default function ApiTokensPanel() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newExpiresDays, setNewExpiresDays] = useState("");
  const [plaintext, setPlaintext] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [upgradeNeeded, setUpgradeNeeded] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/user/api-tokens", { cache: "no-store" });
      if (res.ok) {
        const d = await res.json();
        setTokens(d.tokens ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    setErr(null);
    setUpgradeNeeded(false);
    try {
      const body: Record<string, unknown> = { name: newName.trim() };
      const days = parseInt(newExpiresDays);
      if (days > 0) body.expires_in_days = days;
      const res = await fetch("/api/user/api-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (!res.ok) {
        setErr(d.error ?? "Failed");
        if (d.upgrade_required) setUpgradeNeeded(true);
        return;
      }
      setPlaintext(d.token);
      setNewName("");
      setNewExpiresDays("");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setCreating(false);
    }
  };

  const revoke = async (id: string) => {
    if (!confirm("Revoke this token? Any integration using it will immediately lose access.")) return;
    await fetch(`/api/user/api-tokens?id=${id}`, { method: "DELETE" });
    await load();
  };

  const copyToken = async () => {
    if (!plaintext) return;
    try {
      await navigator.clipboard.writeText(plaintext);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* no-op */ }
  };

  const downloadToken = () => {
    if (!plaintext) return;
    const blob = new Blob(
      [`MarketHub Pro API Token\nCreated: ${new Date().toISOString()}\n\n${plaintext}\n\nKeep this token secret — anyone with it can access your account via the API.\nRevoke from: https://markethubpromo.com/settings\nDocs: https://markethubpromo.com/api/docs\n`],
      { type: "text/plain" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `markethub-api-token-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const fmtDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

  const active = tokens.filter((t) => !t.revoked_at);
  const revoked = tokens.filter((t) => t.revoked_at);

  // Plaintext-just-created screen
  if (plaintext) {
    return (
      <div
        className="rounded-xl p-5"
        style={{ backgroundColor: "white", border: "1px solid rgba(16,185,129,0.4)" }}
      >
        <div className="flex items-start gap-3 mb-4">
          <Shield className="w-6 h-6 flex-shrink-0" style={{ color: "#10B981" }} />
          <div className="flex-1">
            <p className="text-base font-bold" style={{ color: "#292524" }}>
              Token created — save it NOW
            </p>
            <p className="text-xs mt-1" style={{ color: "#78614E" }}>
              This is the only time you&apos;ll see the full token.{" "}
              Store it in a password manager or environment variable.
            </p>
          </div>
        </div>

        <div
          className="rounded-lg p-3 mb-4 font-mono text-xs break-all"
          style={{
            backgroundColor: "#0F0C0A",
            color: "#E8D9C5",
            border: "1px solid rgba(245,158,11,0.3)",
          }}
        >
          {plaintext}
        </div>

        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={copyToken}
            className="flex-1 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2"
            style={{ backgroundColor: "rgba(16,185,129,0.1)", color: "#10B981" }}
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            type="button"
            onClick={downloadToken}
            className="flex-1 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2"
            style={{ backgroundColor: "rgba(99,102,241,0.1)", color: "#6366F1" }}
          >
            <Download className="w-3 h-3" />
            Download .txt
          </button>
        </div>

        <button
          type="button"
          onClick={() => setPlaintext(null)}
          className="w-full py-2.5 rounded-lg text-xs font-bold"
          style={{ backgroundColor: "#292524", color: "white" }}
        >
          I&apos;ve saved it — done
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-base font-bold" style={{ color: "#292524" }}>
            API Tokens
          </h3>
          <Link
            href="/api/docs"
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-1 text-xs font-semibold"
            style={{ color: "#D97706" }}
          >
            Read docs
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
        <p className="text-xs" style={{ color: "#78614E" }}>
          Programmatic access to your MarketHub Pro data. Use with Zapier, n8n,
          custom scripts, or internal dashboards.
        </p>
      </div>

      {/* Create new token */}
      <div
        className="rounded-xl p-4 space-y-3"
        style={{ backgroundColor: "white", border: "1px solid rgba(0,0,0,0.06)" }}
      >
        <p
          className="text-[10px] font-bold uppercase tracking-wider"
          style={{ color: "#78614E" }}
        >
          Create a new token
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder='Token name (e.g. "Zapier production")'
            maxLength={64}
            className="flex-1 rounded-lg px-3 py-2 text-sm"
            style={{
              backgroundColor: "#FFF8F0",
              border: "1px solid rgba(245,215,160,0.4)",
              color: "#292524",
              outline: "none",
            }}
          />
          <input
            type="number"
            value={newExpiresDays}
            onChange={(e) => setNewExpiresDays(e.target.value)}
            placeholder="Expires (days)"
            min={1}
            max={1825}
            className="w-full sm:w-36 rounded-lg px-3 py-2 text-sm"
            style={{
              backgroundColor: "#FFF8F0",
              border: "1px solid rgba(245,215,160,0.4)",
              color: "#292524",
              outline: "none",
            }}
          />
          <button
            type="button"
            onClick={create}
            disabled={creating || !newName.trim()}
            className="px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 disabled:opacity-40"
            style={{
              background: "linear-gradient(135deg, #F59E0B, #D97706)",
              color: "#1C1814",
            }}
          >
            {creating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
            Create
          </button>
        </div>
        {err && (
          <p
            className="text-xs flex items-center gap-1"
            style={{ color: "#EF4444" }}
          >
            <AlertTriangle className="w-3 h-3" />
            {err}
          </p>
        )}
        {upgradeNeeded && (
          <Link
            href="/pricing"
            className="inline-block text-xs font-bold px-3 py-1.5 rounded-md"
            style={{
              backgroundColor: "rgba(139,92,246,0.12)",
              color: "#8B5CF6",
            }}
          >
            Upgrade to Pro →
          </Link>
        )}
        <p className="text-[10px]" style={{ color: "#A8967E" }}>
          Leave expiry blank for no expiration. Max 10 active tokens per account.
        </p>
      </div>

      {/* Active tokens */}
      <div>
        <p
          className="text-[10px] font-bold uppercase tracking-wider mb-2"
          style={{ color: "#78614E" }}
        >
          Active ({active.length})
        </p>
        {loading ? (
          <div className="text-center py-4">
            <Loader2 className="w-4 h-4 animate-spin inline" style={{ color: "#A8967E" }} />
          </div>
        ) : active.length === 0 ? (
          <p
            className="text-xs py-4 text-center rounded-lg"
            style={{
              color: "#A8967E",
              backgroundColor: "rgba(245,215,160,0.05)",
              border: "1px dashed rgba(245,215,160,0.3)",
            }}
          >
            No active tokens. Create one above.
          </p>
        ) : (
          <div className="space-y-2">
            {active.map((t) => {
              const expired =
                t.expires_at && new Date(t.expires_at) < new Date();
              return (
                <div
                  key={t.id}
                  className="rounded-lg p-3 flex items-center gap-3"
                  style={{
                    backgroundColor: "white",
                    border: "1px solid rgba(0,0,0,0.06)",
                  }}
                >
                  <Key className="w-4 h-4 flex-shrink-0" style={{ color: "#F59E0B" }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: "#292524" }}>
                      {t.name}
                    </p>
                    <p
                      className="text-[11px] font-mono mt-0.5"
                      style={{ color: "#A8967E" }}
                    >
                      {t.token_prefix}…
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: "#78614E" }}>
                      Created {fmtDate(t.created_at)}
                      {t.last_used_at && ` · Last used ${fmtDate(t.last_used_at)}`}
                      {t.expires_at && ` · Expires ${fmtDate(t.expires_at)}`}
                      {expired && " ⚠️ expired"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => revoke(t.id)}
                    className="p-2 rounded-lg"
                    style={{
                      backgroundColor: "rgba(239,68,68,0.08)",
                      color: "#EF4444",
                    }}
                    aria-label="Revoke"
                    title="Revoke token"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Revoked (collapsed) */}
      {revoked.length > 0 && (
        <details>
          <summary
            className="text-[10px] font-bold uppercase tracking-wider cursor-pointer"
            style={{ color: "#78614E" }}
          >
            Revoked / inactive ({revoked.length})
          </summary>
          <div className="space-y-2 mt-2">
            {revoked.map((t) => (
              <div
                key={t.id}
                className="rounded-lg p-3 flex items-center gap-3 opacity-60"
                style={{
                  backgroundColor: "rgba(0,0,0,0.03)",
                  border: "1px solid rgba(0,0,0,0.04)",
                }}
              >
                <X className="w-4 h-4 flex-shrink-0" style={{ color: "#A8967E" }} />
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-semibold line-through"
                    style={{ color: "#78614E" }}
                  >
                    {t.name}
                  </p>
                  <p className="text-[10px]" style={{ color: "#A8967E" }}>
                    {t.token_prefix}… · Revoked {fmtDate(t.revoked_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
