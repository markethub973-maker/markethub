"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, XCircle, ExternalLink, Loader2, ChevronDown, ChevronUp, PlayCircle, Instagram, Globe, Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Connection {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  colorBg: string;
  colorBorder: string;
  description: string;
  connectUrl: string;
  what_you_get: string[];
  how_to: string[];
  connected: boolean;
  connectedAs?: string;
  loading: boolean;
}

export default function AccountConnections() {
  const [connections, setConnections] = useState<Connection[]>([
    {
      id: "youtube",
      name: "YouTube",
      icon: <PlayCircle size={20} />,
      color: "#FF0000",
      colorBg: "rgba(255,0,0,0.06)",
      colorBorder: "rgba(255,0,0,0.2)",
      description: "Conectează canalul tău YouTube pentru analiză completă: vizualizări, abonați, venituri, cele mai bune videoclipuri.",
      connectUrl: "/api/auth/youtube/connect",
      what_you_get: [
        "Statistici reale canal (subscribers, views, venituri)",
        "Cele mai performante videoclipuri",
        "Analiză retenție și demografii",
        "Rapoarte lunare automate PDF",
      ],
      how_to: [
        "Click pe 'Connect YouTube'",
        "Loghează-te cu contul Google al canalului",
        "Aprobă accesul la YouTube Analytics",
        "Ești redirecționat automat înapoi",
      ],
      connected: false,
      loading: true,
    },
    {
      id: "instagram",
      name: "Instagram & Facebook",
      icon: <Instagram size={20} />,
      color: "#E1306C",
      colorBg: "rgba(225,48,108,0.06)",
      colorBorder: "rgba(225,48,108,0.2)",
      description: "Conectează contul Instagram Business sau Creator pentru a vedea reach, impressions, engagement și demografii.",
      connectUrl: "/api/auth/instagram",
      what_you_get: [
        "Reach, impressions, engagement rate real",
        "Performanță Stories și Reels",
        "Demografii audiență (vârstă, țară, gen)",
        "Analiză hashtag-uri",
        "Date Facebook Page integrate",
      ],
      how_to: [
        "Click pe 'Connect Instagram'",
        "Loghează-te cu contul Facebook conectat la Instagram",
        "Selectează pagina Facebook și contul Instagram",
        "Aprobă permisiunile cerute",
        "⚠️ Necesită cont Instagram Business sau Creator",
      ],
      connected: false,
      loading: true,
    },
  ]);

  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    checkConnections();
  }, []);

  const checkConnections = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Check YouTube
    const { data: profile } = await supabase
      .from("profiles")
      .select("youtube_access_token, youtube_channel_id, youtube_channel_name")
      .eq("id", user.id)
      .single();

    // Check Instagram
    const { data: igConn } = await supabase
      .from("instagram_connections")
      .select("instagram_username, instagram_name")
      .eq("user_id", user.id)
      .single();

    setConnections(prev => prev.map(c => {
      if (c.id === "youtube") {
        const connected = !!(profile?.youtube_access_token);
        return {
          ...c,
          connected,
          connectedAs: profile?.youtube_channel_name || profile?.youtube_channel_id || undefined,
          loading: false,
        };
      }
      if (c.id === "instagram") {
        const connected = !!(igConn?.instagram_username);
        return {
          ...c,
          connected,
          connectedAs: igConn?.instagram_username ? `@${igConn.instagram_username}` : undefined,
          loading: false,
        };
      }
      return c;
    }));
  };

  const handleConnect = (url: string) => {
    window.location.href = url;
  };

  const handleDisconnect = async (id: string) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (id === "youtube") {
      await supabase.from("profiles").update({
        youtube_access_token: null,
        youtube_refresh_token: null,
        youtube_token_expires_at: null,
      }).eq("id", user.id);
    }
    if (id === "instagram") {
      await supabase.from("instagram_connections").delete().eq("user_id", user.id);
    }

    setConnections(prev => prev.map(c =>
      c.id === id ? { ...c, connected: false, connectedAs: undefined } : c
    ));
  };

  const connectedCount = connections.filter(c => c.connected).length;

  return (
    <div data-tour="account-connections" className="space-y-4">
      {/* Progress header */}
      <div
        className="rounded-2xl p-5 flex items-center gap-5"
        style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.08), rgba(245,158,11,0.03))", border: "1px solid rgba(245,158,11,0.2)" }}
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 text-2xl font-bold"
          style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)", color: "#1C1814" }}
        >
          {connectedCount}/{connections.length}
        </div>
        <div>
          <p className="font-bold text-base" style={{ color: "#292524" }}>
            {connectedCount === 0 && "Conectează conturile pentru date reale"}
            {connectedCount === 1 && "Un cont conectat — conectează și celălalt!"}
            {connectedCount === connections.length && "Toate conturile conectate ✅"}
          </p>
          <p className="text-sm mt-0.5" style={{ color: "#A8967E" }}>
            Fără conectare, platformele afișează date demo sau trending public. Cu contul conectat, datele sunt ale tale.
          </p>
        </div>
      </div>

      {/* Connection cards */}
      {connections.map(conn => (
        <div
          key={conn.id}
          className="rounded-2xl overflow-hidden"
          style={{ border: `1px solid ${conn.connected ? "rgba(34,197,94,0.25)" : conn.colorBorder}` }}
        >
          {/* Card header */}
          <div
            className="flex items-center gap-4 p-5"
            style={{ background: conn.connected ? "rgba(34,197,94,0.04)" : conn.colorBg }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: conn.connected ? "rgba(34,197,94,0.1)" : conn.colorBg, color: conn.connected ? "#22C55E" : conn.color, border: `1px solid ${conn.connected ? "rgba(34,197,94,0.3)" : conn.colorBorder}` }}
            >
              {conn.loading ? <Loader2 size={18} className="animate-spin" /> : conn.icon}
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-bold" style={{ color: "#292524" }}>{conn.name}</p>
                {!conn.loading && (
                  conn.connected
                    ? <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "rgba(34,197,94,0.1)", color: "#16A34A" }}>
                        <CheckCircle2 size={11} /> Conectat
                      </span>
                    : <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "rgba(239,68,68,0.08)", color: "#DC2626" }}>
                        <XCircle size={11} /> Neconectat
                      </span>
                )}
              </div>
              {conn.connected && conn.connectedAs ? (
                <p className="text-xs mt-0.5 font-medium" style={{ color: "#22C55E" }}>{conn.connectedAs}</p>
              ) : (
                <p className="text-xs mt-0.5" style={{ color: "#A8967E" }}>{conn.description}</p>
              )}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {!conn.loading && (
                conn.connected ? (
                  <button
                    type="button"
                    onClick={() => handleDisconnect(conn.id)}
                    className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all hover:opacity-80"
                    style={{ background: "rgba(239,68,68,0.08)", color: "#DC2626", border: "1px solid rgba(239,68,68,0.2)" }}
                  >
                    Deconectează
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleConnect(conn.connectUrl)}
                    className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl font-bold transition-all hover:opacity-90"
                    style={{ background: `linear-gradient(135deg, ${conn.color}, ${conn.color}CC)`, color: "white" }}
                  >
                    <ExternalLink size={13} />
                    Conectează
                  </button>
                )
              )}
              <button
                type="button"
                onClick={() => setExpanded(expanded === conn.id ? null : conn.id)}
                className="p-1.5 rounded-lg transition-all"
                style={{ color: "#A8967E", background: "rgba(0,0,0,0.04)" }}
              >
                {expanded === conn.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>
          </div>

          {/* Expanded guide */}
          {expanded === conn.id && (
            <div className="px-5 pb-5 pt-2 grid grid-cols-2 gap-5" style={{ borderTop: `1px solid ${conn.colorBorder}`, background: "#FAFAF8" }}>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider mb-2.5" style={{ color: "#A8967E" }}>Ce primești după conectare</p>
                <ul className="space-y-1.5">
                  {conn.what_you_get.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "#4B3E35" }}>
                      <Zap size={12} className="mt-0.5 flex-shrink-0" style={{ color: conn.color }} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider mb-2.5" style={{ color: "#A8967E" }}>Pași pentru conectare</p>
                <ol className="space-y-1.5">
                  {conn.how_to.map((step, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm" style={{ color: step.startsWith("⚠️") ? "#D97706" : "#4B3E35" }}>
                      {!step.startsWith("⚠️") && (
                        <span className="flex-shrink-0 w-4 h-4 rounded-full text-xs flex items-center justify-center font-bold mt-0.5"
                          style={{ background: conn.colorBg, color: conn.color, border: `1px solid ${conn.colorBorder}` }}>
                          {i + 1}
                        </span>
                      )}
                      {step}
                    </li>
                  ))}
                </ol>
                {!conn.connected && (
                  <button
                    type="button"
                    onClick={() => handleConnect(conn.connectUrl)}
                    className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90"
                    style={{ background: `linear-gradient(135deg, ${conn.color}, ${conn.color}CC)`, color: "white" }}
                  >
                    <ExternalLink size={14} />
                    Conectează {conn.name} acum
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
