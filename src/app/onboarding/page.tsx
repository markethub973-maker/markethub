"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle2, ArrowRight, Calendar, Sparkles, LayoutDashboard } from "lucide-react";

/* ── Platform definitions ──────────────────────────────────────────────── */
interface Platform {
  id: string;
  name: string;
  icon: string;
  color: string;
  colorBg: string;
  connectUrl: string;
  checkTable: "profiles" | "instagram_connections" | "tiktok_connections";
  checkField: string;
  usernameField?: string;
}

const PLATFORMS: Platform[] = [
  {
    id: "instagram",
    name: "Instagram",
    icon: "📷",
    color: "#E1306C",
    colorBg: "rgba(225,48,108,0.12)",
    connectUrl: "/api/auth/instagram",
    checkTable: "instagram_connections",
    checkField: "instagram_username",
    usernameField: "instagram_username",
  },
  {
    id: "facebook",
    name: "Facebook",
    icon: "📱",
    color: "#1877F2",
    colorBg: "rgba(24,119,242,0.12)",
    connectUrl: "/api/auth/facebook-page/connect",
    checkTable: "profiles",
    checkField: "fb_page_id",
    usernameField: "fb_page_name",
  },
  {
    id: "tiktok",
    name: "TikTok",
    icon: "🎵",
    color: "#00F2EA",
    colorBg: "rgba(0,242,234,0.10)",
    connectUrl: "/api/auth/tiktok",
    checkTable: "profiles",
    checkField: "tiktok_access_token",
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    icon: "💼",
    color: "#0A66C2",
    colorBg: "rgba(10,102,194,0.12)",
    connectUrl: "/api/auth/linkedin-post/connect",
    checkTable: "profiles",
    checkField: "linkedin_access_token",
  },
  {
    id: "youtube",
    name: "YouTube",
    icon: "\u25B6\uFE0F",
    color: "#FF0000",
    colorBg: "rgba(255,0,0,0.10)",
    connectUrl: "/api/auth/youtube/connect",
    checkTable: "profiles",
    checkField: "youtube_access_token",
    usernameField: "youtube_channel_id",
  },
];

/* ── Connected state per platform ──────────────────────────────────────── */
interface ConnectionState {
  connected: boolean;
  username?: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [userName, setUserName] = useState("");
  const [connections, setConnections] = useState<Record<string, ConnectionState>>({});
  const [loading, setLoading] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── Check connections from DB ───────────────────────────────────────── */
  const checkConnections = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const newState: Record<string, ConnectionState> = {};

    // Check profiles fields
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, onboarding_done, fb_page_id, fb_page_name, tiktok_access_token, linkedin_access_token, youtube_access_token, youtube_channel_id")
      .eq("id", user.id)
      .single();

    if (profile?.full_name) setUserName(profile.full_name);

    // If onboarding already done, redirect
    if (profile?.onboarding_done) {
      router.replace("/dashboard");
      return;
    }

    // Check Instagram
    const { data: igConn } = await supabase
      .from("instagram_connections")
      .select("instagram_username")
      .eq("user_id", user.id)
      .single();

    newState.instagram = {
      connected: !!igConn?.instagram_username,
      username: igConn?.instagram_username ? `@${igConn.instagram_username}` : undefined,
    };

    // Facebook
    newState.facebook = {
      connected: !!profile?.fb_page_id,
      username: profile?.fb_page_name || undefined,
    };

    // TikTok
    newState.tiktok = {
      connected: !!profile?.tiktok_access_token,
    };

    // LinkedIn
    newState.linkedin = {
      connected: !!profile?.linkedin_access_token,
    };

    // YouTube
    newState.youtube = {
      connected: !!profile?.youtube_access_token,
      username: profile?.youtube_channel_id || undefined,
    };

