"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminSecretLogin() {
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [needs2FA, setNeeds2FA] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState("");
  const router = useRouter();

  // If still authenticated (cookie valid), go straight to admin. Don't trust
  // localStorage alone — admin_session_token expires after 8h and when it does
  // the localStorage flag is stale, so auto-redirecting without checking the
  // cookie leaves the user stuck in a loop: they land on /markethub973, get
  // bounced to /dashboard/admin, admin features 404 because the cookie is
  // gone, they come back to /markethub973, and bounce again. Verify against
  // the server before redirecting.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("admin_authenticated") !== "true") return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin-session-check", { cache: "no-store" });
        if (cancelled) return;
        if (res.ok) {
          router.replace("/dashboard/admin");
        } else {
          // Cookie expired — clear the stale localStorage flag so the user
          // sees the password form instead of being bounced in a loop.
          localStorage.removeItem("admin_authenticated");
        }
      } catch {
        // Network error — leave the form visible so the user can retry.
      }
    })();
    return () => { cancelled = true; };
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    if (needs2FA && !totpCode.trim()) return;

    setStatus("loading");
    setError("");

    try {
      const res = await fetch("/api/admin-secret-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password,
          ...(needs2FA && { totp_code: totpCode.trim() }),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Server requested a second factor — show the TOTP input
        if (data.needs_2fa) {
          setNeeds2FA(true);
          setStatus("idle");
          if (needs2FA) {
            // Already in 2FA step → must be a bad code
            setError(data.error || "Invalid 2FA code");
            setTotpCode("");
          }
          return;
        }
        setError(data.error || "Wrong password");
        setStatus("error");
        setPassword("");
        setTotpCode("");
        setNeeds2FA(false);
        return;
      }

      localStorage.setItem("admin_authenticated", "true");
      setStatus("success");
      setTimeout(() => router.replace("/dashboard/admin"), 300);
    } catch {
      setError("Connection error. Try again.");
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "#1C1814" }}>
      <div className="w-full max-w-sm rounded-2xl p-8 shadow-2xl" style={{ backgroundColor: "#FFFCF7" }}>

        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)" }}>
            <span className="text-white text-2xl font-bold">M</span>
          </div>
        </div>

        <h1 className="text-xl font-bold text-center mb-1" style={{ color: "#292524" }}>Admin Access</h1>
        <p className="text-center text-sm mb-6" style={{ color: "#A8967E" }}>MarketHub Pro</p>

        {status === "success" ? (
          <p className="text-center text-sm font-semibold" style={{ color: "#16a34a" }}>
            ✅ Access granted — entering...
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Admin password"
                autoFocus={!needs2FA}
                disabled={status === "loading" || needs2FA}
                className="w-full px-4 py-3 rounded-xl text-sm font-medium focus:outline-none"
                style={{
                  border: (error && !needs2FA) ? "1px solid #dc2626" : "1px solid #E8D9C5",
                  backgroundColor: needs2FA ? "rgba(232,217,197,0.3)" : "#FFF8F0",
                  color: "#292524",
                }}
                onKeyDown={e => e.key === "Enter" && handleSubmit(e as unknown as React.FormEvent)}
              />
            </div>

            {needs2FA && (
              <div>
                <p className="text-xs mb-2" style={{ color: "#78614E" }}>
                  Enter the 6-digit code from your authenticator app (or a recovery code).
                </p>
                <input
                  type="text"
                  value={totpCode}
                  onChange={e => setTotpCode(e.target.value)}
                  placeholder="000000"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  disabled={status === "loading"}
                  maxLength={11}
                  className="w-full px-4 py-3 rounded-xl text-center text-xl font-mono tracking-widest focus:outline-none"
                  style={{
                    border: error ? "1px solid #dc2626" : "1px solid #F59E0B",
                    backgroundColor: "#FFF8F0",
                    color: "#292524",
                  }}
                  onKeyDown={e => e.key === "Enter" && handleSubmit(e as unknown as React.FormEvent)}
                />
              </div>
            )}

            {error && (
              <p className="text-xs" style={{ color: "#dc2626" }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={status === "loading" || !password.trim() || (needs2FA && totpCode.length < 6)}
              className="w-full py-3 rounded-xl text-sm font-bold transition-opacity disabled:opacity-50"
              style={{ backgroundColor: "#F59E0B", color: "#1C1814" }}
            >
              {status === "loading" ? "Verifying..." : needs2FA ? "Verify 2FA" : "Enter"}
            </button>
          </form>
        )}

        <p className="text-center text-xs mt-6" style={{ color: "#C4AA8A" }}>
          🔒 Private · MarketHub Pro
        </p>
      </div>
    </div>
  );
}
