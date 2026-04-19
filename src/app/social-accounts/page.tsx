"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Instagram, Linkedin, Youtube } from "lucide-react";
import Link from "next/link";

interface Connection {
  platform: string;
  username: string;
  connected: boolean;
}

export default function SocialAccountsPage() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [plan, setPlan] = useState("free_test");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;

      // Get plan
      const { data: profile } = await supabase
        .from("profiles")
        .select("plan, instagram_user_id, linkedin_access_token")
        .eq("id", user.id)
        .single();

      if (profile) {
        setPlan(profile.plan || "free_test");
      }

      // Get Instagram connections
      const { data: igConns } = await supabase
        .from("instagram_connections")
        .select("instagram_username")
        .eq("user_id", user.id);

      // Get TikTok connections
      const { data: tkConns } = await supabase
        .from("tiktok_connections")
        .select("display_name")
        .eq("user_id", user.id);

      // Get YouTube connections
      const { data: ytConns } = await supabase
        .from("youtube_connections")
        .select("channel_name")
        .eq("user_id", user.id);

      const conns: Connection[] = [];

      // Instagram
      if (igConns?.length) {
        igConns.forEach(c => conns.push({ platform: "Instagram", username: c.instagram_username, connected: true }));
      }

      // LinkedIn
      if (profile?.linkedin_access_token) {
        conns.push({ platform: "LinkedIn", username: "Connected", connected: true });
      }

      // TikTok
      if (tkConns?.length) {
        tkConns.forEach(c => conns.push({ platform: "TikTok", username: c.display_name, connected: true }));
      }

      // YouTube
      if (ytConns?.length) {
        ytConns.forEach(c => conns.push({ platform: "YouTube", username: c.channel_name, connected: true }));
      }

      setConnections(conns);
      setLoading(false);
    });
  }, []);

  const PLAN_LIMITS: Record<string, { ig: number; tiktok: boolean; youtube: boolean; linkedin: boolean }> = {
    free_forever: { ig: 1, tiktok: false, youtube: false, linkedin: false },
    free_test: { ig: 2, tiktok: false, youtube: false, linkedin: true },
    lite: { ig: 2, tiktok: true, youtube: false, linkedin: true },
    pro: { ig: 4, tiktok: true, youtube: true, linkedin: true },
    business: { ig: 10, tiktok: true, youtube: true, linkedin: true },
    agency: { ig: 999, tiktok: true, youtube: true, linkedin: true },
  };

  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free_test;
  const igCount = connections.filter(c => c.platform === "Instagram").length;

  const platforms = [
    { name: "Instagram", icon: Instagram, color: "#E1306C", connectUrl: "/api/auth/instagram/connect", allowed: true, limit: limits.ig, count: igCount },
    { name: "LinkedIn", icon: Linkedin, color: "#0A66C2", connectUrl: "/api/auth/linkedin-post/connect", allowed: limits.linkedin, limit: 1, count: connections.filter(c => c.platform === "LinkedIn").length },
    { name: "TikTok", icon: null, color: "#000000", connectUrl: "/api/auth/tiktok", allowed: limits.tiktok, limit: 1, count: connections.filter(c => c.platform === "TikTok").length },
    { name: "YouTube", icon: Youtube, color: "#FF0000", connectUrl: "/api/auth/youtube/connect", allowed: limits.youtube, limit: 1, count: connections.filter(c => c.platform === "YouTube").length },
  ];

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "40px 24px" }}>
      <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--color-text)" }}>Social Accounts</h1>
      <p className="text-sm mb-6" style={{ color: "var(--color-text-secondary)" }}>
        Connect your social media accounts to publish content automatically.
      </p>

      <div className="space-y-3">
        {platforms.map(p => {
          const connected = connections.filter(c => c.platform === p.name);
          return (
            <div key={p.name} className="rounded-xl p-4" style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)" }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {p.icon ? <p.icon size={24} color={p.color} /> : <span style={{ fontSize: 20 }}>🎵</span>}
                  <div>
                    <h3 className="font-semibold text-sm" style={{ color: "var(--color-text)" }}>{p.name}</h3>
                    {connected.length > 0 ? (
                      <p className="text-xs" style={{ color: "var(--color-success, #10B981)" }}>
                        {connected.map(c => c.username).join(", ")}
                      </p>
                    ) : (
                      <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Not connected</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {p.allowed ? (
                    <>
                      {p.count < p.limit && (
                        <Link
                          href={p.connectUrl}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium"
                          style={{ background: p.color, color: "#fff" }}
                        >
                          {connected.length > 0 ? "Add Another" : "Connect"}
                        </Link>
                      )}
                      <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                        {p.count}/{p.limit === 999 ? "∞" : p.limit}
                      </span>
                    </>
                  ) : (
                    <span className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: "var(--color-bg-tertiary)", color: "var(--color-text-muted)" }}>
                      Upgrade to unlock
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {loading && <p className="text-center mt-4 text-sm" style={{ color: "var(--color-text-muted)" }}>Loading...</p>}
    </div>
  );
}
