"use client";

/**
 * Login page for the private brain.markethubpromo.com command center.
 * Shown when no `brain_admin` cookie is present on that subdomain.
 */

import { useState } from "react";
import { Lock, Loader2 } from "lucide-react";

export default function BrainLogin() {
  const [pwd, setPwd] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/brain-admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pwd }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Login failed");
      }
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: "#0F0F14", color: "white", fontFamily: "system-ui, sans-serif" }}
    >
      <form
        onSubmit={submit}
        className="w-full max-w-sm p-8 rounded-2xl"
        style={{ backgroundColor: "#1A1A24", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
          style={{ backgroundColor: "#F59E0B" }}
        >
          <Lock className="w-5 h-5 text-black" />
        </div>
        <h1 className="text-xl font-bold text-center mb-1">Brain Command Center</h1>
        <p className="text-xs text-center mb-6" style={{ color: "#888" }}>
          alex@markethubpromo.com · private
        </p>
        <input
          type="password"
          placeholder="Password"
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
          autoFocus
          required
          className="w-full px-3 py-2 rounded-md text-sm mb-3"
          style={{
            backgroundColor: "#0F0F14",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "white",
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={loading || !pwd}
          className="w-full py-2 rounded-md font-bold text-sm disabled:opacity-50 inline-flex items-center justify-center gap-2"
          style={{ backgroundColor: "#F59E0B", color: "black" }}
        >
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Authenticating...</> : "Enter"}
        </button>
        {error && (
          <p className="text-xs font-semibold text-center mt-3" style={{ color: "#F87171" }}>
            {error}
          </p>
        )}
      </form>
    </div>
  );
}
