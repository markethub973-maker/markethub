"use client";

/**
 * Admin 2FA enrollment panel.
 *
 * Three states:
 *  - LOADING: fetching status
 *  - DISABLED: shows "Enable 2FA" button, walks through enroll flow
 *  - ENABLED: shows status + "Disable" button (requires current code)
 *
 * Enroll flow:
 *  1. Click Enable → GET /api/admin/2fa/enroll → server returns secret + QR
 *  2. User scans QR with Authenticator app
 *  3. User enters first 6-digit code → POST /api/admin/2fa/enroll
 *  4. Server confirms + returns 8 recovery codes (shown ONCE)
 *  5. User downloads/copies recovery codes → done
 */

import { useCallback, useEffect, useState } from "react";
import { Shield, ShieldCheck, Loader2, Copy, Check, AlertTriangle, X, Download } from "lucide-react";

interface Status {
  enrolled: boolean;
  enabled_at: string | null;
  last_used_at: string | null;
  recovery_codes_remaining: number;
}

interface EnrollData {
  secret_b32: string;
  otpauth_url: string;
  qr_data_url: string;
}

export default function Admin2FAPanel() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrollData, setEnrollData] = useState<EnrollData | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [disableMode, setDisableMode] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/2fa/status", { cache: "no-store" });
      if (res.ok) {
        const d = await res.json();
        setStatus(d.status);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const startEnroll = async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/2fa/enroll", { cache: "no-store" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Failed");
      setEnrollData(d);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const confirmEnroll = async () => {
    if (!enrollData) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/2fa/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret_b32: enrollData.secret_b32, code }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Failed");
      setRecoveryCodes(d.recovery_codes ?? []);
      setEnrollData(null);
      setCode("");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const doDisable = async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Failed");
      setDisableMode(false);
      setCode("");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const copyRecovery = async () => {
    if (!recoveryCodes) return;
    try {
      await navigator.clipboard.writeText(recoveryCodes.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* no-op */
    }
  };

  const downloadRecovery = () => {
    if (!recoveryCodes) return;
    const blob = new Blob(
      [
        `MarketHub Pro — Admin 2FA Recovery Codes\n` +
          `Generated: ${new Date().toISOString()}\n` +
          `Each code can be used ONCE if you lose access to your authenticator.\n\n` +
          recoveryCodes.join("\n"),
      ],
      { type: "text/plain" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `markethub-2fa-recovery-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Recovery codes shown after successful enrollment ────────────────────
  if (recoveryCodes) {
    return (
      <div
        className="rounded-xl p-5 space-y-4"
        style={{
          backgroundColor: "white",
          border: "1px solid rgba(245,158,11,0.4)",
        }}
      >
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-6 h-6 flex-shrink-0" style={{ color: "#10B981" }} />
          <div className="flex-1">
            <p className="text-base font-bold" style={{ color: "var(--color-text)" }}>
              2FA enabled — save these recovery codes NOW
            </p>
            <p className="text-xs mt-1" style={{ color: "#78614E" }}>
              Each code can be used <strong>once</strong> if you lose access to your
              authenticator app. They will <strong>not</strong> be shown again.
            </p>
          </div>
        </div>

        <div
          className="rounded-lg p-4 grid grid-cols-2 gap-2 font-mono text-sm"
          style={{
            backgroundColor: "rgba(245,158,11,0.06)",
            border: "1px dashed rgba(245,158,11,0.4)",
            color: "var(--color-text)",
          }}
        >
          {recoveryCodes.map((c, i) => (
            <div key={i}>
              <span style={{ color: "#A8967E" }}>{(i + 1).toString().padStart(2, "0")}.</span> {c}
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={copyRecovery}
            className="flex-1 inline-flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold"
            style={{ backgroundColor: "rgba(16,185,129,0.1)", color: "#10B981" }}
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? "Copied!" : "Copy all"}
          </button>
          <button
            type="button"
            onClick={downloadRecovery}
            className="flex-1 inline-flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold"
            style={{ backgroundColor: "rgba(99,102,241,0.1)", color: "#6366F1" }}
          >
            <Download className="w-3 h-3" />
            Download .txt
          </button>
        </div>

        <button
          type="button"
          onClick={() => setRecoveryCodes(null)}
          className="w-full py-2.5 rounded-lg text-xs font-bold"
          style={{ backgroundColor: "var(--color-text)", color: "white" }}
        >
          I&apos;ve saved them — done
        </button>
      </div>
    );
  }

  // ── Enrollment in progress: show QR + ask for first code ────────────────
  if (enrollData) {
    return (
      <div
        className="rounded-xl p-5 space-y-4"
        style={{ backgroundColor: "white", border: "1px solid rgba(245,158,11,0.3)" }}
      >
        <div className="flex items-start gap-3">
          <Shield className="w-6 h-6 flex-shrink-0" style={{ color: "var(--color-primary)" }} />
          <div className="flex-1">
            <p className="text-base font-bold" style={{ color: "var(--color-text)" }}>
              Scan with your authenticator app
            </p>
            <p className="text-xs mt-1" style={{ color: "#78614E" }}>
              Use Google Authenticator, 1Password, Bitwarden, or any TOTP app.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setEnrollData(null);
              setCode("");
            }}
            className="p-1 rounded"
            style={{ color: "#78614E" }}
            aria-label="Cancel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col items-center gap-3">
          <img
            src={enrollData.qr_data_url}
            alt="2FA QR code"
            width={240}
            height={240}
            className="rounded-lg"
            style={{ border: "1px solid rgba(0,0,0,0.06)" }}
          />
          <details className="w-full">
            <summary
              className="text-[10px] font-bold uppercase cursor-pointer text-center"
              style={{ color: "#78614E" }}
            >
              Can&apos;t scan? Enter manually
            </summary>
            <code
              className="block mt-2 text-xs p-2 rounded text-center break-all"
              style={{ backgroundColor: "rgba(0,0,0,0.06)", color: "var(--color-text)" }}
            >
              {enrollData.secret_b32}
            </code>
          </details>
        </div>

        <div>
          <label
            className="block text-xs font-semibold mb-1"
            style={{ color: "#78614E" }}
          >
            Enter the 6-digit code from your app to confirm
          </label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            inputMode="numeric"
            autoComplete="one-time-code"
            className="w-full text-center text-xl font-mono tracking-widest rounded-lg px-3 py-3"
            style={{
              backgroundColor: "white",
              border: "1px solid rgba(245,215,160,0.4)",
              color: "var(--color-text)",
              outline: "none",
            }}
          />
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

        <button
          type="button"
          onClick={confirmEnroll}
          disabled={busy || code.length !== 6}
          className="w-full py-3 rounded-xl text-sm font-bold disabled:opacity-40"
          style={{
            background: "linear-gradient(135deg, #10B981, #059669)",
            color: "white",
          }}
        >
          {busy ? <Loader2 className="w-4 h-4 inline animate-spin mr-2" /> : null}
          Enable 2FA
        </button>
      </div>
    );
  }

  // ── Disable confirmation ────────────────────────────────────────────────
  if (disableMode) {
    return (
      <div
        className="rounded-xl p-5 space-y-4"
        style={{ backgroundColor: "white", border: "1px solid rgba(239,68,68,0.3)" }}
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 flex-shrink-0" style={{ color: "#EF4444" }} />
          <div className="flex-1">
            <p className="text-base font-bold" style={{ color: "var(--color-text)" }}>
              Disable 2FA
            </p>
            <p className="text-xs mt-1" style={{ color: "#78614E" }}>
              Enter your current 6-digit code (or a recovery code) to confirm.
            </p>
          </div>
        </div>

        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="6-digit code or recovery code"
          inputMode="numeric"
          autoComplete="one-time-code"
          className="w-full text-center text-xl font-mono tracking-widest rounded-lg px-3 py-3"
          style={{
            backgroundColor: "white",
            border: "1px solid rgba(239,68,68,0.3)",
            color: "var(--color-text)",
            outline: "none",
          }}
        />

        {err && (
          <p
            className="text-xs flex items-center gap-1"
            style={{ color: "#EF4444" }}
          >
            <AlertTriangle className="w-3 h-3" />
            {err}
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setDisableMode(false);
              setCode("");
              setErr(null);
            }}
            className="flex-1 py-2.5 rounded-lg text-xs font-bold"
            style={{ backgroundColor: "rgba(0,0,0,0.06)", color: "var(--color-text)" }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={doDisable}
            disabled={busy || code.length < 6}
            className="flex-1 py-2.5 rounded-lg text-xs font-bold disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #EF4444, #B91C1C)", color: "white" }}
          >
            {busy ? <Loader2 className="w-4 h-4 inline animate-spin mr-1" /> : null}
            Disable 2FA
          </button>
        </div>
      </div>
    );
  }

  // ── Default: show status + actions ──────────────────────────────────────
  if (loading) {
    return (
      <div className="rounded-xl p-6 flex justify-center" style={{ backgroundColor: "white" }}>
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#A8967E" }} />
      </div>
    );
  }

  if (status?.enrolled) {
    return (
      <div
        className="rounded-xl p-5 space-y-3"
        style={{ backgroundColor: "white", border: "1px solid rgba(16,185,129,0.3)" }}
      >
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-6 h-6" style={{ color: "#10B981" }} />
          <div className="flex-1">
            <p className="text-base font-bold" style={{ color: "var(--color-text)" }}>
              2FA Enabled
            </p>
            <p className="text-xs" style={{ color: "#78614E" }}>
              Enabled {status.enabled_at ? new Date(status.enabled_at).toLocaleDateString() : ""} ·
              {" "}{status.recovery_codes_remaining} recovery code(s) remaining
              {status.last_used_at && ` · last used ${new Date(status.last_used_at).toLocaleDateString()}`}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDisableMode(true)}
          className="text-xs font-bold underline"
          style={{ color: "#EF4444" }}
        >
          Disable 2FA
        </button>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl p-5"
      style={{ backgroundColor: "white", border: "1px dashed rgba(245,158,11,0.4)" }}
    >
      <div className="flex items-start gap-3 mb-4">
        <Shield className="w-6 h-6 flex-shrink-0" style={{ color: "var(--color-primary)" }} />
        <div className="flex-1">
          <p className="text-base font-bold" style={{ color: "var(--color-text)" }}>
            Two-Factor Authentication
          </p>
          <p className="text-xs mt-1" style={{ color: "#78614E" }}>
            Add an extra layer of security to admin login. Requires a TOTP
            authenticator app (Google Authenticator, 1Password, Bitwarden, etc.).
          </p>
        </div>
      </div>
      {err && (
        <p className="text-xs mb-3" style={{ color: "#EF4444" }}>
          {err}
        </p>
      )}
      <button
        type="button"
        onClick={startEnroll}
        disabled={busy}
        className="w-full py-3 rounded-xl text-sm font-bold disabled:opacity-40"
        style={{
          background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))",
          color: "#1C1814",
        }}
      >
        {busy ? <Loader2 className="w-4 h-4 inline animate-spin mr-2" /> : <Shield className="w-4 h-4 inline mr-2" />}
        Enable 2FA
      </button>
    </div>
  );
}
