"use client";

import { useState, useEffect } from "react";
import Header from "@/components/layout/Header";
import { User, Lock, Bell, Globe, Shield, Save, Check, Instagram } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function SettingsPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saved, setSaved] = useState(false);
  const [notifications, setNotifications] = useState({ email: true, trending: true, weekly: false });
  const [region, setRegion] = useState("US");
  const [isAdmin, setIsAdmin] = useState(false);
  const [plan, setPlan] = useState("free");
  const [igUsername, setIgUsername] = useState<string | null>(null);
  const [igStatus, setIgStatus] = useState<string | null>(null);
  const [ytChannelId, setYtChannelId] = useState("");
  const [ytSaved, setYtSaved] = useState(false);
  const [ytConnected, setYtConnected] = useState(false);
  const [ytEditing, setYtEditing] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setEmail(user.email || "");
      setName(user.user_metadata?.name || "");

      const { data: profile } = await supabase
        .from("profiles")
        .select("plan, is_admin")
        .eq("id", user.id)
        .single();
      if (profile) {
        setIsAdmin(profile.is_admin);
        setPlan(profile.plan);
      }

      const { data: igProfile } = await supabase
        .from("profiles")
        .select("instagram_username, instagram_user_id")
        .eq("id", user.id)
        .single();
      if (igProfile?.instagram_username) setIgUsername(igProfile.instagram_username);
      else if (igProfile?.instagram_user_id) setIgUsername("hub9.73");
      if ((igProfile as any)?.youtube_channel_id) {
        setYtChannelId((igProfile as any).youtube_channel_id);
        setYtConnected(true);
      }

      const params = new URLSearchParams(window.location.search);
      const ig = params.get("instagram");
      if (ig) setIgStatus(ig);
    });

    const n = localStorage.getItem("mh_notif");
    if (n) setNotifications(JSON.parse(n));
    const r = localStorage.getItem("mh_region");
    if (r) setRegion(r);
  }, []);

  const handleSave = () => {
    localStorage.setItem("mh_notif", JSON.stringify(notifications));
    localStorage.setItem("mh_region", region);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const cardStyle = { backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" };
  const inputStyle = { border: "1px solid rgba(245,215,160,0.35)", backgroundColor: "#FFF8F0", color: "#292524" };
  const labelStyle = { color: "#78614E" };

  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1) + " Plan";

  return (
    <div>
      <Header title="Settings" subtitle="Gestioneaza contul si preferintele" />

      <div className="p-6 space-y-5 max-w-2xl">

        {/* Profile */}
        <div className="rounded-2xl p-6" style={cardStyle}>
          <div className="flex items-center gap-2 mb-5">
            <User className="w-4 h-4" style={{ color: "#F59E0B" }} />
            <h3 className="font-semibold" style={{ color: "#292524" }}>Profil</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={labelStyle}>Nume</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-4 py-2.5 text-sm rounded-lg focus:outline-none"
                style={inputStyle}
                onFocus={e => (e.currentTarget.style.border = "1px solid #F59E0B")}
                onBlur={e => (e.currentTarget.style.border = "1px solid rgba(245,215,160,0.35)")}
              />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={labelStyle}>Email</label>
              <input
                type="email"
                value={email}
                readOnly
                className="w-full px-4 py-2.5 text-sm rounded-lg focus:outline-none"
                style={{ ...inputStyle, opacity: 0.7 }}
              />
            </div>
          </div>
        </div>

        {/* Password */}
        <div className="rounded-2xl p-6" style={cardStyle}>
          <div className="flex items-center gap-2 mb-5">
            <Lock className="w-4 h-4" style={{ color: "#F59E0B" }} />
            <h3 className="font-semibold" style={{ color: "#292524" }}>Parola</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={labelStyle}>Parola noua</label>
              <input type="password" placeholder="••••••••" title="Parola noua" aria-label="Parola noua" className="w-full px-4 py-2.5 text-sm rounded-lg focus:outline-none" style={inputStyle}
                onFocus={e => (e.currentTarget.style.border = "1px solid #F59E0B")}
                onBlur={e => (e.currentTarget.style.border = "1px solid rgba(245,215,160,0.35)")} />
            </div>
          </div>
          <p className="text-xs mt-3" style={{ color: "#C4AA8A" }}>
            Schimbarea parolei se face prin emailul de resetare trimis de Supabase.
          </p>
        </div>

        {/* Notifications */}
        <div className="rounded-2xl p-6" style={cardStyle}>
          <div className="flex items-center gap-2 mb-5">
            <Bell className="w-4 h-4" style={{ color: "#F59E0B" }} />
            <h3 className="font-semibold" style={{ color: "#292524" }}>Notificari</h3>
          </div>
          <div className="space-y-3">
            {[
              { key: "email", label: "Alerte pe email", desc: "Primeste notificari cand keyword-urile tale trendeaza" },
              { key: "trending", label: "Trending in timp real", desc: "Notificari pentru topicuri care cresc rapid" },
              { key: "weekly", label: "Raport saptamanal", desc: "Rezumat al performantei canalelor urmarite" },
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between py-2" style={{ borderBottom: "1px solid rgba(245,215,160,0.15)" }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: "#292524" }}>{item.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: "#A8967E" }}>{item.desc}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setNotifications(prev => ({ ...prev, [item.key]: !prev[item.key as keyof typeof prev] }))}
                  className="w-11 h-6 rounded-full transition-colors flex-shrink-0"
                  style={{ backgroundColor: notifications[item.key as keyof typeof notifications] ? "#F59E0B" : "rgba(245,215,160,0.25)" }}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow transition-transform mx-0.5" style={{ transform: notifications[item.key as keyof typeof notifications] ? "translateX(20px)" : "translateX(0)" }} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Region */}
        <div className="rounded-2xl p-6" style={cardStyle}>
          <div className="flex items-center gap-2 mb-5">
            <Globe className="w-4 h-4" style={{ color: "#F59E0B" }} />
            <h3 className="font-semibold" style={{ color: "#292524" }}>Regiune implicita</h3>
          </div>
          <select
            value={region}
            onChange={e => setRegion(e.target.value)}
            title="Selecteaza regiune"
            aria-label="Selecteaza regiune"
            className="w-full px-4 py-2.5 text-sm rounded-lg focus:outline-none"
            style={inputStyle}
          >
            <option value="US">🌍 Global (US)</option>
            <option value="RO">🇷🇴 Romania</option>
            <option value="GB">🇬🇧 UK</option>
            <option value="DE">🇩🇪 Germany</option>
            <option value="FR">🇫🷷 France</option>
          </select>
        </div>

        {/* YouTube Channel */}
        <div className="rounded-2xl p-6" style={cardStyle}>
          <div className="flex items-center gap-2 mb-5">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#FF0000"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
            <h3 className="font-semibold" style={{ color: "#292524" }}>Canal YouTube</h3>
          </div>

          {ytConnected && !ytEditing ? (
            /* Connected state — same pattern as Instagram */
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: "#292524" }}>{ytChannelId}</p>
                <p className="text-xs mt-0.5" style={{ color: "#16a34a" }}>Canal conectat</p>
              </div>
              <button
                type="button"
                onClick={() => setYtEditing(true)}
                className="px-4 py-2 rounded-lg text-sm font-semibold"
                style={{ border: "1px solid rgba(245,215,160,0.35)", color: "#78614E" }}
              >
                Modifica
              </button>
            </div>
          ) : (
            /* Edit / connect state */
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold block mb-1.5" style={labelStyle}>Channel ID</label>
                <input
                  type="text"
                  value={ytChannelId}
                  onChange={e => setYtChannelId(e.target.value)}
                  placeholder="UCxxxxxxxxxxxxxxxxxx"
                  className="w-full px-4 py-2.5 text-sm rounded-lg focus:outline-none"
                  style={inputStyle}
                  onFocus={e => (e.currentTarget.style.border = "1px solid #F59E0B")}
                  onBlur={e => (e.currentTarget.style.border = "1px solid rgba(245,215,160,0.35)")}
                />
                <p className="text-xs mt-1.5" style={{ color: "#C4AA8A" }}>
                  Gaseste-l pe YouTube → canalul tau → Settings → Advanced settings
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    if (!ytChannelId.trim()) return;
                    const supabase = (await import("@/lib/supabase/client")).createClient();
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) return;
                    await supabase.from("profiles").update({ youtube_channel_id: ytChannelId } as any).eq("id", user.id);
                    setYtSaved(true);
                    setYtConnected(true);
                    setYtEditing(false);
                    setTimeout(() => setYtSaved(false), 2500);
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"
                  style={{ backgroundColor: ytSaved ? "#16a34a" : "#F59E0B", color: ytSaved ? "white" : "#1C1814" }}
                >
                  {ytSaved ? <><Check className="w-4 h-4" /> Salvat!</> : "Salveaza canal"}
                </button>
                {ytEditing && (
                  <button
                    type="button"
                    onClick={() => { setYtEditing(false); }}
                    className="px-4 py-2 rounded-lg text-sm font-semibold"
                    style={{ border: "1px solid rgba(245,215,160,0.35)", color: "#78614E" }}
                  >
                    Anuleaza
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Instagram Connect */}
        <div className="rounded-2xl p-6" style={cardStyle}>
          <div className="flex items-center gap-2 mb-5">
            <Instagram className="w-4 h-4" style={{ color: "#E1306C" }} />
            <h3 className="font-semibold" style={{ color: "#292524" }}>Cont Instagram</h3>
          </div>
          {igUsername ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: "#292524" }}>@{igUsername}</p>
                <p className="text-xs mt-0.5" style={{ color: "#16a34a" }}>Cont conectat</p>
              </div>
              <a
                href="/api/auth/instagram"
                className="px-4 py-2 rounded-lg text-sm font-semibold"
                style={{ border: "1px solid rgba(245,215,160,0.35)", color: "#78614E" }}
              >
                Reconecteaza
              </a>
            </div>
          ) : (
            <div>
              {igStatus === "error" && <p className="text-xs mb-3" style={{ color: "#dc2626" }}>Eroare la conectare. Incearca din nou.</p>}
              {igStatus === "no_page" && <p className="text-xs mb-3" style={{ color: "#dc2626" }}>Nu ai o Pagina Facebook conectata la contul Instagram.</p>}
              {igStatus === "no_ig_account" && <p className="text-xs mb-3" style={{ color: "#dc2626" }}>Nu ai un cont Instagram Business conectat la o Pagina Facebook.</p>}
              <p className="text-xs mb-4" style={{ color: "#A8967E" }}>
                Conecteaza contul tau Instagram Business pentru a vedea analytics detaliate.
              </p>
              <a
                href="/api/auth/instagram"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold"
                style={{ backgroundColor: "#E1306C", color: "white" }}
              >
                <Instagram className="w-4 h-4" />
                Conecteaza Instagram
              </a>
            </div>
          )}
        </div>

        {/* Plan — ascuns pentru admin */}
        {!isAdmin && (
          <div className="rounded-2xl p-6" style={{ ...cardStyle, background: "linear-gradient(135deg, rgba(245,158,11,0.06), rgba(217,119,6,0.06))" }}>
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4" style={{ color: "#F59E0B" }} />
              <h3 className="font-semibold" style={{ color: "#292524" }}>Plan curent</h3>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-lg" style={{ color: "#292524" }}>{planLabel}</p>
                <p className="text-sm mt-0.5" style={{ color: "#A8967E" }}>3/10 canale urmarite · 30 zile istoric</p>
              </div>
              <a href="/upgrade" className="px-4 py-2 rounded-lg text-sm font-bold" style={{ backgroundColor: "#F59E0B", color: "#1C1814" }}>
                Upgrade →
              </a>
            </div>
          </div>
        )}

        {/* Save */}
        <button
          type="button"
          onClick={handleSave}
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all"
          style={{ backgroundColor: saved ? "#16a34a" : "#F59E0B", color: saved ? "white" : "#1C1814" }}
        >
          {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? "Salvat cu succes!" : "Salveaza modificarile"}
        </button>
      </div>
    </div>
  );
}
