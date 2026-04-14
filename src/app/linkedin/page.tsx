"use client";
import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import { Loader2, Calendar, LogOut, CheckCircle2, Linkedin } from "lucide-react";
import Link from "next/link";

const card = { backgroundColor: "var(--color-bg-secondary)", border: "1px solid rgba(245,215,160,0.25)", borderRadius: 12 };

type LinkedInProfile = {
  sub: string;
  name: string;
  given_name: string;
  family_name: string;
  email: string;
  email_verified: boolean;
  picture: string;
  locale: { country?: string; language?: string } | string | null;
};

type ApiResponse =
  | { connected: true; profile: LinkedInProfile }
  | { connected: false; error?: string; connect_url: string };

export default function LinkedInPage() {
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<ApiResponse | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/linkedin");
      const data: ApiResponse = await res.json();
      setState(data);
    } catch {
      setState({ connected: false, connect_url: "/api/auth/linkedin-post/connect" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const disconnect = async () => {
    if (!confirm("Disconnect your LinkedIn account? You will need to reconnect in order to post to LinkedIn from the Calendar.")) return;
    setDisconnecting(true);
    try {
      await fetch("/api/auth/linkedin-post/disconnect", { method: "POST" });
      await load();
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FAFAF8" }}>
      <Header title="LinkedIn Account" subtitle="Your connected LinkedIn profile for automatic publishing" />
      <div className="p-4 max-w-2xl mx-auto space-y-4">

        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#0A66C2" }} />
          </div>
        )}

        {/* Not connected */}
        {!loading && state && !state.connected && (
          <div className="rounded-2xl p-6 text-center" style={card}>
            <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: "rgba(10,102,194,0.1)" }}>
              <Linkedin className="w-7 h-7" style={{ color: "#0A66C2" }} />
            </div>
            <h2 className="text-lg font-bold mb-1" style={{ color: "var(--color-text)" }}>Connect your LinkedIn account</h2>
            <p className="text-sm mb-5" style={{ color: "#78614E" }}>
              Connect with LinkedIn so you can automatically publish posts from the Calendar directly to your profile.
            </p>
            {state.error && (
              <p className="text-sm mb-4" style={{ color: "#EF4444" }}>{state.error}</p>
            )}
            <a href={state.connect_url}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white"
              style={{ backgroundColor: "#0A66C2" }}>
              <Linkedin className="w-4 h-4" />
              Connect with LinkedIn
            </a>
          </div>
        )}

        {/* Connected */}
        {!loading && state?.connected && (
          <>
            <div className="rounded-2xl p-6 space-y-5" style={card}>
              <div className="flex items-start gap-4">
                {state.profile.picture ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={state.profile.picture} alt={state.profile.name}
                    className="w-20 h-20 rounded-full object-cover shrink-0"
                    style={{ border: "2px solid rgba(10,102,194,0.3)" }} />
                ) : (
                  <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold shrink-0"
                    style={{ backgroundColor: "rgba(10,102,194,0.1)", color: "#0A66C2" }}>
                    {state.profile.name?.[0] ?? "?"}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="font-bold text-xl" style={{ color: "var(--color-text)" }}>{state.profile.name}</h2>
                    <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: "#10B981" }} />
                  </div>
                  {state.profile.email && (
                    <p className="text-sm" style={{ color: "#78614E" }}>
                      {state.profile.email}
                      {state.profile.email_verified && (
                        <span className="ml-2 text-xs font-medium" style={{ color: "#10B981" }}>✓ verified</span>
                      )}
                    </p>
                  )}
                  <p className="text-xs mt-2" style={{ color: "#A8967E" }}>
                    Connected with scope <code>w_member_social</code> — allows publishing posts
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link href="/calendar"
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-white"
                style={{ backgroundColor: "#0A66C2" }}>
                <Calendar className="w-4 h-4" />
                Post from Calendar
              </Link>
              <button type="button" onClick={disconnect} disabled={disconnecting}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold disabled:opacity-50"
                style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.2)" }}>
                {disconnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                Disconnect
              </button>
            </div>

            {/* Info box — be honest about what this integration does */}
            <div className="rounded-xl p-4 text-sm" style={{ backgroundColor: "rgba(10,102,194,0.06)", border: "1px solid rgba(10,102,194,0.15)", color: "#78614E" }}>
              <p className="font-medium mb-1" style={{ color: "var(--color-text)" }}>What can I do with the LinkedIn integration?</p>
              <ul className="space-y-1 text-xs">
                <li>• Publish text + image posts directly from the Calendar</li>
                <li>• Post to your personal profile (not Company Pages)</li>
              </ul>
              <p className="mt-3 text-xs" style={{ color: "#A8967E" }}>
                LinkedIn does not expose followers/connections/headline publicly via OAuth — analytics requires a separate app reviewed under the Marketing Developer Platform.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
