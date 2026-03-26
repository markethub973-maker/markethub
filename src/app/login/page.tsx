"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Zap, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError("Incorrect email or password.");
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#FFF8F0" }}>
      <div className="w-full max-w-md px-6">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
            style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)" }}
          >
            <Zap className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: "#292524" }}>MarketHub Pro</h1>
          <p className="text-sm mt-1" style={{ color: "#A8967E" }}>Social Video Intelligence</p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8"
          style={{
            backgroundColor: "#FFFCF7",
            border: "1px solid rgba(245,215,160,0.35)",
            boxShadow: "0 4px 24px rgba(120,97,78,0.12)",
          }}
        >
          <h2 className="text-xl font-bold mb-1" style={{ color: "#292524" }}>Welcome back!</h2>
          <p className="text-sm mb-6" style={{ color: "#A8967E" }}>Sign into your account</p>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: "#78614E" }}>
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#C4AA8A" }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  required
                  className="w-full pl-10 pr-4 py-3 text-sm rounded-lg focus:outline-none transition-all"
                  style={{ border: "1px solid rgba(245,215,160,0.4)", backgroundColor: "#FFF8F0", color: "#292524" }}
                  onFocus={(e) => (e.currentTarget.style.border = "1px solid #F59E0B")}
                  onBlur={(e) => (e.currentTarget.style.border = "1px solid rgba(245,215,160,0.4)")}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: "#78614E" }}>
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#C4AA8A" }} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full pl-10 pr-10 py-3 text-sm rounded-lg focus:outline-none transition-all"
                  style={{ border: "1px solid rgba(245,215,160,0.4)", backgroundColor: "#FFF8F0", color: "#292524" }}
                  onFocus={(e) => (e.currentTarget.style.border = "1px solid #F59E0B")}
                  onBlur={(e) => (e.currentTarget.style.border = "1px solid rgba(245,215,160,0.4)")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "#C4AA8A" }}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                className="text-sm px-3 py-2 rounded-lg"
                style={{ backgroundColor: "rgba(239,68,68,0.08)", color: "#dc2626", border: "1px solid rgba(239,68,68,0.2)" }}
              >
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg text-sm font-bold transition-opacity"
              style={{ backgroundColor: "#F59E0B", color: "#1C1814", opacity: loading ? 0.7 : 1 }}
            >
              {loading ? "Loading..." : "Sign in"}
            </button>
          </form>

          <p className="text-center text-xs mt-5" style={{ color: "#A8967E" }}>
            Don't have an account?{" "}
            <Link href="/register" style={{ color: "#F59E0B", fontWeight: 600 }}>
              Sign up free
            </Link>
          </p>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: "#C4AA8A" }}>
          © 2026 MarketHub Pro ·{" "}
          <a href="/privacy" style={{ color: "#F59E0B" }}>Privacy</a> ·{" "}
          <a href="/terms" style={{ color: "#F59E0B" }}>Terms</a>
        </p>
      </div>
    </div>
  );
}
