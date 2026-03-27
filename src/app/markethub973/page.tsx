"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminSecretLogin() {
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState("");
  const router = useRouter();

  // If already authenticated, go straight to admin
  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("admin_authenticated") === "true") {
      router.replace("/dashboard/admin");
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setStatus("loading");
    setError("");

    try {
      const res = await fetch("/api/admin-secret-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Wrong password");
        setStatus("error");
        setPassword("");
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
                autoFocus
                disabled={status === "loading"}
                className="w-full px-4 py-3 rounded-xl text-sm font-medium focus:outline-none"
                style={{
                  border: error ? "1px solid #dc2626" : "1px solid #E8D9C5",
                  backgroundColor: "#FFF8F0",
                  color: "#292524",
                }}
                onKeyDown={e => e.key === "Enter" && handleSubmit(e as unknown as React.FormEvent)}
              />
              {error && (
                <p className="text-xs mt-1.5" style={{ color: "#dc2626" }}>{error}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={status === "loading" || !password.trim()}
              className="w-full py-3 rounded-xl text-sm font-bold transition-opacity disabled:opacity-50"
              style={{ backgroundColor: "#F59E0B", color: "#1C1814" }}
            >
              {status === "loading" ? "Verifying..." : "Enter"}
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
