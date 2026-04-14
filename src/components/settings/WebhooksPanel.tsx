"use client";

/**
 * Webhooks management panel — embedded in /settings.
 *
 * Users can:
 *  - Create webhook (URL + events to subscribe + optional description)
 *  - Copy the secret ONCE (shown after create, never again)
 *  - List existing webhooks with status indicators
 *  - Send a test event to verify wiring
 *  - View recent deliveries per webhook (audit log)
 *  - Delete webhooks
 *
 * Plan-gated server-side (Pro+); if rejected, shows upgrade nudge.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Webhook, Plus, Trash2, Copy, Check, Loader2, AlertCircle,
  Send, ChevronDown, ChevronUp, ExternalLink, X, Activity,
} from "lucide-react";

interface WebhookRow {
  id: string;
  url: string;
  events: string[];
  enabled: boolean;
  description: string | null;
  last_delivery_at: string | null;
  last_delivery_status: number | null;
  consecutive_failures: number;
  created_at: string;
}

interface Delivery {
  id: string;
  event: string;
  http_status: number | null;
  response_body: string | null;
  duration_ms: number | null;
  delivered_at: string;
}

interface TestResult {
  ok: boolean;
  http_status: number | null;
  response_body: string | null;
  duration_ms: number;
}

export default function WebhooksPanel() {
  const [webhooks, setWebhooks] = useState<WebhookRow[]>([]);
  const [supportedEvents, setSupportedEvents] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form state
  const [showForm, setShowForm] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newEvents, setNewEvents] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState<string | null>(null);
  const [upgradeNeeded, setUpgradeNeeded] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);
  const [secretCopied, setSecretCopied] = useState(false);

  // Per-row state
  const [expanded, setExpanded] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<Record<string, Delivery[]>>({});
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, TestResult>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/user/webhooks", { cache: "no-store" });
      if (res.ok) {
        const d = await res.json();
        setWebhooks(d.webhooks ?? []);
        setSupportedEvents(d.supported_events ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    setCreating(true);
    setCreateErr(null);
    setUpgradeNeeded(false);
    try {
      const res = await fetch("/api/user/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: newUrl.trim(),
          events: Array.from(newEvents),
          description: newDesc.trim() || undefined,
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        setCreateErr(d.error ?? "Failed");
        if (d.upgrade_required) setUpgradeNeeded(true);
        return;
      }
      setSecret(d.secret);
      setNewUrl("");
      setNewDesc("");
      setNewEvents(new Set());
      await load();
    } catch (e) {
      setCreateErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setCreating(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this webhook? Receivers will stop getting events immediately.")) return;
    await fetch(`/api/user/webhooks?id=${id}`, { method: "DELETE" });
    await load();
  };

  const sendTest = async (id: string) => {
    setTesting(id);
    try {
      const res = await fetch(`/api/user/webhooks/test?id=${id}`, { method: "POST" });
      const d = await res.json();
      setTestResult((prev) => ({
        ...prev,
        [id]: {
          ok: d.ok,
          http_status: d.http_status,
          response_body: d.response_body,
          duration_ms: d.duration_ms,
        },
      }));
    } finally {
      setTesting(null);
    }
  };

  const loadDeliveries = async (id: string) => {
    const res = await fetch(`/api/user/webhooks/deliveries?webhook_id=${id}&limit=20`, { cache: "no-store" });
    if (res.ok) {
      const d = await res.json();
      setDeliveries((prev) => ({ ...prev, [id]: d.deliveries ?? [] }));
    }
  };

  const toggleExpand = (id: string) => {
    if (expanded === id) {
      setExpanded(null);
    } else {
      setExpanded(id);
      if (!deliveries[id]) loadDeliveries(id);
    }
  };

  const copySecret = async () => {
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret);
      setSecretCopied(true);
      setTimeout(() => setSecretCopied(false), 2000);
    } catch { /* no-op */ }
  };

  // Secret-just-shown screen
  if (secret) {
    return (
      <div
        className="rounded-xl p-5 space-y-4"
        style={{ backgroundColor: "white", border: "1px solid rgba(16,185,129,0.4)" }}
      >
        <div className="flex items-center gap-3">
          <Webhook className="w-6 h-6" style={{ color: "#10B981" }} />
          <div>
            <p className="text-base font-bold" style={{ color: "var(--color-text)" }}>
              Webhook created — save the secret NOW
            </p>
            <p className="text-xs mt-1" style={{ color: "#78614E" }}>
              Use it to verify HMAC signatures on incoming events. Won&apos;t be shown again.
            </p>
          </div>
        </div>

        <div
          className="rounded-lg p-3 font-mono text-xs break-all"
          style={{
            backgroundColor: "#0F0C0A",
            color: "#E8D9C5",
            border: "1px solid rgba(245,158,11,0.3)",
          }}
        >
          {secret}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={copySecret}
            className="flex-1 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2"
            style={{ backgroundColor: "rgba(16,185,129,0.1)", color: "#10B981" }}
          >
            {secretCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {secretCopied ? "Copied" : "Copy secret"}
          </button>
          <button
            type="button"
            onClick={() => setSecret(null)}
            className="flex-1 py-2.5 rounded-lg text-xs font-bold"
            style={{ backgroundColor: "var(--color-text)", color: "white" }}
          >
            I&apos;ve saved it
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Webhook className="w-5 h-5" style={{ color: "var(--color-primary)" }} />
          <h3 className="text-base font-bold" style={{ color: "var(--color-text)" }}>
            Webhooks
          </h3>
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-md"
            style={{
              background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))",
              color: "#1C1814",
            }}
          >
            <Plus className="w-3 h-3" />
            New webhook
          </button>
        )}
      </div>
      <p className="text-xs" style={{ color: "#78614E" }}>
        Get notified at your URL when events happen — post.published, lead.created, etc.
        Each delivery is HMAC-signed with your secret.
      </p>

      {/* Create form */}
      {showForm && (
        <div
          className="rounded-xl p-4 space-y-3"
          style={{ backgroundColor: "white", border: "1px solid rgba(0,0,0,0.06)" }}
        >
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#78614E" }}>
              Create webhook
            </p>
            <button type="button" onClick={() => setShowForm(false)} style={{ color: "#A8967E" }}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <input
            type="url"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="https://your-server.com/webhooks/markethub"
            className="w-full rounded-lg px-3 py-2 text-sm"
            style={{
              backgroundColor: "var(--color-bg)",
              border: "1px solid rgba(245,215,160,0.4)",
              color: "var(--color-text)",
              outline: "none",
            }}
          />
          <input
            type="text"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Description (e.g. 'Production Slack relay')"
            className="w-full rounded-lg px-3 py-2 text-sm"
            style={{
              backgroundColor: "var(--color-bg)",
              border: "1px solid rgba(245,215,160,0.4)",
              color: "var(--color-text)",
              outline: "none",
            }}
          />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "#78614E" }}>
              Events to subscribe ({newEvents.size} selected)
            </p>
            <div className="flex gap-1.5 flex-wrap">
              {supportedEvents.map((e) => {
                const on = newEvents.has(e);
                return (
                  <button
                    key={e}
                    type="button"
                    onClick={() => {
                      const next = new Set(newEvents);
                      if (on) next.delete(e);
                      else next.add(e);
                      setNewEvents(next);
                    }}
                    className="text-[10px] font-mono font-semibold px-2 py-1 rounded-md transition-all"
                    style={{
                      backgroundColor: on ? "var(--color-primary)" : "rgba(0,0,0,0.04)",
                      color: on ? "#1C1814" : "var(--color-text)",
                    }}
                  >
                    {on && <Check className="w-2.5 h-2.5 inline mr-0.5" />}
                    {e}
                  </button>
                );
              })}
            </div>
          </div>

          {createErr && (
            <p className="text-xs flex items-center gap-1" style={{ color: "#EF4444" }}>
              <AlertCircle className="w-3 h-3" />
              {createErr}
              {upgradeNeeded && (
                <Link href="/pricing" className="underline ml-1" style={{ color: "#8B5CF6" }}>
                  Upgrade
                </Link>
              )}
            </p>
          )}

          <button
            type="button"
            onClick={create}
            disabled={creating || !newUrl.trim() || newEvents.size === 0}
            className="w-full py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-40"
            style={{
              background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))",
              color: "#1C1814",
            }}
          >
            {creating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
            Create webhook
          </button>
        </div>
      )}

      {/* List */}
      {loading && webhooks.length === 0 && (
        <div className="text-center py-4">
          <Loader2 className="w-4 h-4 animate-spin inline" style={{ color: "#A8967E" }} />
        </div>
      )}
      {!loading && webhooks.length === 0 && !showForm && (
        <p className="text-xs text-center py-4 rounded-lg"
          style={{ color: "#A8967E", backgroundColor: "rgba(245,215,160,0.05)", border: "1px dashed rgba(245,215,160,0.3)" }}>
          No webhooks yet. Click &quot;New webhook&quot; to register your first endpoint.
        </p>
      )}
      <div className="space-y-2">
        {webhooks.map((wh) => {
          const isExpanded = expanded === wh.id;
          const lastStatusColor = !wh.enabled ? "#EF4444"
            : wh.last_delivery_status && wh.last_delivery_status >= 200 && wh.last_delivery_status < 300 ? "#10B981"
            : wh.last_delivery_status ? "var(--color-primary)"
            : "#A8967E";
          const tr = testResult[wh.id];
          return (
            <div
              key={wh.id}
              className="rounded-lg overflow-hidden"
              style={{ backgroundColor: "white", border: "1px solid rgba(0,0,0,0.06)" }}
            >
              <div className="p-3 flex items-center gap-3">
                <Webhook className="w-4 h-4 flex-shrink-0" style={{ color: lastStatusColor }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-mono font-semibold truncate" style={{ color: "var(--color-text)" }}>
                      {wh.url}
                    </p>
                    {!wh.enabled && (
                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ backgroundColor: "rgba(239,68,68,0.12)", color: "#EF4444" }}>
                        Disabled
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] mt-0.5" style={{ color: "#78614E" }}>
                    {wh.events.length} event{wh.events.length > 1 ? "s" : ""} ·{" "}
                    {wh.last_delivery_at
                      ? `Last: ${new Date(wh.last_delivery_at).toLocaleString()} (HTTP ${wh.last_delivery_status ?? "?"})`
                      : "No deliveries yet"}
                    {wh.consecutive_failures > 0 && (
                      <span style={{ color: "#EF4444" }}> · {wh.consecutive_failures} fails in a row</span>
                    )}
                  </p>
                  {wh.description && (
                    <p className="text-[10px] mt-0.5 italic" style={{ color: "#A8967E" }}>
                      {wh.description}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => sendTest(wh.id)}
                  disabled={testing === wh.id}
                  className="p-1.5 rounded"
                  style={{ backgroundColor: "rgba(99,102,241,0.1)", color: "#6366F1" }}
                  title="Send test event"
                >
                  {testing === wh.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => toggleExpand(wh.id)}
                  className="p-1.5 rounded"
                  style={{ backgroundColor: "rgba(0,0,0,0.04)", color: "#78614E" }}
                  title="Show deliveries"
                >
                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => remove(wh.id)}
                  className="p-1.5 rounded"
                  style={{ backgroundColor: "rgba(239,68,68,0.08)", color: "#EF4444" }}
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Test result */}
              {tr && (
                <div
                  className="px-3 pb-2 text-[11px] flex items-center gap-2"
                  style={{ color: tr.ok ? "#10B981" : "#EF4444" }}
                >
                  {tr.ok ? <Check className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                  Test: HTTP {tr.http_status ?? "?"} in {tr.duration_ms}ms
                  {tr.response_body && (
                    <code className="text-[10px] truncate" style={{ color: "#78614E" }}>
                      {tr.response_body.slice(0, 60)}
                    </code>
                  )}
                </div>
              )}

              {/* Expanded — events + deliveries */}
              {isExpanded && (
                <div
                  className="px-3 py-3 border-t"
                  style={{ borderColor: "rgba(0,0,0,0.06)", backgroundColor: "rgba(245,215,160,0.04)" }}
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "#78614E" }}>
                    Subscribed events
                  </p>
                  <div className="flex gap-1 flex-wrap mb-3">
                    {wh.events.map((e) => (
                      <code
                        key={e}
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: "rgba(245,158,11,0.12)", color: "var(--color-primary-hover)" }}
                      >
                        {e}
                      </code>
                    ))}
                  </div>

                  <p className="text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1" style={{ color: "#78614E" }}>
                    <Activity className="w-3 h-3" />
                    Recent deliveries
                  </p>
                  <div className="space-y-1">
                    {(deliveries[wh.id] ?? []).length === 0 ? (
                      <p className="text-[10px]" style={{ color: "#A8967E" }}>
                        No deliveries yet — click <Send className="inline w-2.5 h-2.5" /> to send a test.
                      </p>
                    ) : (
                      (deliveries[wh.id] ?? []).slice(0, 10).map((d) => {
                        const ok = d.http_status !== null && d.http_status >= 200 && d.http_status < 300;
                        return (
                          <div
                            key={d.id}
                            className="flex items-center gap-2 text-[10px]"
                            style={{ color: ok ? "#10B981" : "#EF4444" }}
                          >
                            <span className="font-bold w-12">{d.http_status ?? "ERR"}</span>
                            <code className="font-mono" style={{ color: "var(--color-text)" }}>{d.event}</code>
                            <span style={{ color: "#A8967E" }}>·</span>
                            <span style={{ color: "#78614E" }}>
                              {new Date(d.delivered_at).toLocaleString()} ({d.duration_ms}ms)
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-[10px] flex items-center gap-1" style={{ color: "#A8967E" }}>
        <ExternalLink className="w-3 h-3" />
        See <Link href="/api/docs" className="underline">/api/docs</Link> for HMAC verification recipe.
      </p>
    </div>
  );
}
