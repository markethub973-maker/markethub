"use client";
import { useState } from "react";
import Header from "@/components/layout/Header";
import { Search, Loader2, Users, Briefcase, MapPin, ExternalLink, UserPlus } from "lucide-react";

const card = { backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", borderRadius: 12 };
const fmt = (n: number) => n >= 1e6 ? (n/1e6).toFixed(1)+"M" : n >= 1e3 ? (n/1e3).toFixed(1)+"K" : String(n || 0);

export default function LinkedInPage() {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [error, setError] = useState("");
  const [savedAsInfluencer, setSavedAsInfluencer] = useState(false);

  const search = async () => {
    const q = username.trim().replace(/^@/, "").replace(/.*linkedin\.com\/in\//, "").replace(/\/$/, "");
    if (!q) return;
    setLoading(true); setError(""); setProfile(null); setSavedAsInfluencer(false);
    const res = await fetch(`/api/linkedin?username=${encodeURIComponent(q)}`);
    const d = await res.json();
    if (d.profile) setProfile(d.profile);
    else if (d.needs_subscription) setError("⚠️ " + (d.error || "API LinkedIn necesită abonament"));
    else setError(d.error || "Profil negăsit");
    setLoading(false);
  };

  const saveAsInfluencer = async () => {
    if (!profile) return;
    await fetch("/api/influencers", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: profile.name,
        niche: "Business",
        location: profile.location,
        notes: `LinkedIn: ${profile.headline}. Companie: ${profile.company}`,
        status: "prospect",
      }),
    });
    setSavedAsInfluencer(true);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FAFAF8" }}>
      <Header title="LinkedIn Analytics" subtitle="Analizează profiluri LinkedIn — followeri, poziție, companie" />
      <div className="p-4 max-w-2xl mx-auto space-y-4">

        {/* Search */}
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 rounded-xl px-3" style={card}>
            <Search className="w-4 h-4 shrink-0" style={{ color: "#C4AA8A" }} />
            <input value={username} onChange={e => setUsername(e.target.value)}
              onKeyDown={e => e.key === "Enter" && search()}
              placeholder="Username LinkedIn (ex: john-doe) sau URL profil"
              className="flex-1 py-2.5 text-sm bg-transparent outline-none" style={{ color: "#292524" }} />
          </div>
          <button type="button" onClick={search} disabled={loading || !username.trim()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40"
            style={{ backgroundColor: "#0A66C2", color: "white" }}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Caută
          </button>
        </div>

        {error && <p className="text-sm text-center" style={{ color: "#EF4444" }}>{error}</p>}

        {profile && (
          <div className="rounded-2xl p-5 space-y-4" style={card}>
            {/* Header */}
            <div className="flex items-start gap-4">
              {profile.avatar ? (
                <img src={profile.avatar} alt="" className="w-16 h-16 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold shrink-0"
                  style={{ backgroundColor: "rgba(10,102,194,0.1)", color: "#0A66C2" }}>
                  {profile.name?.[0] ?? "?"}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-lg" style={{ color: "#292524" }}>{profile.name}</h2>
                {profile.headline && <p className="text-sm mt-0.5" style={{ color: "#78614E" }}>{profile.headline}</p>}
                <div className="flex flex-wrap gap-3 mt-2">
                  {profile.company && (
                    <span className="flex items-center gap-1 text-xs" style={{ color: "#A8967E" }}>
                      <Briefcase className="w-3 h-3" /> {profile.company} {profile.position && `· ${profile.position}`}
                    </span>
                  )}
                  {profile.location && (
                    <span className="flex items-center gap-1 text-xs" style={{ color: "#A8967E" }}>
                      <MapPin className="w-3 h-3" /> {profile.location}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl p-3 text-center" style={{ backgroundColor: "rgba(10,102,194,0.06)" }}>
                <p className="text-xl font-bold" style={{ color: "#0A66C2" }}>{fmt(profile.followers)}</p>
                <p className="text-xs" style={{ color: "#A8967E" }}>Followers</p>
              </div>
              <div className="rounded-xl p-3 text-center" style={{ backgroundColor: "rgba(10,102,194,0.06)" }}>
                <p className="text-xl font-bold" style={{ color: "#0A66C2" }}>{fmt(profile.connections)}</p>
                <p className="text-xs" style={{ color: "#A8967E" }}>Connections</p>
              </div>
            </div>

            {profile.summary && (
              <div className="rounded-xl p-3" style={{ backgroundColor: "rgba(245,215,160,0.1)" }}>
                <p className="text-xs font-medium mb-1" style={{ color: "#A8967E" }}>About</p>
                <p className="text-sm line-clamp-4" style={{ color: "#78614E" }}>{profile.summary}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <a href={profile.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold flex-1 justify-center"
                style={{ backgroundColor: "#0A66C2", color: "white" }}>
                <ExternalLink className="w-4 h-4" /> Deschide LinkedIn
              </a>
              <button type="button" onClick={saveAsInfluencer} disabled={savedAsInfluencer}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-60"
                style={{ backgroundColor: savedAsInfluencer ? "rgba(16,185,129,0.1)" : "rgba(99,102,241,0.1)", color: savedAsInfluencer ? "#10B981" : "#6366F1" }}>
                <UserPlus className="w-4 h-4" />
                {savedAsInfluencer ? "Salvat!" : "Adaugă în Influencers"}
              </button>
            </div>
          </div>
        )}

        {/* Info box */}
        {!profile && !loading && !error && (
          <div className="rounded-2xl p-6 text-center" style={{ ...card, border: "1px solid rgba(10,102,194,0.15)" }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
              style={{ backgroundColor: "rgba(10,102,194,0.1)" }}>
              <Users className="w-6 h-6" style={{ color: "#0A66C2" }} />
            </div>
            <p className="text-sm font-medium mb-1" style={{ color: "#292524" }}>Analizează orice profil LinkedIn</p>
            <p className="text-xs" style={{ color: "#A8967E" }}>Introduci username-ul sau URL-ul complet.<br />Exemplu: <code style={{ color: "#0A66C2" }}>john-doe</code> sau <code style={{ color: "#0A66C2" }}>linkedin.com/in/john-doe</code></p>
          </div>
        )}
      </div>
    </div>
  );
}
