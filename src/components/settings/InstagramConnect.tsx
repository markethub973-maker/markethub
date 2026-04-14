"use client";

import { useState, useEffect } from "react";
import { Instagram, Loader } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type InstagramConnection = {
  instagram_id: string;
  instagram_username: string;
  instagram_name: string;
  connected_at: string;
};

export default function InstagramConnect() {
  const [connection, setConnection] = useState<InstagramConnection | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    checkInstagramConnection();
  }, []);

  const checkInstagramConnection = async () => {
    try {
      const supabase = createClient();
      const { data: user } = await supabase.auth.getUser();

      if (!user?.user?.id) return;

      const { data } = await supabase
        .from("instagram_connections")
        .select("instagram_id, instagram_username, instagram_name, connected_at")
        .eq("user_id", user.user.id)
        .single();

      if (data) {
        setConnection(data);
      }
    } catch (err) {
      console.error("Error checking Instagram connection:", err);
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    try {
      window.location.href = "/api/auth/instagram";
    } catch (err) {
      setError("Failed to start Instagram login");
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      const supabase = createClient();
      const { data: user } = await supabase.auth.getUser();

      if (!user?.user?.id) return;

      await supabase
        .from("instagram_connections")
        .delete()
        .eq("user_id", user.user.id);

      setConnection(null);
    } catch (err) {
      setError("Failed to disconnect Instagram");
    }
  };

  return (
    <div className="p-6 rounded-lg border" style={{ backgroundColor: "var(--color-bg-secondary)", borderColor: "rgba(245,215,160,0.2)" }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Instagram className="w-6 h-6" style={{ color: "#E4405F" }} />
          <div>
            <h3 className="font-semibold" style={{ color: "var(--color-text)" }}>Instagram Account</h3>
            {connection ? (
              <p className="text-sm" style={{ color: "#78614E" }}>
                @{connection.instagram_username}
              </p>
            ) : (
              <p className="text-sm" style={{ color: "#A8967E" }}>Connect to manage content</p>
            )}
          </div>
        </div>

        {connection ? (
          <button
            onClick={handleDisconnect}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              backgroundColor: "rgba(239,68,68,0.1)",
              color: "#EF4444",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(239,68,68,0.2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(239,68,68,0.1)";
            }}
          >
            Disconnect
          </button>
        ) : (
          <button
            onClick={handleConnect}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
            style={{ backgroundColor: "#E4405F" }}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.opacity = "0.9";
            }}
            onMouseLeave={(e) => {
              if (!loading) e.currentTarget.style.opacity = "1";
            }}
          >
            {loading ? (
              <>
                <Loader className="w-4 h-4 inline mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              "Connect Instagram"
            )}
          </button>
        )}
      </div>

      {error && (
        <p className="text-sm mt-2" style={{ color: "#EF4444" }}>
          {error}
        </p>
      )}

      {connection && (
        <p className="text-xs mt-2" style={{ color: "#A8967E" }}>
          Connected on {new Date(connection.connected_at).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}
