"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, CheckCircle } from "lucide-react";

const ADMIN_PASSWORD = "Market@!hub2026";

export default function AdminSecretLogin() {
  const [status, setStatus] = useState<"checking" | "logging_in" | "success" | "error">("checking");
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const autoLogin = async () => {
      // If already authenticated in this browser, go straight in
      if (typeof window !== "undefined" && localStorage.getItem("admin_authenticated") === "true") {
        setStatus("success");
        router.push("/dashboard/admin");
        return;
      }

      // Auto-submit with stored credentials — no typing needed
      setStatus("logging_in");
      try {
        const response = await fetch("/api/admin-secret-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: ADMIN_PASSWORD }),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Authentication failed");
          setStatus("error");
          return;
        }

        localStorage.setItem("admin_authenticated", "true");
        setStatus("success");
        setTimeout(() => router.push("/dashboard/admin"), 400);
      } catch {
        setError("Connection error. Please try again.");
        setStatus("error");
      }
    };

    autoLogin();
  }, [router]);

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: "#1C1814" }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-8 shadow-2xl text-center"
        style={{ backgroundColor: "#FFFCF7" }}
      >
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div
            className="w-16 h-16 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)" }}
          >
            {status === "success"
              ? <CheckCircle className="w-8 h-8 text-white" />
              : <Lock className="w-8 h-8 text-white" />
            }
          </div>
        </div>

        <h1 className="text-2xl font-bold mb-2" style={{ color: "#292524" }}>
          Admin Access
        </h1>

        {/* Status messages */}
        {status === "checking" && (
          <p className="text-sm" style={{ color: "#A8967E" }}>Checking session...</p>
        )}

        {status === "logging_in" && (
          <div className="space-y-3">
            <p className="text-sm font-medium" style={{ color: "#D97706" }}>Authenticating...</p>
            <div className="flex justify-center gap-1.5">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-2 h-2 rounded-full animate-bounce"
                  style={{ backgroundColor: "#F59E0B", animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        )}

        {status === "success" && (
          <p className="text-sm font-medium" style={{ color: "#16a34a" }}>
            ✅ Access granted — redirecting...
          </p>
        )}

        {status === "error" && (
          <div className="space-y-4">
            <p className="text-sm" style={{ color: "#dc2626" }}>{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-2.5 px-4 rounded-lg text-white font-semibold text-sm"
              style={{ backgroundColor: "#F59E0B" }}
            >
              Try Again
            </button>
          </div>
        )}

        <p className="text-xs mt-6" style={{ color: "#C4AA8A" }}>
          🔒 Private Admin Panel · MarketHub Pro
        </p>
      </div>
    </div>
  );
}