    setConnections(newState);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    checkConnections();
  }, [checkConnections]);

  /* ── Poll for new connections when on step 2 ─────────────────────────── */
  useEffect(() => {
    if (step === 2) {
      pollRef.current = setInterval(checkConnections, 2000);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [step, checkConnections]);

  /* ── Auto-skip step 1 if name already set ────────────────────────────── */
  useEffect(() => {
    if (!loading && userName && step === 1) {
      setStep(2);
    }
  }, [loading, userName, step]);

  /* ── Mark onboarding done ────────────────────────────────────────────── */
  const completeOnboarding = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("profiles").update({ onboarding_done: true }).eq("id", user.id);
    }
    localStorage.setItem("mhp-onboarding-complete", "true");
  };

  /* ── Open OAuth popup ────────────────────────────────────────────────── */
  const openConnect = (url: string) => {
    const w = 600;
    const h = 700;
    const left = window.screenX + (window.innerWidth - w) / 2;
    const top = window.screenY + (window.innerHeight - h) / 2;
    window.open(url, "mhp_oauth", `width=${w},height=${h},left=${left},top=${top},toolbar=no,menubar=no`);
  };

  const connectedCount = Object.values(connections).filter((c) => c.connected).length;

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.loader}>
          <div className="animate-spin" style={{ width: 32, height: 32, border: "3px solid rgba(245,158,11,0.3)", borderTopColor: "#F59E0B", borderRadius: "50%" }} />
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Progress dots */}
        <div style={styles.progressBar}>
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              style={{
                width: s === step ? 28 : 10,
                height: 10,
                borderRadius: s === step ? 5 : "50%",
                background:
                  s === step
                    ? "#F59E0B"
                    : s < step
                      ? "rgba(245,158,11,0.5)"
                      : "rgba(200,180,150,0.3)",
                boxShadow: s === step ? "0 0 12px rgba(245,158,11,0.5)" : "none",
                transition: "all 0.3s ease",
              }}
            />
          ))}
        </div>

        {/* ── STEP 1: Welcome ──────────────────────────────────────────── */}
        {step === 1 && (
          <div style={styles.card}>
            <div style={styles.cardInner}>
              <div style={{ fontSize: 56, marginBottom: 16, textAlign: "center" as const }}>
                👋
              </div>
              <h1 style={styles.title}>
                Welcome to MarketHub Pro!
              </h1>
              {userName && (
                <p style={styles.subtitle}>
                  Hey {userName}, ready to save 12 hours every week?
                </p>
              )}
              <p style={styles.description}>
                Let&apos;s connect your accounts in under 2 minutes — then you&apos;re live.
              </p>
              <button
                onClick={() => setStep(2)}
                className="btn-3d-active"
                style={styles.primaryBtn}
              >
                Let&apos;s Go <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Connect Social Accounts ──────────────────────────── */}
        {step === 2 && (
          <div style={styles.card}>
            <div style={styles.cardInner}>
              <div style={{ fontSize: 48, marginBottom: 12, textAlign: "center" as const }}>
                🔗
              </div>
              <h1 style={styles.title}>
                Connect your accounts
              </h1>
              <p style={styles.description}>
                Link your social platforms to unlock analytics, scheduling and more.
              </p>

              {connectedCount > 0 && (
                <div style={styles.connectedBadge}>
                  <CheckCircle2 size={14} />
                  {connectedCount} connected
                </div>
              )}

              <div style={styles.platformList}>
                {PLATFORMS.map((p) => {
                  const state = connections[p.id];
                  const isConnected = state?.connected;
                  return (
                    <button
                      key={p.id}
                      onClick={() => !isConnected && openConnect(p.connectUrl)}
                      style={{
                        ...styles.platformCard,
                        background: isConnected ? "rgba(16,185,129,0.08)" : p.colorBg,
                        borderColor: isConnected ? "rgba(16,185,129,0.3)" : `${p.color}33`,
                        cursor: isConnected ? "default" : "pointer",
                      }}
                    >
                      <span style={{ fontSize: 24, flexShrink: 0 }}>{p.icon}</span>
                      <div style={{ flex: 1, textAlign: "left" as const }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: isConnected ? "#A7F3D0" : "rgba(255,255,255,0.9)" }}>
                          {p.name}
                        </div>
                        <div style={{ fontSize: 11, color: isConnected ? "#10B981" : "rgba(255,255,255,0.35)", marginTop: 2 }}>
                          {isConnected
                            ? (state?.username ? `\u2713 ${state.username}` : "\u2713 Connected")
                            : "Tap to connect"
                          }
                        </div>
                      </div>
                      {isConnected && (
                        <CheckCircle2 size={18} style={{ color: "#10B981", flexShrink: 0 }} />
                      )}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setStep(3)}
                className="btn-3d-active"
                style={styles.primaryBtn}
              >
                Continue <ArrowRight size={16} />
              </button>
              <button
                onClick={() => setStep(3)}
                style={styles.skipLink}
              >
                Skip for now
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: All Set ──────────────────────────────────────────── */}
        {step === 3 && (
          <div style={styles.card}>
            <div style={styles.cardInner}>
              <div style={{ fontSize: 56, marginBottom: 16, textAlign: "center" as const }}>
                🎉
              </div>
              <h1 style={styles.title}>
                You&apos;re all set!
              </h1>
              <p style={styles.description}>
                Your account is ready. Here are some things to try first:
              </p>

              <div style={styles.actionGrid}>
                <button
                  onClick={async () => { await completeOnboarding(); router.push("/calendar"); }}
                  style={styles.actionCard}
                >
                  <div style={{ ...styles.actionIcon, background: "rgba(59,130,246,0.12)" }}>
                    <Calendar size={20} style={{ color: "#60A5FA" }} />
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#2D2620" }}>
                    Create your first post
                  </div>
                  <div style={{ fontSize: 11, color: "#A8967E", marginTop: 2 }}>
                    Plan and schedule content
                  </div>
                </button>

                <button
                  onClick={async () => { await completeOnboarding(); router.push("/captions"); }}
                  style={styles.actionCard}
                >
                  <div style={{ ...styles.actionIcon, background: "rgba(168,85,247,0.12)" }}>
                    <Sparkles size={20} style={{ color: "#A78BFA" }} />
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#2D2620" }}>
                    Generate content
                  </div>
                  <div style={{ fontSize: 11, color: "#A8967E", marginTop: 2 }}>
                    Captions, hashtags and more
                  </div>
                </button>

                <button
                  onClick={async () => { await completeOnboarding(); router.push("/dashboard"); }}
                  style={styles.actionCard}
                >
                  <div style={{ ...styles.actionIcon, background: "rgba(245,158,11,0.12)" }}>
                    <LayoutDashboard size={20} style={{ color: "#FBBF24" }} />
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#2D2620" }}>
                    Explore your dashboard
                  </div>
                  <div style={{ fontSize: 11, color: "#A8967E", marginTop: 2 }}>
                    See analytics at a glance
                  </div>
                </button>
              </div>

              <button
                onClick={async () => { await completeOnboarding(); router.push("/dashboard"); }}
                className="btn-3d-active"
                style={styles.primaryBtn}
              >
                Go to Dashboard <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Step indicator */}
        <p style={styles.stepText}>
          Step {step} of 3
        </p>
      </div>
    </div>
  );
}

/* ── Styles ────────────────────────────────────────────────────────────── */
const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100dvh",
    background: "linear-gradient(180deg, #FFFCF7 0%, #FFF8EE 50%, #FFF5E6 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  loader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  container: {
    width: "100%",
    maxWidth: 500,
  },
  progressBar: {
    display: "flex",
    justifyContent: "center",
    gap: 8,
    marginBottom: 32,
  },
  card: {
    background: "white",
    border: "1px solid rgba(200,180,150,0.25)",
    borderRadius: 20,
    boxShadow: "0 8px 32px rgba(120,97,78,0.08)",
    overflow: "hidden",
  },
  cardInner: {
    padding: "32px 24px",
  },
  title: {
    fontSize: 22,
    fontWeight: 800,
    color: "#2D2620",
    textAlign: "center" as const,
    letterSpacing: "-0.02em",
    marginBottom: 8,
    lineHeight: 1.3,
  },
  subtitle: {
    fontSize: 15,
    color: "#D97706",
    textAlign: "center" as const,
    marginBottom: 4,
    fontWeight: 600,
  },
  description: {
    fontSize: 14,
    color: "#78614E",
    textAlign: "center" as const,
    lineHeight: 1.6,
    marginBottom: 24,
  },
  primaryBtn: {
    width: "100%",
    padding: "14px 24px",
    borderRadius: 14,
    fontSize: 15,
    fontWeight: 800,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    cursor: "pointer",
    border: "none",
    marginTop: 8,
  },
  skipLink: {
    width: "100%",
    padding: "10px 0",
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: 13,
    color: "#A8967E",
    textAlign: "center" as const,
    marginTop: 4,
  },
  connectedBadge: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    fontSize: 12,
    fontWeight: 700,
    color: "#10B981",
    marginBottom: 16,
  },
  platformList: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 10,
    marginBottom: 20,
  },
  platformCard: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: "14px 16px",
    borderRadius: 14,
    border: "1px solid",
    width: "100%",
    transition: "all 0.2s ease",
  },
  actionGrid: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 10,
    marginBottom: 20,
  },
  actionCard: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: "16px",
    borderRadius: 14,
    background: "#FFFCF7",
    border: "1px solid rgba(200,180,150,0.25)",
    cursor: "pointer",
    transition: "all 0.2s ease",
    textAlign: "left" as const,
    width: "100%",
    boxShadow: "0 2px 8px rgba(120,97,78,0.06)",
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  stepText: {
    textAlign: "center" as const,
    marginTop: 20,
    fontSize: 12,
    color: "#C4AA8A",
  },
};
