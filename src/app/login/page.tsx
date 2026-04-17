"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Zap, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import GlassCard from "@/components/ui/GlassCard";
import GlassButton from "@/components/ui/GlassButton";
import AmbientBlobs from "@/components/ui/AmbientBlobs";

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
    <div className="app-bg min-h-screen flex items-center justify-center relative overflow-hidden">
      <AmbientBlobs />

      <div className="w-full max-w-md px-6 relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
            style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-hover, var(--accent)))" }}
          >
            <Zap className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-glass-primary">MarketHub Pro</h1>
          <p className="text-sm mt-1 text-glass-muted">Social Video Intelligence</p>
        </div>

        {/* Card */}
        <GlassCard accent padding="p-8">
          <h2 className="text-xl font-bold mb-1 text-glass-primary">Welcome back!</h2>
          <p className="text-sm mb-6 text-glass-secondary">Sign into your account</p>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div>
              <label className="text-xs font-semibold mb-1.5 block text-glass-secondary">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-glass-muted" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  required
                  className="input-glass w-full pl-10 pr-4 py-3 text-sm rounded-lg"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-xs font-semibold mb-1.5 block text-glass-secondary">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-glass-muted" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="input-glass w-full pl-10 pr-10 py-3 text-sm rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-glass-muted"
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
            <GlassButton
              type="submit"
              variant="primary"
              size="lg"
              disabled={loading}
              className="w-full font-bold"
              style={{ opacity: loading ? 0.7 : 1 }}
            >
              {loading ? "Loading..." : "Sign in"}
            </GlassButton>
          </form>

          <p className="text-center text-xs mt-5 text-glass-muted">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-semibold" style={{ color: "var(--accent)" }}>
              Sign up free
            </Link>
          </p>
        </GlassCard>

        <p className="text-center text-xs mt-6 text-glass-muted">
          &copy; 2026 MarketHub Pro &middot;{" "}
          <a href="/privacy" style={{ color: "var(--accent)" }}>Privacy</a> &middot;{" "}
          <a href="/terms" style={{ color: "var(--accent)" }}>Terms</a>
        </p>
      </div>
    </div>
  );
}
